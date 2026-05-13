import { ref, computed, watch } from 'vue'
import { defineStore } from 'pinia'
import { useSyncStore } from './sync'
import { useRecordsStore } from './records'
import {
  copyBookApi,
  createBookApi,
  deleteBookApi,
  duplicateBookApi,
  fetchTenantSnapshot,
  hasAuthSession,
  isBackendConfigured,
  moveBookApi,
  updateBookApi,
} from '../services/api'
import { createId, normalizeName } from '../utils/helpers'

const STORAGE_KEY_V1 = 'hebo.books.v1'
const STORAGE_KEY_V2 = 'hebo.books.v2'

function readPersistedState() {
  if (typeof window === 'undefined') return null
  try {
    const v2 = localStorage.getItem(STORAGE_KEY_V2)
    if (v2) return JSON.parse(v2)

    const v1 = localStorage.getItem(STORAGE_KEY_V1)
    if (v1) {
      const parsed = JSON.parse(v1)
      return {
        books: parsed.books || [],
        auditLogs: parsed.auditLogs || [],
      }
    }
  } catch {
    return null
  }
  return null
}

export const useBooksStore = defineStore('books', () => {
  const syncStore = useSyncStore()
  const recordsStore = useRecordsStore()

  const persisted = readPersistedState()
  const books = ref(persisted?.books || [])
  const auditLogs = ref(persisted?.auditLogs || [])
  const isOnline = ref(typeof navigator === 'undefined' ? true : navigator.onLine)
  const serverWriteInFlight = ref(false)
  const lastWriteStatus = ref('idle')

  const bookCount = computed(() => books.value.length)

  function addAuditLog(event) {
    auditLogs.value.unshift({
      id: createId('audit'),
      createdAt: new Date().toISOString(),
      ...event,
    })
  }

  function shouldUseBackendCrud() {
    return isOnline.value && isBackendConfigured() && hasAuthSession()
  }

  function getBookById(bookId) {
    return books.value.find((book) => book.id === bookId) ?? null
  }

  function findBookByNormalizedName(name, companyId, ignoreBookId = '') {
    const target = normalizeName(name)
    if (!target) return null
    return books.value.find((book) => {
      if (ignoreBookId && book.id === ignoreBookId) return false
      return (book.companyId || 'company-001') === (companyId || 'company-001') &&
             normalizeName(book.name) === target
    }) ?? null
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
    if (!name) return false
    const companyId = payload.companyId ?? 'company-001'
    if (findBookByNormalizedName(name, companyId)) return false

    const now = new Date().toISOString()
    const newBook = {
      id: createId('book'),
      companyId,
      name,
      currency: payload.currency ?? 'UGX',
      updatedAt: now,
      createdAt: now,
    }
    books.value.unshift(newBook)

    syncStore.enqueueSyncChange({
      companyId,
      entityType: 'book',
      entityId: newBook.id,
      operation: 'create',
    })
    addAuditLog({
      companyId,
      bookId: newBook.id,
      entityType: 'book',
      entityId: newBook.id,
      action: 'book.create',
      after: { name: newBook.name, currency: newBook.currency },
    })
    return true
  }

  async function createBook(payload) {
    if (!shouldUseBackendCrud()) {
      lastWriteStatus.value = 'local'
      return addBook(payload)
    }
    try {
      serverWriteInFlight.value = true
      await createBookApi({
        businessId: payload.companyId,
        name: payload.name,
        currency: payload.currency || 'UGX',
      })
      await syncFromBackendSnapshot()
      lastWriteStatus.value = 'server'
      return true
    } catch {
      lastWriteStatus.value = 'queued'
      return addBook(payload)
    } finally {
      serverWriteInFlight.value = false
    }
  }

  async function renameBookEntry(bookId, name) {
    const trimmed = (name || '').trim()
    if (!trimmed) return false

    if (!shouldUseBackendCrud()) {
      const index = books.value.findIndex(b => b.id === bookId)
      if (index < 0) return false
      books.value[index].name = trimmed
      books.value[index].updatedAt = new Date().toISOString()
      syncStore.enqueueSyncChange({
        companyId: books.value[index].companyId,
        entityType: 'book',
        entityId: bookId,
        operation: 'update',
      })
      return true
    }

    try {
      serverWriteInFlight.value = true
      await updateBookApi(bookId, { name: trimmed })
      await syncFromBackendSnapshot()
      lastWriteStatus.value = 'server'
      return true
    } catch {
      lastWriteStatus.value = 'queued'
      return false
    } finally {
      serverWriteInFlight.value = false
    }
  }

  async function removeBook(bookId) {
    if (!shouldUseBackendCrud()) {
      const existing = books.value.find(b => b.id === bookId)
      if (!existing) return false
      books.value = books.value.filter(b => b.id !== bookId)
      syncStore.enqueueSyncChange({
        companyId: existing.companyId,
        entityType: 'book',
        entityId: bookId,
        operation: 'delete',
      })
      return true
    }
    try {
      serverWriteInFlight.value = true
      await deleteBookApi(bookId)
      await syncFromBackendSnapshot()
      lastWriteStatus.value = 'server'
      return true
    } catch {
      lastWriteStatus.value = 'queued'
      return false
    } finally {
      serverWriteInFlight.value = false
    }
  }

  async function duplicateBookEntry(bookId) {
    if (!shouldUseBackendCrud()) {
      const source = getBookById(bookId)
      if (!source) return false
      const newBookId = createId('book')
      const copiedName = buildCopyName(source.name, source.companyId)
      const now = new Date().toISOString()
      books.value.unshift({ ...source, id: newBookId, name: copiedName, createdAt: now, updatedAt: now })
      const bookRecords = recordsStore.getRecordsByBookId(bookId)
      bookRecords.forEach(r => {
        recordsStore.records.unshift({ ...r, id: createId('record'), bookId: newBookId, createdAt: now })
      })
      syncStore.enqueueSyncChange({ companyId: source.companyId, entityType: 'book', entityId: newBookId, operation: 'copy' })
      return true
    }
    try {
      serverWriteInFlight.value = true
      await duplicateBookApi(bookId)
      await syncFromBackendSnapshot()
      lastWriteStatus.value = 'server'
      return true
    } catch {
      lastWriteStatus.value = 'queued'
      return false
    } finally {
      serverWriteInFlight.value = false
    }
  }

  function getBookSummary(bookId) {
    const bookRecords = recordsStore.getRecordsByBookId(bookId)
    const cashIn = bookRecords.filter(r => r.type === 'income').reduce((s, r) => s + r.amount, 0)
    const cashOut = bookRecords.filter(r => r.type === 'expense').reduce((s, r) => s + r.amount, 0)
    return { cashIn, cashOut, balance: cashIn - cashOut }
  }

  async function syncFromBackendSnapshot() {
    if (!isBackendConfigured() || !hasAuthSession()) return { ok: false }
    const hasLocalUnsyncedChanges = syncStore.syncQueue.some(
      (item) => item.status === 'pending' || item.status === 'failed',
    )
    if (hasLocalUnsyncedChanges) return { ok: false, reason: 'local_unsynced_changes' }

    try {
      const snapshot = await fetchTenantSnapshot()
      books.value = (snapshot?.books || []).map(b => ({
        id: b.id,
        companyId: b.business_id,
        name: b.name,
        currency: b.currency,
        createdAt: b.created_at,
        updatedAt: b.updated_at,
      }))
      recordsStore.setRecords((snapshot?.records || []).map(r => ({
        id: r.id,
        bookId: r.book_id,
        type: r.type,
        amount: Number(r.amount),
        note: r.note,
        contact: r.contact,
        category: r.category,
        paymentMode: r.payment_mode,
        date: r.date,
        time: r.time,
        attachments: r.attachments,
        createdAt: r.created_at,
      })))
      syncStore.lastSyncedAt = new Date().toISOString()
      return { ok: true }
    } catch (error) {
      return { ok: false, error }
    }
  }

  watch([books, auditLogs], () => {
    localStorage.setItem(STORAGE_KEY_V2, JSON.stringify({
      books: books.value,
      auditLogs: auditLogs.value,
    }))
  }, { deep: true })

  return {
    books,
    auditLogs,
    isOnline,
    bookCount,
    createBook,
    renameBookEntry,
    removeBook,
    duplicateBookEntry,
    syncFromBackendSnapshot,
    getBookById,
    getBookSummary,
    lastWriteStatus,
    serverWriteInFlight,
    shouldUseBackendCrud,
  }
})
