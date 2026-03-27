import express from 'express'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { pool, withTransaction } from '../db/pool.js'
import { authRateLimit } from '../middleware/security.js'
import { createId } from '../utils/ids.js'
import { signAccessToken } from '../utils/auth.js'
import { sendServerError } from '../utils/http.js'

const router = express.Router()
router.use(authRateLimit)

const registerSchema = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  tenantName: z.string().min(2),
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  tenantId: z.string().min(3).optional(),
})

router.post('/register', async (req, res) => {
  const parsed = registerSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid registration payload' })
  }

  const { fullName, email, password, tenantName } = parsed.data
  const normalizedEmail = email.trim().toLowerCase()

  try {
    const result = await withTransaction(async (client) => {
      const existing = await client.query('SELECT id FROM users WHERE email = $1', [normalizedEmail])
      if (existing.rowCount > 0) {
        return { ok: false, reason: 'email_exists' }
      }

      const userId = createId('usr')
      const tenantId = createId('ten')
      const membershipId = createId('mem')
      const passwordHash = await bcrypt.hash(password, 10)

      await client.query(
        `INSERT INTO users (id, email, password_hash, full_name)
         VALUES ($1, $2, $3, $4)`,
        [userId, normalizedEmail, passwordHash, fullName.trim()],
      )

      await client.query(
        `INSERT INTO tenants (id, name)
         VALUES ($1, $2)`,
        [tenantId, tenantName.trim()],
      )

      await client.query(
        `INSERT INTO tenant_memberships (id, tenant_id, user_id, role)
         VALUES ($1, $2, $3, 'owner')`,
        [membershipId, tenantId, userId],
      )

      return { ok: true, userId, tenantId, role: 'owner' }
    })

    if (!result.ok) {
      return res.status(409).json({ message: 'Email is already used' })
    }

    const accessToken = signAccessToken({
      userId: result.userId,
      tenantId: result.tenantId,
      role: result.role,
    })

    return res.status(201).json({
      accessToken,
      user: { id: result.userId, email: normalizedEmail, fullName: fullName.trim() },
      tenant: { id: result.tenantId, name: tenantName.trim() },
    })
  } catch (error) {
    return sendServerError(res, error, 'Registration failed')
  }
})

router.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid login payload' })
  }

  const { email, password, tenantId } = parsed.data
  const normalizedEmail = email.trim().toLowerCase()

  try {
    const userResult = await pool.query(
      `SELECT id, email, password_hash, full_name
       FROM users
       WHERE email = $1`,
      [normalizedEmail],
    )

    if (!userResult.rowCount) {
      return res.status(401).json({ message: 'Invalid credentials' })
    }

    const user = userResult.rows[0]
    const passwordMatches = await bcrypt.compare(password, user.password_hash)
    if (!passwordMatches) {
      return res.status(401).json({ message: 'Invalid credentials' })
    }

    const memberships = await pool.query(
      `SELECT m.tenant_id, m.role
       FROM tenant_memberships m
       WHERE user_id = $1
       ORDER BY created_at ASC`,
      [user.id],
    )

    if (!memberships.rowCount) {
      return res.status(403).json({ message: 'User does not belong to tenant' })
    }

    const requestedMembership = memberships.rows.find((row) => row.tenant_id === tenantId)
    if (tenantId && !requestedMembership) {
      return res.status(403).json({ message: 'Requested tenant is not allowed for this user' })
    }

    const resolvedMembership = requestedMembership || memberships.rows[0]
    const resolvedTenantId = resolvedMembership.tenant_id
    const role = resolvedMembership.role
    const accessToken = signAccessToken({
      userId: user.id,
      tenantId: resolvedTenantId,
      role,
    })

    return res.json({
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
      },
      tenant: { id: resolvedTenantId },
      role,
    })
  } catch (error) {
    return sendServerError(res, error, 'Login failed')
  }
})

export default router
