import { pool, withTransaction } from '../db/pool.js'
import { createId } from '../utils/ids.js'

export async function getAllRecords(tenantId, bookId = '') {
  const params = [tenantId]
  let where = 'WHERE tenant_id = $1'
  if (bookId) {
    params.push(String(bookId))
    where += ' AND book_id = $2'
  }
  const result = await pool.query(
    `SELECT id, tenant_id, business_id, book_id, type, amount, note, contact, category,
            payment_mode, date, time, attachments, created_at, updated_at
     FROM records
     ${where}
     ORDER BY created_at DESC`,
    params,
  )
  return result.rows
}

export async function getRecordById(tenantId, recordId) {
  const result = await pool.query(
    `SELECT * FROM records
     WHERE id = $1 AND tenant_id = $2`,
    [recordId, tenantId],
  )
  return result.rows[0] || null
}

export async function createRecord(tenantId, businessId, bookId, data) {
  const id = createId('record')
  const result = await pool.query(
    `INSERT INTO records (
      id, tenant_id, business_id, book_id, type, amount, note, contact, category,
      payment_mode, date, time, attachments, created_at, updated_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9,
      $10, $11, $12, $13::jsonb, now(), now()
    )
    RETURNING id, tenant_id, business_id, book_id, type, amount, note, contact, category,
              payment_mode, date, time, attachments, created_at, updated_at`,
    [
      id,
      tenantId,
      businessId,
      bookId,
      data.type,
      data.amount,
      data.note || '',
      data.contact || '',
      data.category || '',
      data.paymentMode || 'Cash',
      data.date,
      data.time,
      JSON.stringify(data.attachments || []),
    ],
  )
  return result.rows[0]
}

export async function updateRecord(tenantId, recordId, data) {
  const current = await getRecordById(tenantId, recordId)
  if (!current) {
    return null
  }

  const result = await pool.query(
    `UPDATE records
     SET type = $1,
         amount = $2,
         note = $3,
         contact = $4,
         category = $5,
         payment_mode = $6,
         date = $7,
         time = $8,
         attachments = $9::jsonb,
         updated_at = now()
     WHERE id = $10 AND tenant_id = $11
     RETURNING id, tenant_id, business_id, book_id, type, amount, note, contact, category,
               payment_mode, date, time, attachments, created_at, updated_at`,
    [
      data.type || current.type,
      data.amount ?? current.amount,
      data.note ?? current.note,
      data.contact ?? current.contact,
      data.category ?? current.category,
      data.paymentMode ?? current.payment_mode,
      data.date ?? current.date,
      data.time ?? current.time,
      JSON.stringify(data.attachments ?? current.attachments ?? []),
      recordId,
      tenantId,
    ],
  )
  return result.rows[0]
}

export async function deleteRecord(tenantId, recordId) {
  const result = await pool.query(
    'DELETE FROM records WHERE id = $1 AND tenant_id = $2',
    [recordId, tenantId],
  )
  return result.rowCount > 0
}

export async function deleteRecordsBulk(tenantId, ids) {
  const result = await pool.query(
    'DELETE FROM records WHERE tenant_id = $1 AND id = ANY($2::text[])',
    [tenantId, ids],
  )
  return result.rowCount
}

export async function moveRecords(tenantId, recordIds, targetBookId, businessId) {
  const result = await pool.query(
    `UPDATE records
     SET book_id = $1, business_id = $2, updated_at = now()
     WHERE tenant_id = $3 AND id = ANY($4::text[])`,
    [targetBookId, businessId, tenantId, recordIds],
  )
  return result.rowCount
}

export async function copyRecords(tenantId, recordIds, targetBooks) {
  const sourceRecords = await pool.query(
    `SELECT id, business_id, type, amount, note, contact, category, payment_mode, date, time, attachments
     FROM records
     WHERE tenant_id = $1 AND id = ANY($2::text[])`,
    [tenantId, recordIds],
  )

  if (!sourceRecords.rowCount) {
    return 0
  }

  return await withTransaction(async (client) => {
    let count = 0
    for (const target of targetBooks) {
      const allowed = sourceRecords.rows.every((row) => row.business_id === target.business_id)
      if (!allowed) {
        continue
      }

      for (const row of sourceRecords.rows) {
        await client.query(
          `INSERT INTO records (
            id, tenant_id, business_id, book_id, type, amount, note, contact, category,
            payment_mode, date, time, attachments, created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9,
            $10, $11, $12, $13::jsonb, now(), now()
          )`,
          [
            createId('record'),
            tenantId,
            target.business_id,
            target.id,
            row.type,
            row.amount,
            row.note || '',
            row.contact || '',
            row.category || '',
            row.payment_mode || 'Cash',
            row.date,
            row.time,
            JSON.stringify(Array.isArray(row.attachments) ? row.attachments : []),
          ],
        )
        count += 1
      }
    }
    return count
  })
}

export async function upsertRecord(client, tenantId, businessId, bookId, entityId, payloadRecord) {
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
