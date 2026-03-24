import { verifyAccessToken } from '../utils/auth.js'

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || ''
  const [, token] = header.split(' ')
  if (!token) {
    return res.status(401).json({ message: 'Missing bearer token' })
  }

  try {
    const decoded = verifyAccessToken(token)
    req.auth = {
      userId: decoded.userId,
      tenantId: decoded.tenantId,
      role: decoded.role,
    }
    return next()
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' })
  }
}
