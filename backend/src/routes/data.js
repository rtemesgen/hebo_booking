import express from 'express'
import { pool } from '../db/pool.js'
import { requireAuth } from '../middleware/auth.js'
import { requireTenantMembership } from '../middleware/tenant.js'

const router = express.Router()
router.use(requireAuth)
router.use(requireTenantMembership)

router.get('/snapshot', async (req, res) => {
  const { tenantId } = req.auth
  try {
    const [booksResult, recordsResult] = await Promise.all([
      pool.query(
        `SELECT id, tenant_id, business_id, name, currency, created_at, updated_at
         FROM books
         WHERE tenant_id = $1
         ORDER BY updated_at DESC`,
        [tenantId],
      ),
      pool.query(
        `SELECT id, tenant_id, business_id, book_id, type, amount, note, contact, category,
                payment_mode, date, time, attachments, created_at, updated_at
         FROM records
         WHERE tenant_id = $1
         ORDER BY created_at DESC`,
        [tenantId],
      ),
    ])

    return res.json({
      books: booksResult.rows,
      records: recordsResult.rows,
    })
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Could not load tenant data' })
  }
})

export default router
