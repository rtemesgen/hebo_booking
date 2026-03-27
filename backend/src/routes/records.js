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
  bookId: z.string().min(3),
  type: z.enum(['income', 'expense']),
  amount: z.number().positive(),
  note: z.string().optional(),
  contact: z.string().optional(),
  category: z.string().optional(),
  paymentMode: z.string().optional(),
  date: z.string().min(8),
  time: z.string().min(4),
  attachments: z.array(z.any()).optional(),
})

const updateSchema = z.object({
  type: z.enum(['income', 'expense']).optional(),
  amount: z.number().positive().optional(),
  note: z.string().optional(),
  contact: z.string().optional(),
  category: z.string().optional(),
  paymentMode: z.string().optional(),
  date: z.string().optional(),
  time: z.string().optional(),
  attachments: z.array(z.any()).optional(),
})

const moveSchema = z.object({
  recordIds: z.array(z.string().min(3)).min(1),
  targetBookId: z.string().min(3),
})

const copySchema = z.object({
  recordIds: z.array(z.string().min(3)).min(1),
  targetBookIds: z.array(z.string().min(3)).min(1),
})

router.get('/', async (req, res) => {
  const { tenantId } = req.auth
  const { bookId = '' } = req.query
  try {
    const params = [tenantId]
    let where = 'WHERE tenant_id = $1'
    if (bookId) {
      params.push(String(bookId))
      where += ' AND book_id = $2'
    }
    const result = await pool.query(
      `SELECT id, tenant_id, business_id, book_id, type, amount, note, contact, category,
              payment_mode, date, time, attachments, created_at, updated_at
       FROM records
       ${where}
       ORDER BY created_at DESC`,
      params,
    )
    return res.json({ records: result.rows })
  } catch (error) {
    return sendServerError(res, error, 'Could not fetch records')
  }
})

router.post('/', async (req, res) => {
  const { tenantId } = req.auth
  const parsed = createSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid record payload' })
  }

  try {
    const bookResult = await pool.query(
      'SELECT id, business_id FROM books WHERE id = $1 AND tenant_id = $2',
      [parsed.data.bookId, tenantId],
    )
    if (!bookResult.rowCount) {
      return res.status(403).json({ message: 'Book not in tenant' })
    }
    const book = bookResult.rows[0]
    const id = createId('record')
    const result = await pool.query(
      `INSERT INTO records (
        id, tenant_id, business_id, book_id, type, amount, note, contact, category,
        payment_mode, date, time, attachments, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9,
        $10, $11, $12, $13::jsonb, now(), now()
      )
      RETURNING id, tenant_id, business_id, book_id, type, amount, note, contact, category,
                payment_mode, date, time, attachments, created_at, updated_at`,
      [
        id,
        tenantId,
        book.business_id,
        parsed.data.bookId,
        parsed.data.type,
        parsed.data.amount,
        parsed.data.note || '',
        parsed.data.contact || '',
        parsed.data.category || '',
        parsed.data.paymentMode || 'Cash',
        parsed.data.date,
        parsed.data.time,
        JSON.stringify(parsed.data.attachments || []),
      ],
    )
    return res.status(201).json({ record: result.rows[0] })
  } catch (error) {
    return sendServerError(res, error, 'Could not create record')
  }
})

router.patch('/:id', async (req, res) => {
  const { tenantId } = req.auth
  const parsed = updateSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid record update payload' })
  }

  try {
    const currentResult = await pool.query(
      `SELECT id, type, amount, note, contact, category, payment_mode, date, time, attachments
       FROM records
       WHERE id = $1 AND tenant_id = $2`,
      [req.params.id, tenantId],
    )
    if (!currentResult.rowCount) {
      return res.status(404).json({ message: 'Record not found' })
    }
    const current = currentResult.rows[0]

    const result = await pool.query(
      `UPDATE records
       SET type = $1,
           amount = $2,
           note = $3,
           contact = $4,
           category = $5,
           payment_mode = $6,
           date = $7,
           time = $8,
           attachments = $9::jsonb,
           updated_at = now()
       WHERE id = $10 AND tenant_id = $11
       RETURNING id, tenant_id, business_id, book_id, type, amount, note, contact, category,
                 payment_mode, date, time, attachments, created_at, updated_at`,
      [
        parsed.data.type || current.type,
        parsed.data.amount ?? current.amount,
        parsed.data.note ?? current.note,
        parsed.data.contact ?? current.contact,
        parsed.data.category ?? current.category,
        parsed.data.paymentMode ?? current.payment_mode,
        parsed.data.date ?? current.date,
        parsed.data.time ?? current.time,
        JSON.stringify(parsed.data.attachments ?? current.attachments ?? []),
        req.params.id,
        tenantId,
      ],
    )
    return res.json({ record: result.rows[0] })
  } catch (error) {
    return sendServerError(res, error, 'Could not update record')
  }
})

