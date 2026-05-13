import { pool, withTransaction } from '../db/pool.js'
import { createId } from '../utils/ids.js'

export async function getAllBooks(tenantId, businessId = '') {
  const params = [tenantId]
  let where = 'WHERE tenant_id = $1'
  if (businessId) {
    params.push(String(businessId))
    where += ' AND business_id = $2'
  }
  const result = await pool.query(
    `SELECT id, tenant_id, business_id, name, currency, created_at, updated_at
     FROM books
     ${where}
     ORDER BY updated_at DESC`,
    params,
  )
  return result.rows
}

export async function getBookById(tenantId, bookId) {
  const result = await pool.query(
    'SELECT * FROM books WHERE id = $1 AND tenant_id = $2',
    [bookId, tenantId],
  )
  return result.rows[0] || null
}

export async function createBook(tenantId, businessId, name, currency = 'UGX') {
  const id = createId('book')
  const result = await pool.query(
    `INSERT INTO books (id, tenant_id, business_id, name, currency, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, now(), now())
     RETURNING id, tenant_id, business_id, name, currency, created_at, updated_at`,
    [id, tenantId, businessId, name.trim(), currency],
  )
  return result.rows[0]
}

export async function updateBook(tenantId, bookId, { name, currency }) {
  const current = await getBookById(tenantId, bookId)
  if (!current) {
    return null
  }

  const result = await pool.query(
    `UPDATE books
     SET name = $1,
         currency = $2,
         updated_at = now()
     WHERE id = $3 AND tenant_id = $4
     RETURNING id, tenant_id, business_id, name, currency, created_at, updated_at`,
    [
      name?.trim() || current.name,
      currency || current.currency,
      bookId,
      tenantId,
    ],
  )
  return result.rows[0]
}

export async function deleteBook(tenantId, bookId) {
  const result = await pool.query(
    'DELETE FROM books WHERE id = $1 AND tenant_id = $2',
    [bookId, tenantId],
  )
  return result.rowCount > 0
}

export async function moveBook(tenantId, bookId, targetBusinessId) {
  return await withTransaction(async (client) => {
    const bookResult = await client.query(
      `UPDATE books
       SET business_id = $1, updated_at = now()
       WHERE id = $2 AND tenant_id = $3
       RETURNING id`,
      [targetBusinessId, bookId, tenantId],
    )
    if (!bookResult.rowCount) {
      return false
    }

    await client.query(
      `UPDATE records
       SET business_id = $1, updated_at = now()
       WHERE book_id = $2 AND tenant_id = $3`,
      [targetBusinessId, bookId, tenantId],
    )

    return true
  })
}

export async function copyBook(tenantId, bookId, targetBusinessId, { name } = {}) {
  const source = await getBookById(tenantId, bookId)
  if (!source) {
    return null
  }

  const newBookId = createId('book')
  const copiedName = name || `${source.name} Copy`

  await withTransaction(async (client) => {
    await client.query(
      `INSERT INTO books (id, tenant_id, business_id, name, currency, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, now(), now())`,
      [newBookId, tenantId, targetBusinessId, copiedName, source.currency || 'UGX'],
    )

    const recordsResult = await client.query(
      `SELECT type, amount, note, contact, category, payment_mode, date, time, attachments
       FROM records
       WHERE book_id = $1 AND tenant_id = $2`,
      [bookId, tenantId],
    )

    for (const row of recordsResult.rows) {
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
          targetBusinessId,
          newBookId,
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
    }
  })

  return newBookId
}

export async function upsertBook(client, tenantId, businessId, entityId, payloadBook) {
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
