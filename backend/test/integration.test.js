import test from 'node:test'
import assert from 'node:assert/strict'

import { createApp } from '../src/app.js'

let server
let baseUrl = ''

test.before(async () => {
  const app = createApp()
  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', resolve)
  })
  const address = server.address()
  baseUrl = `http://127.0.0.1:${address.port}`
})

test.after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error)
        return
      }
      resolve()
    })
  })
})

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, options)
  const text = await response.text()
  let body = {}
  try {
    body = text ? JSON.parse(text) : {}
  } catch {
    body = {}
  }
  return { response, body }
}

function authHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }
}

test('auth register/login and tenant me works', async () => {
  const stamp = Date.now()
  const email = `auth-${stamp}@hebo.test`

  const register = await request('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fullName: 'Auth User',
      email,
      password: 'Pass1234',
      tenantName: `AuthTenant-${stamp}`,
    }),
  })

  assert.equal(register.response.status, 201)
  assert.ok(register.body.accessToken)
  assert.ok(register.body.tenant?.id)

  const me = await request('/api/tenant/me', {
    headers: { Authorization: `Bearer ${register.body.accessToken}` },
  })
  assert.equal(me.response.status, 200)
  assert.equal(me.body.tenant.id, register.body.tenant.id)

  const login = await request('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      password: 'Pass1234',
      tenantId: register.body.tenant.id,
    }),
  })
  assert.equal(login.response.status, 200)
  assert.ok(login.body.accessToken)
})

test('tenant isolation: tenant B cannot see tenant A data', async () => {
  const stamp = Date.now()
  const a = await request('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fullName: 'Tenant A',
      email: `a-${stamp}@hebo.test`,
      password: 'Pass1234',
      tenantName: `TenantA-${stamp}`,
    }),
  })
  const b = await request('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fullName: 'Tenant B',
      email: `b-${stamp}@hebo.test`,
      password: 'Pass1234',
      tenantName: `TenantB-${stamp}`,
    }),
  })

  assert.equal(a.response.status, 201)
  assert.equal(b.response.status, 201)

  const aBiz = await request('/api/tenant/businesses', {
    method: 'POST',
    headers: authHeaders(a.body.accessToken),
    body: JSON.stringify({ name: `A-Biz-${stamp}` }),
  })
  assert.equal(aBiz.response.status, 201)

  const aBook = await request('/api/books', {
    method: 'POST',
    headers: authHeaders(a.body.accessToken),
    body: JSON.stringify({
      businessId: aBiz.body.business.id,
      name: 'A Book',
      currency: 'UGX',
    }),
  })
  assert.equal(aBook.response.status, 201)

  const aRecord = await request('/api/records', {
    method: 'POST',
    headers: authHeaders(a.body.accessToken),
    body: JSON.stringify({
      bookId: aBook.body.book.id,
      type: 'income',
      amount: 5000,
      note: 'tenant a income',
      contact: 'Client',
      category: 'Sales',
      paymentMode: 'Cash',
      date: '2026-03-24',
      time: '10:00',
      attachments: [],
    }),
  })
  assert.equal(aRecord.response.status, 201)

  const bSnapshot = await request('/api/data/snapshot', {
    headers: { Authorization: `Bearer ${b.body.accessToken}` },
  })
  assert.equal(bSnapshot.response.status, 200)
  assert.equal(
    bSnapshot.body.books.some((item) => item.id === aBook.body.book.id),
    false,
  )
  assert.equal(
    bSnapshot.body.records.some((item) => item.id === aRecord.body.record.id),
    false,
  )

  const bUpdateABook = await request(`/api/books/${aBook.body.book.id}`, {
    method: 'PATCH',
    headers: authHeaders(b.body.accessToken),
    body: JSON.stringify({ name: 'Hack attempt' }),
  })
  assert.equal(bUpdateABook.response.status, 404)
})

