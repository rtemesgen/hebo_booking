import express from 'express'
import cors from 'cors'
import { config } from './config.js'
import { pool } from './db/pool.js'
import { applySecurityHeaders } from './middleware/security.js'
import authRoutes from './routes/auth.js'
import tenantRoutes from './routes/tenant.js'
import syncRoutes from './routes/sync.js'
import dataRoutes from './routes/data.js'
import booksRoutes from './routes/books.js'
import recordsRoutes from './routes/records.js'
import { sendServerError } from './utils/http.js'

export function createApp() {
  const app = express()

  app.use(
    cors({
      origin(origin, callback) {
        if (!origin) {
          callback(null, true)
          return
        }
        if (config.frontendOrigins.includes(origin)) {
          callback(null, true)
          return
        }
        callback(new Error('Origin is not allowed by CORS'))
      },
      credentials: true,
    }),
  )
  app.use(applySecurityHeaders)
  app.use(express.json({ limit: '2mb' }))

  app.get('/health', async (_req, res) => {
    try {
      await pool.query('SELECT 1')
      return res.json({ ok: true })
    } catch (error) {
      return sendServerError(res, error, 'Health check failed')
    }
  })

  app.use('/api/auth', authRoutes)
  app.use('/api/tenant', tenantRoutes)
  app.use('/api/sync', syncRoutes)
  app.use('/api/data', dataRoutes)
  app.use('/api/books', booksRoutes)
  app.use('/api/records', recordsRoutes)

  app.use((error, _req, res, _next) => {
    return sendServerError(res, error, 'Unhandled server error')
  })

  return app
}
