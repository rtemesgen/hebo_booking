import express from 'express'
import cors from 'cors'
import { config } from './config.js'
import { pool } from './db/pool.js'
import authRoutes from './routes/auth.js'
import tenantRoutes from './routes/tenant.js'
import syncRoutes from './routes/sync.js'
import dataRoutes from './routes/data.js'
import booksRoutes from './routes/books.js'
import recordsRoutes from './routes/records.js'

export function createApp() {
  const app = express()

  app.use(
    cors({
      origin: config.frontendOrigin,
      credentials: true,
    }),
  )
  app.use(express.json({ limit: '2mb' }))

  app.get('/health', async (_req, res) => {
    try {
      await pool.query('SELECT 1')
      return res.json({ ok: true })
    } catch (error) {
      return res.status(500).json({ ok: false, message: error.message })
    }
  })

  app.use('/api/auth', authRoutes)
  app.use('/api/tenant', tenantRoutes)
  app.use('/api/sync', syncRoutes)
  app.use('/api/data', dataRoutes)
  app.use('/api/books', booksRoutes)
  app.use('/api/records', recordsRoutes)

  app.use((error, _req, res, _next) => {
    return res.status(500).json({ message: error.message || 'Unhandled server error' })
  })

  return app
}
