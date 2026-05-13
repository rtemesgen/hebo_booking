import express from 'express'
import { z } from 'zod'
import { requireAuth } from '../middleware/auth.js'
import { requireTenantMembership } from '../middleware/tenant.js'
import { sendServerError } from '../utils/http.js'
import { pool } from '../db/pool.js'
import * as recordService from '../services/recordService.js'

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
    const records = await recordService.getAllRecords(tenantId, bookId)
    return res.json({ records })
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
    const record = await recordService.createRecord(tenantId, book.business_id, parsed.data.bookId, parsed.data)
    return res.status(201).json({ record })
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
    const record = await recordService.updateRecord(tenantId, req.params.id, parsed.data)
    if (!record) {
      return res.status(404).json({ message: 'Record not found' })
    }
    return res.json({ record })
  } catch (error) {
    return sendServerError(res, error, 'Could not update record')
  }
})

router.delete('/:id', async (req, res) => {
  const { tenantId } = req.auth
  try {
    const deleted = await recordService.deleteRecord(tenantId, req.params.id)
    if (!deleted) {
      return res.status(404).json({ message: 'Record not found' })
    }
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
    const deletedCount = await recordService.deleteRecordsBulk(tenantId, ids)
    return res.json({ deletedCount })
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

    const movedCount = await recordService.moveRecords(
      tenantId,
      parsed.data.recordIds,
      parsed.data.targetBookId,
      targetBook.business_id,
    )
    return res.json({ movedCount })
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
    const targetBooks = await pool.query(
      `SELECT id, business_id
       FROM books
       WHERE tenant_id = $1 AND id = ANY($2::text[])`,
      [tenantId, parsed.data.targetBookIds],
    )
    if (!targetBooks.rowCount) {
      return res.status(404).json({ message: 'Target books not found' })
    }

    const createdCount = await recordService.copyRecords(
      tenantId,
      parsed.data.recordIds,
      targetBooks.rows,
    )
    return res.json({ createdCount })
  } catch (error) {
    return sendServerError(res, error, 'Could not copy records')
  }
})

export default router