test('sync batch writes and snapshot returns synced data', async () => {
  const stamp = Date.now()
  const user = await request('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fullName: 'Sync User',
      email: `sync-${stamp}@hebo.test`,
      password: 'Pass1234',
      tenantName: `SyncTenant-${stamp}`,
    }),
  })
  assert.equal(user.response.status, 201)

  const business = await request('/api/tenant/businesses', {
    method: 'POST',
    headers: authHeaders(user.body.accessToken),
    body: JSON.stringify({ name: `SyncBiz-${stamp}` }),
  })
  assert.equal(business.response.status, 201)

  const bookId = `book-sync-${stamp}`
  const recordId = `record-sync-${stamp}`
  const syncBatch = await request('/api/sync/batch', {
    method: 'POST',
    headers: authHeaders(user.body.accessToken),
    body: JSON.stringify({
      changes: [
        {
          syncId: `s1-${stamp}`,
          companyId: business.body.business.id,
          bookId: '',
          entityType: 'book',
          entityId: bookId,
          operation: 'create',
          payload: {
            book: {
              name: 'Synced Book',
              currency: 'UGX',
            },
          },
        },
        {
          syncId: `s2-${stamp}`,
          companyId: business.body.business.id,
          bookId,
          entityType: 'record',
          entityId: recordId,
          operation: 'create',
          payload: {
            record: {
              type: 'income',
              amount: 9000,
              note: 'synced record',
              contact: '',
              category: 'Sales',
              paymentMode: 'Cash',
              date: '2026-03-24',
              time: '12:10',
              attachments: [],
            },
          },
        },
      ],
    }),
  })

  assert.equal(syncBatch.response.status, 200)
  assert.equal(syncBatch.body.results.length, 2)
  assert.equal(syncBatch.body.results.every((item) => item.status === 'synced'), true)

  const snapshot = await request('/api/data/snapshot', {
    headers: { Authorization: `Bearer ${user.body.accessToken}` },
  })
  assert.equal(snapshot.response.status, 200)
  assert.equal(snapshot.body.books.some((item) => item.id === bookId), true)
  assert.equal(snapshot.body.records.some((item) => item.id === recordId), true)
})

test('login rejects tenantId not owned by the user', async () => {
  const stamp = Date.now()
  const email = `tenant-check-${stamp}@hebo.test`

  const register = await request('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fullName: 'Tenant Check User',
      email,
      password: 'Pass1234',
      tenantName: `TenantCheck-${stamp}`,
    }),
  })
  assert.equal(register.response.status, 201)

  const login = await request('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      password: 'Pass1234',
      tenantId: 'ten-not-owned',
    }),
  })

  assert.equal(login.response.status, 403)
})

test('book duplicate and cross-business copy clone records', async () => {
  const stamp = Date.now()
  const user = await request('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fullName: 'Copy User',
      email: `book-copy-${stamp}@hebo.test`,
      password: 'Pass1234',
      tenantName: `CopyTenant-${stamp}`,
    }),
  })
  assert.equal(user.response.status, 201)

  const businessA = await request('/api/tenant/businesses', {
    method: 'POST',
    headers: authHeaders(user.body.accessToken),
    body: JSON.stringify({ name: `Biz-A-${stamp}` }),
  })
  const businessB = await request('/api/tenant/businesses', {
    method: 'POST',
    headers: authHeaders(user.body.accessToken),
    body: JSON.stringify({ name: `Biz-B-${stamp}` }),
  })
  assert.equal(businessA.response.status, 201)
  assert.equal(businessB.response.status, 201)

  const sourceBook = await request('/api/books', {
    method: 'POST',
    headers: authHeaders(user.body.accessToken),
    body: JSON.stringify({
      businessId: businessA.body.business.id,
      name: `Source-${stamp}`,
      currency: 'UGX',
    }),
  })
  assert.equal(sourceBook.response.status, 201)

  const sourceRecord = await request('/api/records', {
    method: 'POST',
    headers: authHeaders(user.body.accessToken),
    body: JSON.stringify({
      bookId: sourceBook.body.book.id,
      type: 'income',
      amount: 3200,
      note: 'for cloning',
      contact: 'C1',
      category: 'Sales',
      paymentMode: 'Cash',
      date: '2026-03-24',
      time: '09:10',
      attachments: [],
    }),
  })
  assert.equal(sourceRecord.response.status, 201)

  const duplicated = await request(`/api/books/${sourceBook.body.book.id}/duplicate`, {
    method: 'POST',
    headers: authHeaders(user.body.accessToken),
  })
  assert.equal(duplicated.response.status, 201)
  assert.ok(duplicated.body.duplicatedBookId)

  const booksInSourceBusiness = await request(
    `/api/books?businessId=${businessA.body.business.id}`,
    {
      headers: { Authorization: `Bearer ${user.body.accessToken}` },
    },
  )
  assert.equal(booksInSourceBusiness.response.status, 200)
  assert.equal(
    booksInSourceBusiness.body.books.some((book) => book.id === duplicated.body.duplicatedBookId),
    true,
  )

  const copied = await request(`/api/books/${sourceBook.body.book.id}/copy`, {
    method: 'POST',
    headers: authHeaders(user.body.accessToken),
    body: JSON.stringify({ targetBusinessId: businessB.body.business.id }),
  })
  assert.equal(copied.response.status, 201)
  assert.ok(copied.body.copiedBookId)

  const booksInTargetBusiness = await request(
    `/api/books?businessId=${businessB.body.business.id}`,
    {
      headers: { Authorization: `Bearer ${user.body.accessToken}` },
    },
  )
  assert.equal(booksInTargetBusiness.response.status, 200)
  assert.equal(
    booksInTargetBusiness.body.books.some((book) => book.id === copied.body.copiedBookId),
    true,
  )

  const snapshot = await request('/api/data/snapshot', {
    headers: { Authorization: `Bearer ${user.body.accessToken}` },
  })
  assert.equal(snapshot.response.status, 200)
  assert.equal(
    snapshot.body.records.some((record) => record.book_id === duplicated.body.duplicatedBookId),
    true,
  )
  assert.equal(
    snapshot.body.records.some((record) => record.book_id === copied.body.copiedBookId),
    true,
  )
})

