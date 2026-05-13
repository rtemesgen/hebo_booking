import express from 'express'
import { z } from 'zod'
import { requireAuth } from '../middleware/auth.js'
import { requireTenantMembership } from '../middleware/tenant.js'
import { sendServerError } from '../utils/http.js'
import { pool } from '../db/pool.js'
import * as bookService from '../services/bookService.js'

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
    const books = await bookService.getAllBooks(tenantId, businessId)
    return res.json({ books })
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
    const ok = await ensureBusinessInTenant(tenantId, parsed.data.businessId)
    if (!ok) {
      return res.status(403).json({ message: 'Business not in tenant' })
    }

    const book = await bookService.createBook(
      tenantId,
      parsed.data.businessId,
      parsed.data.name,
      parsed.data.currency,
    )
    return res.status(201).json({ book })
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

  if (!parsed.data.name && !parsed.data.currency) {
    return res.status(400).json({ message: 'Nothing to update' })
  }

  try {
    const book = await bookService.updateBook(tenantId, req.params.id, parsed.data)
    if (!book) {
      return res.status(404).json({ message: 'Book not found' })
    }
    return res.json({ book })
  } catch (error) {
    return sendServerError(res, error, 'Could not update book')
  }
})

router.delete('/:id', async (req, res) => {
  const { tenantId } = req.auth
  try {
    const deleted = await bookService.deleteBook(tenantId, req.params.id)
    if (!deleted) {
      return res.status(404).json({ message: 'Book not found' })
    }
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

    const moved = await bookService.moveBook(tenantId, req.params.id, parsed.data.targetBusinessId)
    if (!moved) {
      return res.status(404).json({ message: 'Book not found' })
    }

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

    const copiedBookId = await bookService.copyBook(tenantId, req.params.id, parsed.data.targetBusinessId)
    if (!copiedBookId) {
      return res.status(404).json({ message: 'Book not found' })
    }

    return res.status(201).json({ copiedBookId })
  } catch (error) {
    return sendServerError(res, error, 'Could not copy book')
  }
})

router.post('/:id/duplicate', async (req, res) => {
  const { tenantId } = req.auth
  try {
    const source = await bookService.getBookById(tenantId, req.params.id)
    if (!source) {
      return res.status(404).json({ message: 'Book not found' })
    }

    const duplicatedBookId = await bookService.copyBook(tenantId, req.params.id, source.business_id)
    return res.status(201).json({ duplicatedBookId })
  } catch (error) {
    return sendServerError(res, error, 'Could not duplicate book')
  }
})

export default router
