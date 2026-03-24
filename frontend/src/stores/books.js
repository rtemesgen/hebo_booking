import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import {
  copyBookApi,
  copyRecordsApi,
  createBookApi,
  createRecordApi,
  deleteBookApi,
  deleteRecordsBulkApi,
  duplicateBookApi,
  fetchTenantSnapshot,
  hasAuthSession,
  isBackendConfigured,
  moveBookApi,
  moveRecordsApi,
  postSyncBatch,
  updateBookApi,
  updateRecordApi,
} from '../services/api'

function createId(prefix) {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`
  }
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`
}

function normalizeName(value) {
  return (value || '').trim().toLowerCase()
}

function parseRecordMoment(record) {
  const datePart = record.date || '1970-01-01'
  const timePart = record.time || '00:00'
  const iso = `${datePart}T${timePart}:00`
  const parsed = new Date(iso)
  const fallback = new Date(record.createdAt || 0)
  return Number.isNaN(parsed.getTime()) ? fallback : parsed
}

const STORAGE_KEY = 'hebo.books.v1'
const CLEANUP_FLAG_KEY = 'hebo.cleanup.demoData.v1'
const LEGACY_DEMO_BOOK_IDS = new Set(['book-001', 'book-002'])
const LEGACY_DEMO_RECORD_IDS = new Set(['record-001', 'record-002', 'record-003', 'record-004'])

function isLegacyDemoData(books, records) {
  if (!Array.isArray(books) || !Array.isArray(records)) {
    return false
  }

  if (books.length !== LEGACY_DEMO_BOOK_IDS.size || records.length !== LEGACY_DEMO_RECORD_IDS.size) {
    return false
  }

  return (
    books.every((book) => LEGACY_DEMO_BOOK_IDS.has(book.id)) &&
    records.every((record) => LEGACY_DEMO_RECORD_IDS.has(record.id))
  )
}

function readPersistedState() {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return null
    }

    const parsed = JSON.parse(raw)
    if (!parsed || !Array.isArray(parsed.books) || !Array.isArray(parsed.records)) {
      return null
    }

    const alreadyCleaned = window.localStorage.getItem(CLEANUP_FLAG_KEY) === 'true'
    if (!alreadyCleaned && isLegacyDemoData(parsed.books, parsed.records)) {
      window.localStorage.setItem(CLEANUP_FLAG_KEY, 'true')
      return {
        books: [],
        records: [],
        syncQueue: [],
        auditLogs: [],
        lastSyncedAt: '',
      }
    }

    return {
      books: parsed.books,
      records: parsed.records,
      syncQueue: Array.isArray(parsed.syncQueue) ? parsed.syncQueue : [],
      auditLogs: Array.isArray(parsed.auditLogs) ? parsed.auditLogs : [],
      lastSyncedAt: parsed.lastSyncedAt || '',
    }
  } catch {
    return null
  }
}

function persistState(booksValue, recordsValue, syncQueueValue, auditLogsValue, lastSyncedAtValue) {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        books: booksValue,
        records: recordsValue,
        syncQueue: syncQueueValue,
        auditLogs: auditLogsValue,
        lastSyncedAt: lastSyncedAtValue,
      }),
    )
  } catch {
    // Storage quota can be exceeded (for example with large attachments).
    // Keep app responsive even if persistence temporarily fails.
  }
}

