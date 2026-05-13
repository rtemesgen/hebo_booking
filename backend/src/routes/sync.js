import express from 'express'
import { z } from 'zod'
import { withTransaction } from '../db/pool.js'
import { requireAuth } from '../middleware/auth.js'
import { requireTenantMembership } from '../middleware/tenant.js'
import { createId } from '../utils/ids.js'
import { sendServerError } from '../utils/http.js'
import * as bookService from '../services/bookService.js'
import * as recordService from '../services/recordService.js'

const router = express.Router()
router.use(requireAuth)
router.use(requireTenantMembership)

const changeSchema = z.object({
  syncId: z.string().min(3),
  companyId: z.string().optional(),
  bookId: z.string().optional(),
  entityType: z.enum(['book', 'record']),
  entityId: z.string().min(3),
  operation: z.enum(['create', 'update', 'delete', 'move', 'copy']),
  payload: z.record(z.any()).optional(),
})

const batchSchema = z.object({
  changes: z.array(changeSchema).min(1).max(200),
})

async function ensureBusinessBelongsToTenant(client, tenantId, businessId) {
  if (!businessId) {
    return true
  }
  const result = await client.query(
    'SELECT id FROM businesses WHERE id = $1 AND tenant_id = $2',
    [businessId, tenantId],
  )
  if (result.rowCount > 0) {
    return true
  }

  // Offline clients may create books before backend knows the business.
  // Create a tenant-scoped placeholder business to keep sync idempotent.
  await client.query(
    `INSERT INTO businesses (id, tenant_id, name)
     VALUES ($1, $2, $3)`,
    [businessId, tenantId, `Business ${businessId.slice(-6)}`],
  )
  return true
}

router.post('/batch', async (req, res) => {
  const parsed = batchSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid sync batch payload' })
  }

  const { tenantId, userId } = req.auth
  const { changes } = parsed.data

  try {
    const results = await withTransaction(async (client) => {
      const output = []

      for (const change of changes) {
        try {
          // Per-change isolation: one failed mutation should not block
          // the rest of the queue from being processed in this batch.
          const businessOk = await ensureBusinessBelongsToTenant(client, tenantId, change.companyId || '')
          if (!businessOk) {
            throw new Error('Business is outside tenant scope')
          }

          if (change.entityType === 'book') {
            if (change.operation === 'delete') {
              await client.query(
                'DELETE FROM books WHERE id = $1 AND tenant_id = $2',
                [change.entityId, tenantId],
              )
            } else {
              await bookService.upsertBook(
                client,
                tenantId,
                change.companyId || change.payload?.book?.companyId,
                change.entityId,
                change.payload?.book,
              )
            }
          }

          if (change.entityType === 'record') {
            if (change.operation === 'delete') {
              await client.query(
                'DELETE FROM records WHERE id = $1 AND tenant_id = $2',
                [change.entityId, tenantId],
              )
            } else {
              const resolvedBookId = change.bookId || change.payload?.record?.bookId
              await recordService.upsertRecord(
                client,
                tenantId,
                change.companyId || '',
                resolvedBookId,
                change.entityId,
                change.payload?.record,
              )
            }
          }

          await client.query(
            `INSERT INTO sync_operations (id, tenant_id, user_id, entity_type, entity_id, operation, status)
             VALUES ($1, $2, $3, $4, $5, $6, 'synced')`,
            [createId('syncop'), tenantId, userId, change.entityType, change.entityId, change.operation],
          )

          await client.query(
            `INSERT INTO audit_logs (id, tenant_id, user_id, action, entity_type, entity_id, after_state)
             VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)`,
            [
              createId('audit'),
              tenantId,
              userId,
              `${change.entityType}.${change.operation}`,
              change.entityType,
              change.entityId,
              JSON.stringify(change.payload || {}),
            ],
          )

          output.push({
            syncId: change.syncId,
            status: 'synced',
          })
        } catch (error) {
          await client.query(
            `INSERT INTO sync_operations (id, tenant_id, user_id, entity_type, entity_id, operation, status, error_message)
             VALUES ($1, $2, $3, $4, $5, $6, 'failed', $7)`,
            [
              createId('syncop'),
              tenantId,
              userId,
              change.entityType,
              change.entityId,
              change.operation,
              error.message || 'Unknown sync error',
            ],
          )
          output.push({
            syncId: change.syncId,
            status: 'failed',
            error: 'Sync failed',
          })
        }
      }

      return output
    })

    return res.json({ results })
  } catch (error) {
    return sendServerError(res, error, 'Sync processing failed')
  }
})

export default router
