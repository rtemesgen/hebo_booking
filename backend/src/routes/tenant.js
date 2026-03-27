import express from 'express'
import { z } from 'zod'
import { pool } from '../db/pool.js'
import { requireAuth } from '../middleware/auth.js'
import { requireTenantMembership } from '../middleware/tenant.js'
import { createId } from '../utils/ids.js'
import { sendServerError } from '../utils/http.js'

const router = express.Router()

router.use(requireAuth)
router.use(requireTenantMembership)

router.get('/me', async (req, res) => {
  const { tenantId, userId } = req.auth
  try {
    const result = await pool.query(
      `SELECT t.id, t.name, m.role
       FROM tenants t
       JOIN tenant_memberships m ON m.tenant_id = t.id
       WHERE t.id = $1 AND m.user_id = $2`,
      [tenantId, userId],
    )
    if (!result.rowCount) {
      return res.status(404).json({ message: 'Tenant membership not found' })
    }

    return res.json({ tenant: result.rows[0] })
  } catch (error) {
    return sendServerError(res, error, 'Could not load tenant')
  }
})

const businessSchema = z.object({
  name: z.string().min(2),
})

router.get('/businesses', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, created_at
       FROM businesses
       WHERE tenant_id = $1
       ORDER BY created_at DESC`,
      [req.auth.tenantId],
    )
    return res.json({ businesses: result.rows })
  } catch (error) {
    return sendServerError(res, error, 'Could not load businesses')
  }
})

router.post('/businesses', async (req, res) => {
  const parsed = businessSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid business payload' })
  }

  try {
    const businessId = createId('biz')
    await pool.query(
      `INSERT INTO businesses (id, tenant_id, name)
       VALUES ($1, $2, $3)`,
      [businessId, req.auth.tenantId, parsed.data.name.trim()],
    )
    return res.status(201).json({
      business: {
        id: businessId,
        name: parsed.data.name.trim(),
      },
    })
  } catch (error) {
    return sendServerError(res, error, 'Could not create business')
  }
})

export default router
