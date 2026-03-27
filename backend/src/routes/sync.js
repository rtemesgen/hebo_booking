import express from 'express'
import { z } from 'zod'
import { withTransaction } from '../db/pool.js'
import { requireAuth } from '../middleware/auth.js'
import { requireTenantMembership } from '../middleware/tenant.js'
import { createId } from '../utils/ids.js'
import { sendServerError } from '../utils/http.js'

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

async function upsertBook(client, tenantId, businessId, entityId, payloadBook) {
  if (!payloadBook) {
    throw new Error('Missing book payload')
  }

  await client.query(
    `INSERT INTO books (id, tenant_id, business_id, name, currency, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, now(), now())
     ON CONFLICT (id)
     DO UPDATE SET
       tenant_id = EXCLUDED.tenant_id,
       business_id = EXCLUDED.business_id,
       name = EXCLUDED.name,
       currency = EXCLUDED.currency,
       updated_at = now()`,
    [
      entityId,
      tenantId,
      businessId,
      payloadBook.name || 'Book',
      payloadBook.currency || 'UGX',
    ],
  )
}

async function upsertRecord(client, tenantId, businessId, bookId, entityId, payloadRecord) {
  if (!payloadRecord) {
    throw new Error('Missing record payload')
  }

  const attachments = JSON.stringify(Array.isArray(payloadRecord.attachments) ? payloadRecord.attachments : [])

  await client.query(
    `INSERT INTO records (
       id, tenant_id, business_id, book_id, type, amount, note, contact,
       category, payment_mode, date, time, attachments, created_at, updated_at
     )
     VALUES (
       $1, $2, $3, $4, $5, $6, $7, $8,
       $9, $10, $11, $12, $13::jsonb, now(), now()
     )
     ON CONFLICT (id)
     DO UPDATE SET
       tenant_id = EXCLUDED.tenant_id,
       business_id = EXCLUDED.business_id,
       book_id = EXCLUDED.book_id,
       type = EXCLUDED.type,
       amount = EXCLUDED.amount,
       note = EXCLUDED.note,
       contact = EXCLUDED.contact,
       category = EXCLUDED.category,
       payment_mode = EXCLUDED.payment_mode,
       date = EXCLUDED.date,
       time = EXCLUDED.time,
       attachments = EXCLUDED.attachments,
       updated_at = now()`,
    [
      entityId,
      tenantId,
      businessId,
      bookId,
      payloadRecord.type || 'expense',
      Number(payloadRecord.amount || 0),
      payloadRecord.note || '',
      payloadRecord.contact || '',
      payloadRecord.category || '',
      payloadRecord.paymentMode || 'Cash',
      payloadRecord.date || new Date().toISOString().slice(0, 10),
      payloadRecord.time || '00:00',
      attachments,
    ],
  )
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
              await upsertBook(
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
              await upsertRecord(
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