export const useBooksStore = defineStore('books', () => {
  const persisted = readPersistedState()
  const books = ref(persisted ? persisted.books : [])
  const records = ref(persisted ? persisted.records : [])
  const syncQueue = ref(persisted ? persisted.syncQueue : [])
  const auditLogs = ref(persisted ? persisted.auditLogs : [])
  const isOnline = ref(typeof navigator === 'undefined' ? true : navigator.onLine)
  const lastSyncedAt = ref(persisted?.lastSyncedAt || '')
  const pendingRecordTransferIds = ref([])
  const syncInFlight = ref(false)
  const serverWriteInFlight = ref(false)
  const lastWriteStatus = ref('idle')

  const bookCount = computed(() => books.value.length)
  const totalBalance = computed(() =>
    books.value.reduce((sum, book) => sum + getBookSummary(book.id).balance, 0),
  )
  const syncSummary = computed(() => ({
    pending: syncQueue.value.filter((item) => item.status === 'pending').length,
    synced: syncQueue.value.filter((item) => item.status === 'synced').length,
    failed: syncQueue.value.filter((item) => item.status === 'failed').length,
  }))
  const failedSyncItems = computed(() =>
    syncQueue.value.filter((item) => item.status === 'failed'),
  )

  function getEntitySyncStatus(entityType, entityId) {
    if (!entityType || !entityId) {
      return 'none'
    }

    const related = syncQueue.value.filter(
      (item) => item.entityType === entityType && item.entityId === entityId,
    )
    if (!related.length) {
      return 'none'
    }

    if (related.some((item) => item.status === 'failed')) {
      return 'failed'
    }
    if (related.some((item) => item.status === 'pending')) {
      return 'pending'
    }
    if (related.some((item) => item.status === 'synced')) {
      return 'synced'
    }
    return 'none'
  }

  function addAuditLog(event) {
    auditLogs.value.unshift({
      id: createId('audit'),
      createdAt: new Date().toISOString(),
      ...event,
    })
  }

  function enqueueSyncChange(change) {
    syncQueue.value.unshift({
      id: createId('sync'),
      status: 'pending',
      createdAt: new Date().toISOString(),
      ...change,
    })
    void processSyncQueue()
  }

  function shouldUseBackendCrud() {
    // Server-first only when online + API configured + authenticated.
    // Otherwise we keep local-first behavior and queue sync-safe changes.
    return isOnline.value && isBackendConfigured() && hasAuthSession()
  }

  function buildSyncPayload(item) {
    if (item.entityType === 'book') {
      const book = books.value.find((entry) => entry.id === item.entityId) || null
      return { book }
    }

    if (item.entityType === 'record') {
      const record = records.value.find((entry) => entry.id === item.entityId) || null
      return { record }
    }

    return {}
  }

  async function processSyncQueue() {
    if (!isOnline.value || syncInFlight.value) {
      return
    }

    if (!isBackendConfigured() || !hasAuthSession()) {
      // Production-safe: do not fake success when backend/auth is unavailable.
      return
    }

    const pendingItems = syncQueue.value.filter((item) => item.status === 'pending')
    if (!pendingItems.length) {
      return
    }

    syncInFlight.value = true
    const now = new Date().toISOString()

    try {
      const payload = pendingItems.map((item) => ({
        syncId: item.id,
        companyId: item.companyId || '',
        bookId: item.bookId || '',
        entityType: item.entityType,
        entityId: item.entityId,
        operation: item.operation,
        payload: buildSyncPayload(item),
      }))

      const response = await postSyncBatch(payload)
      const resultMap = new Map(
        Array.isArray(response?.results)
          ? response.results.map((result) => [result.syncId, result])
          : [],
      )

      let syncedAny = false
      syncQueue.value = syncQueue.value.map((item) => {
        if (item.status !== 'pending') {
          return item
        }

        const result = resultMap.get(item.id)
        if (!result) {
          return {
            ...item,
            status: 'failed',
            failedReason: 'Missing sync result from server',
            failedAt: now,
          }
        }

        if (result.status === 'synced') {
          syncedAny = true
          return {
            ...item,
            status: 'synced',
            syncedAt: now,
            failedReason: '',
            failedAt: '',
          }
        }

        return {
          ...item,
          status: result.status === 'conflict' ? 'failed' : 'failed',
          failedReason: result.error || 'Sync failed',
          failedAt: now,
        }
      })

      if (syncedAny) {
        lastSyncedAt.value = now
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Network sync failed'
      const networkLikeError =
        /failed to fetch|network|timeout|backend api is not configured/i.test(message)

      syncQueue.value = syncQueue.value.map((item) =>
        item.status === 'pending'
          ? {
              ...item,
              status: networkLikeError ? 'pending' : 'failed',
              failedReason: message,
              failedAt: networkLikeError ? '' : now,
            }
          : item,
      )
    } finally {
      syncInFlight.value = false
    }
  }

  function retryFailedSyncItems() {
    syncQueue.value = syncQueue.value.map((item) =>
      item.status === 'failed'
        ? { ...item, status: 'pending', failedReason: '', failedAt: '' }
        : item,
    )
    void processSyncQueue()
  }

  function resolveSyncConflict(syncItemId, strategy = 'retry') {
    const index = syncQueue.value.findIndex((item) => item.id === syncItemId)
    if (index < 0) {
      return false
    }

    const current = syncQueue.value[index]
    if (current.status !== 'failed') {
      return false
    }

    if (strategy === 'skip') {
      syncQueue.value[index] = {
        ...current,
        status: 'resolved',
        resolvedAt: new Date().toISOString(),
      }
      return true
    }

    syncQueue.value[index] = {
      ...current,
      status: 'pending',
      failedReason: '',
      failedAt: '',
    }
    void processSyncQueue()
    return true
  }

  function setOnlineStatus(online) {
    isOnline.value = Boolean(online)
    if (isOnline.value) {
      void processSyncQueue()
    }
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('online', () => setOnlineStatus(true))
    window.addEventListener('offline', () => setOnlineStatus(false))
  }

  function findBookByNormalizedName(name, companyId, ignoreBookId = '') {
    const target = normalizeName(name)
    if (!target) {
      return null
    }

    return (
      books.value.find((book) => {
        if (ignoreBookId && book.id === ignoreBookId) {
          return false
        }

        return (
          (book.companyId || 'company-001') === (companyId || 'company-001') &&
          normalizeName(book.name) === target
        )
      }) ?? null
    )
  }

  function buildCopyName(sourceName, companyId) {
    const base = sourceName?.trim() || 'Book'
    let candidate = `${base} Copy`
    let index = 2

    while (findBookByNormalizedName(candidate, companyId)) {
      candidate = `${base} Copy ${index}`
      index += 1
    }

    return candidate
  }

  function addBook(payload) {
    const name = payload.name?.trim()
    if (!name) {
      return false
    }

    const companyId = payload.companyId ?? 'company-001'
    if (findBookByNormalizedName(name, companyId)) {
      return false
    }

    const now = new Date().toISOString()
    books.value.unshift({
      id: createId('book'),
      companyId,
      name,
      currency: payload.currency ?? 'UGX',
      updatedAt: now,
      createdAt: now,
    })

    const createdBook = books.value[0]
    enqueueSyncChange({
      companyId,
      entityType: 'book',
      entityId: createdBook.id,
      operation: 'create',
    })
    addAuditLog({
      companyId,
      bookId: createdBook.id,
      entityType: 'book',
      entityId: createdBook.id,
      action: 'book.create',
      after: { name: createdBook.name, currency: createdBook.currency },
    })

    return true
  }

  async function createBook(payload) {
    if (!shouldUseBackendCrud()) {
      lastWriteStatus.value = 'local'
      return addBook(payload)
    }
    if (!payload?.companyId) {
      return false
    }

    try {
      serverWriteInFlight.value = true
      await createBookApi({
        businessId: payload.companyId,
        name: payload.name,
        currency: payload.currency || 'UGX',
      })
      const synced = await syncFromBackendSnapshot()
      lastWriteStatus.value = synced.ok ? 'server' : 'queued'
      return Boolean(synced.ok)
    } catch {
      lastWriteStatus.value = 'queued'
      return addBook(payload)
    } finally {
      serverWriteInFlight.value = false
    }
  }

  function addRecord(payload) {
    const amount = Number(payload.amount)
    const note = payload.note?.trim()

    if (!payload.bookId || !payload.type || !amount || amount <= 0) {
      return false
    }

    const now = new Date().toISOString()
    records.value.unshift({
      id: createId('record'),
      bookId: payload.bookId,
      type: payload.type,
      amount,
      note: note || 'No remark',
      contact: payload.contact?.trim() || '',
      category: payload.category?.trim() || '',
      paymentMode: payload.paymentMode || 'Cash',
      date: payload.date || now.slice(0, 10),
      time: payload.time || now.slice(11, 16),
      attachments: Array.isArray(payload.attachments) ? payload.attachments : [],
      createdAt: now,
    })

    const createdRecord = records.value[0]

    const bookIndex = books.value.findIndex((book) => book.id === payload.bookId)
    if (bookIndex >= 0) {
      books.value[bookIndex] = {
        ...books.value[bookIndex],
        updatedAt: now,
      }
    }

    const targetBook = books.value.find((book) => book.id === payload.bookId)
    enqueueSyncChange({
      companyId: targetBook?.companyId || 'company-001',
      bookId: payload.bookId,
      entityType: 'record',
      entityId: createdRecord.id,
      operation: 'create',
    })
    addAuditLog({
      companyId: targetBook?.companyId || 'company-001',
      bookId: payload.bookId,
      entityType: 'record',
      entityId: createdRecord.id,
      action: 'record.create',
      after: {
        type: createdRecord.type,
        amount: createdRecord.amount,
        note: createdRecord.note,
      },
    })

    return true
  }

  async function createRecord(payload) {
    if (!shouldUseBackendCrud()) {
      lastWriteStatus.value = 'local'
      return addRecord(payload)
    }

    try {
      serverWriteInFlight.value = true
      await createRecordApi({
        bookId: payload.bookId,
        type: payload.type,
        amount: Number(payload.amount),
        note: payload.note || '',
        contact: payload.contact || '',
        category: payload.category || '',
        paymentMode: payload.paymentMode || 'Cash',
        date: payload.date,
        time: payload.time,
        attachments: Array.isArray(payload.attachments) ? payload.attachments : [],
      })
      const synced = await syncFromBackendSnapshot()
      lastWriteStatus.value = synced.ok ? 'server' : 'queued'
      return Boolean(synced.ok)
    } catch {
      lastWriteStatus.value = 'queued'
      return addRecord(payload)
    } finally {
      serverWriteInFlight.value = false
    }
  }

  function getRecordById(recordId) {
    return records.value.find((record) => record.id === recordId) ?? null
  }

  function updateRecord(recordId, payload) {
    const recordIndex = records.value.findIndex((record) => record.id === recordId)
    if (recordIndex < 0) {
      return false
    }

    const amount = Number(payload.amount)
    if (!amount || amount <= 0) {
      return false
    }

    const nextRecord = {
      ...records.value[recordIndex],
      amount,
      note: payload.note?.trim() || 'No remark',
      contact: payload.contact?.trim() || '',
      category: payload.category?.trim() || '',
      paymentMode: payload.paymentMode || 'Cash',
      date: payload.date || records.value[recordIndex].date,
      time: payload.time || records.value[recordIndex].time || '00:00',
      type: payload.type || records.value[recordIndex].type,
      attachments: Array.isArray(payload.attachments)
        ? payload.attachments
        : records.value[recordIndex].attachments || [],
    }

    const previousRecord = records.value[recordIndex]
    records.value[recordIndex] = nextRecord

    const bookIndex = books.value.findIndex((book) => book.id === nextRecord.bookId)
    if (bookIndex >= 0) {
      books.value[bookIndex] = {
        ...books.value[bookIndex],
        updatedAt: new Date().toISOString(),
      }
    }

    const targetBook = books.value.find((book) => book.id === nextRecord.bookId)
    enqueueSyncChange({
      companyId: targetBook?.companyId || 'company-001',
      bookId: nextRecord.bookId,
      entityType: 'record',
      entityId: nextRecord.id,
      operation: 'update',
    })
    addAuditLog({
      companyId: targetBook?.companyId || 'company-001',
      bookId: nextRecord.bookId,
      entityType: 'record',
      entityId: nextRecord.id,
      action: 'record.update',
      before: {
        amount: previousRecord.amount,
        note: previousRecord.note,
        category: previousRecord.category,
        paymentMode: previousRecord.paymentMode,
      },
      after: {
        amount: nextRecord.amount,
        note: nextRecord.note,
        category: nextRecord.category,
        paymentMode: nextRecord.paymentMode,
      },
    })

    return true
  }

  async function editRecord(recordId, payload) {
    if (!shouldUseBackendCrud()) {
      lastWriteStatus.value = 'local'
      return updateRecord(recordId, payload)
    }

    const amount = Number(payload.amount)
    if (!amount || amount <= 0) {
      return false
    }

    try {
      serverWriteInFlight.value = true
      await updateRecordApi(recordId, {
        type: payload.type,
        amount,
        note: payload.note || '',
        contact: payload.contact || '',
        category: payload.category || '',
        paymentMode: payload.paymentMode || 'Cash',
        date: payload.date,
        time: payload.time,
        attachments: Array.isArray(payload.attachments) ? payload.attachments : [],
      })
      const synced = await syncFromBackendSnapshot()
      lastWriteStatus.value = synced.ok ? 'server' : 'queued'
      return Boolean(synced.ok)
    } catch {
      lastWriteStatus.value = 'queued'
      return updateRecord(recordId, payload)
    } finally {
      serverWriteInFlight.value = false
    }
  }

  function deleteRecordsByIds(recordIds) {
    if (!Array.isArray(recordIds) || !recordIds.length) {
      return 0
    }

    const before = records.value.length
    const idSet = new Set(recordIds)
    const removedRecords = records.value.filter((record) => idSet.has(record.id))
    const removedBookIds = new Set(
      records.value.filter((record) => idSet.has(record.id)).map((record) => record.bookId),
    )
    records.value = records.value.filter((record) => !idSet.has(record.id))

    if (before !== records.value.length) {
      books.value = books.value.map((book) =>
        removedBookIds.has(book.id) ? { ...book, updatedAt: new Date().toISOString() } : book,
      )

      for (const removedRecord of removedRecords) {
        const parentBook = books.value.find((book) => book.id === removedRecord.bookId)
        enqueueSyncChange({
          companyId: parentBook?.companyId || 'company-001',
          bookId: removedRecord.bookId,
          entityType: 'record',
          entityId: removedRecord.id,
          operation: 'delete',
        })
        addAuditLog({
          companyId: parentBook?.companyId || 'company-001',
          bookId: removedRecord.bookId,
          entityType: 'record',
          entityId: removedRecord.id,
          action: 'record.delete',
          before: {
            amount: removedRecord.amount,
            note: removedRecord.note,
            type: removedRecord.type,
          },
        })
      }
    }

    return before - records.value.length
  }

  async function removeRecords(recordIds) {
    if (!shouldUseBackendCrud()) {
      lastWriteStatus.value = 'local'
      return deleteRecordsByIds(recordIds)
    }
    if (!Array.isArray(recordIds) || !recordIds.length) {
      return 0
    }

    try {
      serverWriteInFlight.value = true
      const response = await deleteRecordsBulkApi(recordIds)
      await syncFromBackendSnapshot()
      lastWriteStatus.value = 'server'
      return Number(response?.deletedCount || 0)
    } catch {
      lastWriteStatus.value = 'queued'
      return deleteRecordsByIds(recordIds)
    } finally {
      serverWriteInFlight.value = false
    }
  }

  function moveRecordsToBook(recordIds, targetBookId) {
    if (!Array.isArray(recordIds) || !recordIds.length || !targetBookId) {
      return 0
    }

    const targetBook = books.value.find((book) => book.id === targetBookId)
    if (!targetBook) {
      return 0
    }

    const idSet = new Set(recordIds)
    let movedCount = 0
    const movedRecordIds = []

    records.value = records.value.map((record) => {
      if (!idSet.has(record.id)) {
        return record
      }

      const sourceBook = books.value.find((book) => book.id === record.bookId)
      if (!sourceBook || sourceBook.companyId !== targetBook.companyId) {
        return record
      }

      movedCount += 1
      movedRecordIds.push(record.id)
      return {
        ...record,
        bookId: targetBookId,
        createdAt: new Date().toISOString(),
      }
    })

    if (movedCount > 0) {
      books.value = books.value.map((book) => ({
        ...book,
        updatedAt: new Date().toISOString(),
      }))

      for (const movedId of movedRecordIds) {
        enqueueSyncChange({
          companyId: targetBook.companyId,
          bookId: targetBookId,
          entityType: 'record',
          entityId: movedId,
          operation: 'move',
        })
        addAuditLog({
          companyId: targetBook.companyId,
          bookId: targetBookId,
          entityType: 'record',
          entityId: movedId,
          action: 'record.move',
          after: { toBookId: targetBookId },
        })
      }
    }

    return movedCount
  }

  async function moveRecords(recordIds, targetBookId) {
    if (!shouldUseBackendCrud()) {
      lastWriteStatus.value = 'local'
      return moveRecordsToBook(recordIds, targetBookId)
    }
    if (!Array.isArray(recordIds) || !recordIds.length || !targetBookId) {
      return 0
    }

    try {
      serverWriteInFlight.value = true
      const response = await moveRecordsApi(recordIds, targetBookId)
      await syncFromBackendSnapshot()
      lastWriteStatus.value = 'server'
      return Number(response?.movedCount || 0)
    } catch {
      lastWriteStatus.value = 'queued'
      return moveRecordsToBook(recordIds, targetBookId)
    } finally {
      serverWriteInFlight.value = false
    }
  }

  function copyRecordsToBooks(recordIds, targetBookIds) {
    if (!Array.isArray(recordIds) || !recordIds.length) {
      return 0
    }

    const targetIds = Array.isArray(targetBookIds) ? targetBookIds.filter(Boolean) : []
    if (!targetIds.length) {
      return 0
    }

    const idSet = new Set(recordIds)
    const sourceRecords = records.value.filter((record) => idSet.has(record.id))
    if (!sourceRecords.length) {
      return 0
    }

    const allowedTargetIds = targetIds.filter((targetId) => {
      const targetBook = books.value.find((book) => book.id === targetId)
      if (!targetBook) {
        return false
      }

      return sourceRecords.every((record) => {
        const sourceBook = books.value.find((book) => book.id === record.bookId)
        return sourceBook && sourceBook.companyId === targetBook.companyId
      })
    })

    if (!allowedTargetIds.length) {
      return 0
    }

    const now = new Date().toISOString()
    const clones = []

    for (const targetBookId of allowedTargetIds) {
      for (const source of sourceRecords) {
        clones.push({
          ...source,
          id: createId('record'),
          bookId: targetBookId,
          createdAt: now,
        })
      }
    }

    records.value.unshift(...clones)

    books.value = books.value.map((book) =>
      allowedTargetIds.includes(book.id) ? { ...book, updatedAt: now } : book,
    )

    for (const clone of clones) {
      const targetBook = books.value.find((book) => book.id === clone.bookId)
      enqueueSyncChange({
        companyId: targetBook?.companyId || 'company-001',
        bookId: clone.bookId,
        entityType: 'record',
        entityId: clone.id,
        operation: 'copy',
      })
      addAuditLog({
        companyId: targetBook?.companyId || 'company-001',
        bookId: clone.bookId,
        entityType: 'record',
        entityId: clone.id,
        action: 'record.copy',
        after: { amount: clone.amount, note: clone.note },
      })
    }

    return clones.length
  }

  async function copyRecords(recordIds, targetBookIds) {
    if (!shouldUseBackendCrud()) {
      lastWriteStatus.value = 'local'
      return copyRecordsToBooks(recordIds, targetBookIds)
    }
    if (!Array.isArray(recordIds) || !recordIds.length || !Array.isArray(targetBookIds) || !targetBookIds.length) {
      return 0
    }

    try {
      serverWriteInFlight.value = true
      const response = await copyRecordsApi(recordIds, targetBookIds)
      await syncFromBackendSnapshot()
      lastWriteStatus.value = 'server'
      return Number(response?.createdCount || 0)
    } catch {
      lastWriteStatus.value = 'queued'
      return copyRecordsToBooks(recordIds, targetBookIds)
    } finally {
      serverWriteInFlight.value = false
    }
  }

  function renameBook(bookId, name) {
    const trimmedName = name?.trim()
    if (!trimmedName) {
      return false
    }

    const bookIndex = books.value.findIndex((book) => book.id === bookId)
    if (bookIndex < 0) {
      return false
    }

    const targetCompanyId = books.value[bookIndex].companyId
    if (findBookByNormalizedName(trimmedName, targetCompanyId, bookId)) {
      return false
    }

    books.value[bookIndex] = {
      ...books.value[bookIndex],
      name: trimmedName,
      updatedAt: new Date().toISOString(),
    }

    const updatedBook = books.value[bookIndex]
    enqueueSyncChange({
      companyId: updatedBook.companyId,
      entityType: 'book',
      entityId: updatedBook.id,
      operation: 'update',
    })
    addAuditLog({
      companyId: updatedBook.companyId,
      bookId: updatedBook.id,
      entityType: 'book',
      entityId: updatedBook.id,
      action: 'book.rename',
      after: { name: updatedBook.name },
    })

    return true
  }

  async function renameBookEntry(bookId, name) {
    if (!shouldUseBackendCrud()) {
      lastWriteStatus.value = 'local'
      return renameBook(bookId, name)
    }
    const trimmed = (name || '').trim()
    if (!trimmed) {
      return false
    }
    try {
      serverWriteInFlight.value = true
      await updateBookApi(bookId, { name: trimmed })
      const synced = await syncFromBackendSnapshot()
      lastWriteStatus.value = synced.ok ? 'server' : 'queued'
      return Boolean(synced.ok)
    } catch {
      lastWriteStatus.value = 'queued'
      return renameBook(bookId, name)
    } finally {
      serverWriteInFlight.value = false
    }
  }

  function duplicateBook(bookId) {
    const sourceBook = getBookById(bookId)
    if (!sourceBook) {
      return false
    }

    const now = new Date().toISOString()
    const newBookId = createId('book')
    const copiedName = buildCopyName(sourceBook.name, sourceBook.companyId)

    books.value.unshift({
      ...sourceBook,
      id: newBookId,
      name: copiedName,
      updatedAt: now,
      createdAt: now,
    })

    const copiedRecords = getRecordsByBookId(bookId).map((record) => ({
      ...record,
      id: createId('record'),
      bookId: newBookId,
      createdAt: now,
    }))

    records.value.unshift(...copiedRecords)
    enqueueSyncChange({
      companyId: sourceBook.companyId,
      entityType: 'book',
      entityId: newBookId,
      operation: 'copy',
    })
    addAuditLog({
      companyId: sourceBook.companyId,
      bookId: newBookId,
      entityType: 'book',
      entityId: newBookId,
      action: 'book.copy',
      after: { name: copiedName },
    })
    return true
  }

  async function duplicateBookEntry(bookId) {
    if (!shouldUseBackendCrud()) {
      lastWriteStatus.value = 'local'
      return duplicateBook(bookId)
    }
    if (!bookId) {
      return false
    }
    try {
      serverWriteInFlight.value = true
      await duplicateBookApi(bookId)
      const synced = await syncFromBackendSnapshot()
      lastWriteStatus.value = synced.ok ? 'server' : 'queued'
      return Boolean(synced.ok)
    } catch {
      lastWriteStatus.value = 'queued'
      return duplicateBook(bookId)
    } finally {
      serverWriteInFlight.value = false
    }
  }

  function deleteBook(bookId) {
    const existing = books.value.find((book) => book.id === bookId)
    books.value = books.value.filter((book) => book.id !== bookId)
    records.value = records.value.filter((record) => record.bookId !== bookId)
    if (existing) {
      enqueueSyncChange({
        companyId: existing.companyId,
        entityType: 'book',
        entityId: bookId,
        operation: 'delete',
      })
      addAuditLog({
        companyId: existing.companyId,
        bookId,
        entityType: 'book',
        entityId: bookId,
        action: 'book.delete',
        before: { name: existing.name },
      })
    }
  }

  async function removeBook(bookId) {
    if (!shouldUseBackendCrud()) {
      lastWriteStatus.value = 'local'
      deleteBook(bookId)
      return true
    }
    try {
      serverWriteInFlight.value = true
      await deleteBookApi(bookId)
      const synced = await syncFromBackendSnapshot()
      lastWriteStatus.value = synced.ok ? 'server' : 'queued'
      return Boolean(synced.ok)
    } catch {
      lastWriteStatus.value = 'queued'
      deleteBook(bookId)
      return true
    } finally {
      serverWriteInFlight.value = false
    }
  }

  function moveBookToBusiness(bookId, targetBusinessId) {
    if (!bookId || !targetBusinessId) {
      return false
    }

    const index = books.value.findIndex((book) => book.id === bookId)
    if (index < 0) {
      return false
    }

    books.value[index] = {
      ...books.value[index],
      companyId: targetBusinessId,
      updatedAt: new Date().toISOString(),
    }
    enqueueSyncChange({
      companyId: targetBusinessId,
      entityType: 'book',
      entityId: bookId,
      operation: 'move',
    })
    addAuditLog({
      companyId: targetBusinessId,
      bookId,
      entityType: 'book',
      entityId: bookId,
      action: 'book.move',
      after: { toBusinessId: targetBusinessId },
    })
    return true
  }

  async function moveBookEntry(bookId, targetBusinessId) {
    if (!shouldUseBackendCrud()) {
      lastWriteStatus.value = 'local'
      return moveBookToBusiness(bookId, targetBusinessId)
    }
    if (!bookId || !targetBusinessId) {
      return false
    }
    try {
      serverWriteInFlight.value = true
      await moveBookApi(bookId, targetBusinessId)
      const synced = await syncFromBackendSnapshot()
      lastWriteStatus.value = synced.ok ? 'server' : 'queued'
      return Boolean(synced.ok)
    } catch {
      lastWriteStatus.value = 'queued'
      return moveBookToBusiness(bookId, targetBusinessId)
    } finally {
      serverWriteInFlight.value = false
    }
  }

  function copyBookToBusiness(bookId, targetBusinessId) {
    if (!bookId || !targetBusinessId) {
      return false
    }

    const sourceBook = getBookById(bookId)
    if (!sourceBook) {
      return false
    }

    const now = new Date().toISOString()
    const copiedBookId = createId('book')
    const copiedName = buildCopyName(sourceBook.name, targetBusinessId)

    books.value.unshift({
      ...sourceBook,
      id: copiedBookId,
      companyId: targetBusinessId,
      name: copiedName,
      createdAt: now,
      updatedAt: now,
    })

    const copiedRecords = getRecordsByBookId(bookId).map((record) => ({
      ...record,
      id: createId('record'),
      bookId: copiedBookId,
      createdAt: now,
    }))
    records.value.unshift(...copiedRecords)
    enqueueSyncChange({
      companyId: targetBusinessId,
      entityType: 'book',
      entityId: copiedBookId,
      operation: 'copy',
    })
    addAuditLog({
      companyId: targetBusinessId,
      bookId: copiedBookId,
      entityType: 'book',
      entityId: copiedBookId,
      action: 'book.copy',
      after: { fromBookId: bookId, name: copiedName },
    })
    return true
  }

  async function copyBookEntry(bookId, targetBusinessId) {
    if (!shouldUseBackendCrud()) {
      lastWriteStatus.value = 'local'
      return copyBookToBusiness(bookId, targetBusinessId)
    }
    if (!bookId || !targetBusinessId) {
      return false
    }
    try {
      serverWriteInFlight.value = true
      await copyBookApi(bookId, targetBusinessId)
      const synced = await syncFromBackendSnapshot()
      lastWriteStatus.value = synced.ok ? 'server' : 'queued'
      return Boolean(synced.ok)
    } catch {
      lastWriteStatus.value = 'queued'
      return copyBookToBusiness(bookId, targetBusinessId)
    } finally {
      serverWriteInFlight.value = false
    }
  }

  function setPendingRecordTransferIds(recordIds) {
    pendingRecordTransferIds.value = Array.isArray(recordIds) ? [...recordIds] : []
  }

  function clearPendingRecordTransferIds() {
    pendingRecordTransferIds.value = []
  }

  function getBookById(bookId) {
    return books.value.find((book) => book.id === bookId) ?? null
  }

  function getRecordsByBookId(bookId) {
    return records.value
      .filter((record) => record.bookId === bookId)
      .sort((a, b) => parseRecordMoment(b) - parseRecordMoment(a))
  }

  function getBookSummary(bookId) {
    const bookRecords = getRecordsByBookId(bookId)
    const cashIn = bookRecords
      .filter((record) => record.type === 'income')
      .reduce((sum, record) => sum + record.amount, 0)
    const cashOut = bookRecords
      .filter((record) => record.type === 'expense')
      .reduce((sum, record) => sum + record.amount, 0)

    return {
      cashIn,
      cashOut,
      balance: cashIn - cashOut,
    }
  }

  function getAuditLogsByBookId(bookId) {
    return auditLogs.value.filter((log) => log.bookId === bookId)
  }

  async function syncFromBackendSnapshot() {
    if (!isBackendConfigured() || !hasAuthSession()) {
      return { ok: false, reason: 'backend_not_ready' }
    }

    const hasLocalUnsyncedChanges = syncQueue.value.some(
      (item) => item.status === 'pending' || item.status === 'failed',
    )
    if (hasLocalUnsyncedChanges) {
      // Avoid overriding newer offline changes with an older server snapshot.
      return { ok: false, reason: 'local_unsynced_changes' }
    }

    try {
      const snapshot = await fetchTenantSnapshot()
      const nextBooks = Array.isArray(snapshot?.books)
        ? snapshot.books.map((item) => ({
            id: item.id,
            companyId: item.business_id,
            name: item.name || 'Book',
            currency: item.currency || 'UGX',
            createdAt: item.created_at || new Date().toISOString(),
            updatedAt: item.updated_at || item.created_at || new Date().toISOString(),
          }))
        : []

      const nextRecords = Array.isArray(snapshot?.records)
        ? snapshot.records.map((item) => ({
            id: item.id,
            bookId: item.book_id,
            type: item.type || 'expense',
            amount: Number(item.amount || 0),
            note: item.note || 'No remark',
            contact: item.contact || '',
            category: item.category || '',
            paymentMode: item.payment_mode || 'Cash',
            date: item.date || new Date().toISOString().slice(0, 10),
            time: item.time || '00:00',
            attachments: Array.isArray(item.attachments) ? item.attachments : [],
            createdAt: item.created_at || new Date().toISOString(),
          }))
        : []

      books.value = nextBooks
      records.value = nextRecords
      lastSyncedAt.value = new Date().toISOString()
      return { ok: true }
    } catch (error) {
      return {
        ok: false,
        reason: error instanceof Error ? error.message : 'Could not sync snapshot',
      }
    }
  }

  watch(
    [books, records, syncQueue, auditLogs, lastSyncedAt],
    ([booksValue, recordsValue, syncQueueValue, auditLogsValue, lastSyncedAtValue]) => {
      persistState(booksValue, recordsValue, syncQueueValue, auditLogsValue, lastSyncedAtValue)
    },
    { deep: true },
  )

  return {
    books,
    records,
    bookCount,
    totalBalance,
    syncQueue,
    syncSummary,
    failedSyncItems,
    isOnline,
    lastSyncedAt,
    getEntitySyncStatus,
    retryFailedSyncItems,
    processSyncQueue,
    resolveSyncConflict,
    auditLogs,
    getAuditLogsByBookId,
    syncFromBackendSnapshot,
    addBook,
    addRecord,
    getRecordById,
    updateRecord,
    deleteRecordsByIds,
    moveRecordsToBook,
    copyRecordsToBooks,
    renameBook,
    duplicateBook,
    deleteBook,
    moveBookToBusiness,
    copyBookToBusiness,
    pendingRecordTransferIds,
    setPendingRecordTransferIds,
    clearPendingRecordTransferIds,
    getBookById,
    getRecordsByBookId,
    getBookSummary,
    shouldUseBackendCrud,
    createBook,
    createRecord,
    editRecord,
    removeRecords,
    renameBookEntry,
    removeBook,
    serverWriteInFlight,
    moveRecords,
    copyRecords,
    duplicateBookEntry,
    moveBookEntry,
    copyBookEntry,
    lastWriteStatus,
  }
})
