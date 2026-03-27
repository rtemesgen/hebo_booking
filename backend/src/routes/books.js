import express from 'express'
import { z } from 'zod'
import { pool, withTransaction } from '../db/pool.js'
import { requireAuth } from '../middleware/auth.js'
import { requireTenantMembership } from '../middleware/tenant.js'
import { createId } from '../utils/ids.js'
import { sendServerError } from '../utils/http.js'

const router = express.Router()
router.use(requireAuth)
router.use(requireTenantMembership)

const createSchema = z.object({
  businessId: z.string().min(3),
  name: z.string().min(1),
  currency: z.string().min(1).optional(),
})

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  currency: z.string().min(1).optional(),
})

const transferSchema = z.object({
  targetBusinessId: z.string().min(3),
})

async function ensureBusinessInTenant(tenantId, businessId) {
  const result = await pool.query(
    'SELECT id FROM businesses WHERE id = $1 AND tenant_id = $2',
    [businessId, tenantId],
  )
  return result.rowCount > 0
}

router.get('/', async (req, res) => {
  const { tenantId } = req.auth
  const { businessId = '' } = req.query
  try {
    const params = [tenantId]
    let where = 'WHERE tenant_id = $1'
    if (businessId) {
      params.push(String(businessId))
      where += ' AND business_id = $2'
    }
    const result = await pool.query(
      `SELECT id, tenant_id, business_id, name, currency, created_at, updated_at
       FROM books
       ${where}
       ORDER BY updated_at DESC`,
      params,
    )
    return res.json({ books: result.rows })
  } catch (error) {
    return sendServerError(res, error, 'Could not fetch books')
  }
})

router.post('/', async (req, res) => {
  const { tenantId } = req.auth
  const parsed = createSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid book payload' })
  }

  try {
    const business = await pool.query(
      'SELECT id FROM businesses WHERE id = $1 AND tenant_id = $2',
      [parsed.data.businessId, tenantId],
    )
    if (!business.rowCount) {
      return res.status(403).json({ message: 'Business not in tenant' })
    }

    const id = createId('book')
    const result = await pool.query(
      `INSERT INTO books (id, tenant_id, business_id, name, currency, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, now(), now())
       RETURNING id, tenant_id, business_id, name, currency, created_at, updated_at`,
      [id, tenantId, parsed.data.businessId, parsed.data.name.trim(), parsed.data.currency || 'UGX'],
    )
    return res.status(201).json({ book: result.rows[0] })
  } catch (error) {
    return sendServerError(res, error, 'Could not create book')
  }
})

router.patch('/:id', async (req, res) => {
  const { tenantId } = req.auth
  const parsed = updateSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid book update payload' })
  }

  const nextName = parsed.data.name?.trim()
  const nextCurrency = parsed.data.currency?.trim()
  if (!nextName && !nextCurrency) {
    return res.status(400).json({ message: 'Nothing to update' })
  }

  try {
    const current = await pool.query(
      'SELECT id, name, currency FROM books WHERE id = $1 AND tenant_id = $2',
      [req.params.id, tenantId],
    )
    if (!current.rowCount) {
      return res.status(404).json({ message: 'Book not found' })
    }

    const result = await pool.query(
      `UPDATE books
       SET name = $1,
           currency = $2,
           updated_at = now()
       WHERE id = $3 AND tenant_id = $4
       RETURNING id, tenant_id, business_id, name, currency, created_at, updated_at`,
      [
        nextName || current.rows[0].name,
        nextCurrency || current.rows[0].currency,
        req.params.id,
        tenantId,
      ],
    )
    return res.json({ book: result.rows[0] })
  } catch (error) {
    return sendServerError(res, error, 'Could not update book')
  }
})

router.delete('/:id', async (req, res) => {
  const { tenantId } = req.auth
  try {
    await pool.query(
      'DELETE FROM books WHERE id = $1 AND tenant_id = $2',
      [req.params.id, tenantId],
    )
    return res.status(204).send()
  } catch (error) {
    return sendServerError(res, error, 'Could not delete book')
  }
})