router.delete('/:id', async (req, res) => {
  const { tenantId } = req.auth
  try {
    await pool.query('DELETE FROM records WHERE id = $1 AND tenant_id = $2', [req.params.id, tenantId])
    return res.status(204).send()
  } catch (error) {
    return sendServerError(res, error, 'Could not delete record')
  }
})

router.post('/bulk-delete', async (req, res) => {
  const { tenantId } = req.auth
  const ids = Array.isArray(req.body?.ids) ? req.body.ids.filter(Boolean) : []
  if (!ids.length) {
    return res.status(400).json({ message: 'No record ids provided' })
  }
  try {
    const result = await pool.query(
      'DELETE FROM records WHERE tenant_id = $1 AND id = ANY($2::text[])',
      [tenantId, ids],
    )
    return res.json({ deletedCount: result.rowCount })
  } catch (error) {
    return sendServerError(res, error, 'Could not delete records')
  }
})

router.post('/move', async (req, res) => {
  const { tenantId } = req.auth
  const parsed = moveSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid move payload' })
  }

  try {
    const targetBookResult = await pool.query(
      'SELECT id, business_id FROM books WHERE id = $1 AND tenant_id = $2',
      [parsed.data.targetBookId, tenantId],
    )
    if (!targetBookResult.rowCount) {
      return res.status(403).json({ message: 'Target book not in tenant' })
    }
    const targetBook = targetBookResult.rows[0]

    const sourceRecords = await pool.query(
      `SELECT id, business_id
       FROM records
       WHERE tenant_id = $1 AND id = ANY($2::text[])`,
      [tenantId, parsed.data.recordIds],
    )
    if (!sourceRecords.rowCount) {
      return res.status(404).json({ message: 'Records not found' })
    }

    const sameBusiness = sourceRecords.rows.every(
      (row) => row.business_id === targetBook.business_id,
    )
    if (!sameBusiness) {
      return res.status(400).json({ message: 'Records must move within same business' })
    }

    const updated = await pool.query(
      `UPDATE records
       SET book_id = $1, business_id = $2, updated_at = now()
       WHERE tenant_id = $3 AND id = ANY($4::text[])`,
      [parsed.data.targetBookId, targetBook.business_id, tenantId, parsed.data.recordIds],
    )
    return res.json({ movedCount: updated.rowCount })
  } catch (error) {
    return sendServerError(res, error, 'Could not move records')
  }
})

router.post('/copy', async (req, res) => {
  const { tenantId } = req.auth
  const parsed = copySchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid copy payload' })
  }

  try {
    const sourceRecords = await pool.query(
      `SELECT id, business_id, type, amount, note, contact, category, payment_mode, date, time, attachments
       FROM records
       WHERE tenant_id = $1 AND id = ANY($2::text[])`,
      [tenantId, parsed.data.recordIds],
    )
    if (!sourceRecords.rowCount) {
      return res.status(404).json({ message: 'Records not found' })
    }

    const targetBooks = await pool.query(
      `SELECT id, business_id
       FROM books
       WHERE tenant_id = $1 AND id = ANY($2::text[])`,
      [tenantId, parsed.data.targetBookIds],
    )
    if (!targetBooks.rowCount) {
      return res.status(404).json({ message: 'Target books not found' })
    }

    const createdCount = await withTransaction(async (client) => {
      let count = 0
      for (const target of targetBooks.rows) {
        const allowed = sourceRecords.rows.every((row) => row.business_id === target.business_id)
        if (!allowed) {
          continue
        }

        for (const row of sourceRecords.rows) {
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
              target.business_id,
              target.id,
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
          count += 1
        }
      }

      return count
    })

    return res.json({ createdCount })
  } catch (error) {
    return sendServerError(res, error, 'Could not copy records')
  }
})

export default router
