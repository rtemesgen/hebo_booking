import { config } from '../config.js'

const authWindowMs = 10 * 60 * 1000
const authMaxAttempts = 30
const authRequestsByIp = new Map()

function cleanupAuthBucket(now) {
  for (const [ip, bucket] of authRequestsByIp.entries()) {
    if (now - bucket.windowStart > authWindowMs) {
      authRequestsByIp.delete(ip)
    }
  }
}

function normalizeIp(req) {
  const forwardedFor = req.headers['x-forwarded-for']
  if (typeof forwardedFor === 'string' && forwardedFor.trim()) {
    return forwardedFor.split(',')[0].trim()
  }
  return req.ip || req.socket?.remoteAddress || 'unknown'
}

export function authRateLimit(req, res, next) {
  const now = Date.now()
  cleanupAuthBucket(now)

  const ip = normalizeIp(req)
  const current = authRequestsByIp.get(ip)
  if (!current || now - current.windowStart > authWindowMs) {
    authRequestsByIp.set(ip, { count: 1, windowStart: now })
    return next()
  }

  if (current.count >= authMaxAttempts) {
    return res.status(429).json({ message: 'Too many auth requests. Try again soon.' })
  }

  current.count += 1
  return next()
}

export function applySecurityHeaders(_req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('Referrer-Policy', 'no-referrer')
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  if (config.nodeEnv !== 'development') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  }
  next()
}