router.post('/:id/move', async (req, res) => {
  const { tenantId } = req.auth
  const parsed = transferSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid move payload' })
  }

  try {
    const ok = await ensureBusinessInTenant(tenantId, parsed.data.targetBusinessId)
    if (!ok) {
      return res.status(403).json({ message: 'Target business not in tenant' })
    }

    const bookResult = await pool.query(
      `UPDATE books
       SET business_id = $1, updated_at = now()
       WHERE id = $2 AND tenant_id = $3
       RETURNING id`,
      [parsed.data.targetBusinessId, req.params.id, tenantId],
    )
    if (!bookResult.rowCount) {
      return res.status(404).json({ message: 'Book not found' })
    }

    await pool.query(
      `UPDATE records
       SET business_id = $1, updated_at = now()
       WHERE book_id = $2 AND tenant_id = $3`,
      [parsed.data.targetBusinessId, req.params.id, tenantId],
    )

    return res.json({ moved: true })
  } catch (error) {
    return sendServerError(res, error, 'Could not move book')
  }
})

router.post('/:id/copy', async (req, res) => {
  const { tenantId } = req.auth
  const parsed = transferSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid copy payload' })
  }

  try {
    const ok = await ensureBusinessInTenant(tenantId, parsed.data.targetBusinessId)
    if (!ok) {
      return res.status(403).json({ message: 'Target business not in tenant' })
    }

    const sourceResult = await pool.query(
      `SELECT id, name, currency
       FROM books
       WHERE id = $1 AND tenant_id = $2`,
      [req.params.id, tenantId],
    )
    if (!sourceResult.rowCount) {
      return res.status(404).json({ message: 'Book not found' })
    }
    const source = sourceResult.rows[0]
    const newBookId = createId('book')
    const copiedName = `${source.name} Copy`

    await withTransaction(async (client) => {
      await client.query(
        `INSERT INTO books (id, tenant_id, business_id, name, currency, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, now(), now())`,
        [newBookId, tenantId, parsed.data.targetBusinessId, copiedName, source.currency || 'UGX'],
      )

      const recordsResult = await client.query(
        `SELECT type, amount, note, contact, category, payment_mode, date, time, attachments
         FROM records
         WHERE book_id = $1 AND tenant_id = $2`,
        [req.params.id, tenantId],
      )

      for (const row of recordsResult.rows) {
        await client.query(
          `INSERT INTO records (
            id, tenant_id, business_id, book_id, type, amount, note, contact, category,
            payment_mode, date, time, attachments, created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9,
            $10, $11, $12, $13::jsonb, now(), now()
          )`,
          [
            createId('record'),
            tenantId,
            parsed.data.targetBusinessId,
            newBookId,
            row.type,
            row.amount,
            row.note || '',
            row.contact || '',
            row.category || '',
            row.payment_mode || 'Cash',
            row.date,
            row.time,
            JSON.stringify(Array.isArray(row.attachments) ? row.attachments : []),
          ],
        )
      }
    })

    return res.status(201).json({ copiedBookId: newBookId })
  } catch (error) {
    return sendServerError(res, error, 'Could not copy book')
  }
})

router.post('/:id/duplicate', async (req, res) => {
  const { tenantId } = req.auth
  try {
    const sourceResult = await pool.query(
      `SELECT id, business_id, name, currency
       FROM books
       WHERE id = $1 AND tenant_id = $2`,
      [req.params.id, tenantId],
    )
    if (!sourceResult.rowCount) {
      return res.status(404).json({ message: 'Book not found' })
    }

    const source = sourceResult.rows[0]
    const newBookId = createId('book')
    const copiedName = `${source.name} Copy`

    await withTransaction(async (client) => {
      await client.query(
        `INSERT INTO books (id, tenant_id, business_id, name, currency, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, now(), now())`,
        [newBookId, tenantId, source.business_id, copiedName, source.currency || 'UGX'],
      )

      const recordsResult = await client.query(
        `SELECT type, amount, note, contact, category, payment_mode, date, time, attachments
         FROM records
         WHERE book_id = $1 AND tenant_id = $2`,
        [source.id, tenantId],
      )

      for (const row of recordsResult.rows) {
        await client.query(
          `INSERT INTO records (
            id, tenant_id, business_id, book_id, type, amount, note, contact, category,
            payment_mode, date, time, attachments, created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9,
            $10, $11, $12, $13::jsonb, now(), now()
          )`,
          [
            createId('record'),
            tenantId,
            source.business_id,
            newBookId,
            row.type,
            row.amount,
            row.note || '',
            row.contact || '',
            row.category || '',
            row.payment_mode || 'Cash',
            row.date,
            row.time,
            JSON.stringify(Array.isArray(row.attachments) ? row.attachments : []),
          ],
        )
      }
    })

    return res.status(201).json({ duplicatedBookId: newBookId })
  } catch (error) {
    return sendServerError(res, error, 'Could not duplicate book')
  }
})

export default router