test('record move/copy/bulk-delete operate within tenant books', async () => {
  const stamp = Date.now()
  const user = await request('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fullName: 'Record Ops User',
      email: `record-ops-${stamp}@hebo.test`,
      password: 'Pass1234',
      tenantName: `RecordOps-${stamp}`,
    }),
  })
  assert.equal(user.response.status, 201)

  const business = await request('/api/tenant/businesses', {
    method: 'POST',
    headers: authHeaders(user.body.accessToken),
    body: JSON.stringify({ name: `RecordOpsBiz-${stamp}` }),
  })
  assert.equal(business.response.status, 201)

  const sourceBook = await request('/api/books', {
    method: 'POST',
    headers: authHeaders(user.body.accessToken),
    body: JSON.stringify({
      businessId: business.body.business.id,
      name: 'Source Book',
      currency: 'UGX',
    }),
  })
  const targetBook = await request('/api/books', {
    method: 'POST',
    headers: authHeaders(user.body.accessToken),
    body: JSON.stringify({
      businessId: business.body.business.id,
      name: 'Target Book',
      currency: 'UGX',
    }),
  })
  assert.equal(sourceBook.response.status, 201)
  assert.equal(targetBook.response.status, 201)

  const firstRecord = await request('/api/records', {
    method: 'POST',
    headers: authHeaders(user.body.accessToken),
    body: JSON.stringify({
      bookId: sourceBook.body.book.id,
      type: 'expense',
      amount: 1500,
      note: 'r1',
      contact: 'Vendor',
      category: 'Ops',
      paymentMode: 'Cash',
      date: '2026-03-24',
      time: '10:15',
      attachments: [],
    }),
  })
  const secondRecord = await request('/api/records', {
    method: 'POST',
    headers: authHeaders(user.body.accessToken),
    body: JSON.stringify({
      bookId: sourceBook.body.book.id,
      type: 'expense',
      amount: 2100,
      note: 'r2',
      contact: 'Vendor',
      category: 'Ops',
      paymentMode: 'Cash',
      date: '2026-03-24',
      time: '11:20',
      attachments: [],
    }),
  })
  assert.equal(firstRecord.response.status, 201)
  assert.equal(secondRecord.response.status, 201)

  const copyResponse = await request('/api/records/copy', {
    method: 'POST',
    headers: authHeaders(user.body.accessToken),
    body: JSON.stringify({
      recordIds: [firstRecord.body.record.id, secondRecord.body.record.id],
      targetBookIds: [targetBook.body.book.id],
    }),
  })
  assert.equal(copyResponse.response.status, 200)
  assert.equal(copyResponse.body.createdCount, 2)

  const moveResponse = await request('/api/records/move', {
    method: 'POST',
    headers: authHeaders(user.body.accessToken),
    body: JSON.stringify({
      recordIds: [firstRecord.body.record.id],
      targetBookId: targetBook.body.book.id,
    }),
  })
  assert.equal(moveResponse.response.status, 200)
  assert.equal(moveResponse.body.movedCount, 1)

  const targetRecords = await request(`/api/records?bookId=${targetBook.body.book.id}`, {
    headers: { Authorization: `Bearer ${user.body.accessToken}` },
  })
  assert.equal(targetRecords.response.status, 200)
  assert.equal(targetRecords.body.records.length >= 3, true)

  const idsToDelete = targetRecords.body.records.slice(0, 2).map((record) => record.id)
  const bulkDelete = await request('/api/records/bulk-delete', {
    method: 'POST',
    headers: authHeaders(user.body.accessToken),
    body: JSON.stringify({ ids: idsToDelete }),
  })
  assert.equal(bulkDelete.response.status, 200)
  assert.equal(bulkDelete.body.deletedCount, idsToDelete.length)
})
