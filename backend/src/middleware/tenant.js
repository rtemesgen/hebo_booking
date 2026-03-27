import { pool } from '../db/pool.js'
import { sendServerError } from '../utils/http.js'

export async function requireTenantMembership(req, res, next) {
  const { tenantId, userId } = req.auth || {}
  if (!tenantId || !userId) {
    return res.status(401).json({ message: 'Missing auth context' })
  }

  try {
    const result = await pool.query(
      `SELECT role
       FROM tenant_memberships
       WHERE tenant_id = $1 AND user_id = $2`,
      [tenantId, userId],
    )
    if (!result.rowCount) {
      return res.status(403).json({ message: 'Not a member of tenant' })
    }

    req.auth.role = result.rows[0].role
    return next()
  } catch (error) {
    return sendServerError(res, error, 'Membership check failed')
  }
}
