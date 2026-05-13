import { ref, computed, watch } from 'vue'
import { defineStore } from 'pinia'
import { postSyncBatch, isBackendConfigured, hasAuthSession } from '../services/api'
import { createId } from '../utils/helpers'
import { useBooksStore } from './books'
import { useRecordsStore } from './records'

const STORAGE_KEY_V1 = 'hebo.books.v1'
const STORAGE_KEY_V2 = 'hebo.sync.v2'

function readPersistedState() {
  if (typeof window === 'undefined') return null
  try {
    const v2 = localStorage.getItem(STORAGE_KEY_V2)
    if (v2) return JSON.parse(v2)

    const v1 = localStorage.getItem(STORAGE_KEY_V1)
    if (v1) {
      const parsed = JSON.parse(v1)
      return {
        syncQueue: parsed.syncQueue || [],
        lastSyncedAt: parsed.lastSyncedAt || '',
      }
    }
  } catch {
    return null
  }
  return null
}

export const useSyncStore = defineStore('sync', () => {
  const persisted = readPersistedState()
  const syncQueue = ref(persisted?.syncQueue || [])
  const syncInFlight = ref(false)
  const lastSyncedAt = ref(persisted?.lastSyncedAt || '')

  const syncSummary = computed(() => ({
    pending: syncQueue.value.filter((item) => item.status === 'pending').length,
    synced: syncQueue.value.filter((item) => item.status === 'synced').length,
    failed: syncQueue.value.filter((item) => item.status === 'failed').length,
  }))

  const failedSyncItems = computed(() =>
    syncQueue.value.filter((item) => item.status === 'failed'),
  )

  function getEntitySyncStatus(entityType, entityId) {
    if (!entityType || !entityId) return 'none'
    const related = syncQueue.value.filter(
      (item) => item.entityType === entityType && item.entityId === entityId,
    )
    if (!related.length) return 'none'
    if (related.some((item) => item.status === 'failed')) return 'failed'
    if (related.some((item) => item.status === 'pending')) return 'pending'
    if (related.some((item) => item.status === 'synced')) return 'synced'
    return 'none'
  }

  function enqueueSyncChange(change, processNow = true) {
    syncQueue.value.unshift({
      id: createId('sync'),
      status: 'pending',
      createdAt: new Date().toISOString(),
      ...change,
    })
    if (processNow) void processSyncQueue()
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
    if (index < 0) return false
    const current = syncQueue.value[index]
    if (current.status !== 'failed') return false

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

  async function processSyncQueue() {
    if (syncInFlight.value || !isBackendConfigured() || !hasAuthSession()) return

    const pendingItems = syncQueue.value.filter((item) => item.status === 'pending')
    if (!pendingItems.length) return

    syncInFlight.value = true
    const now = new Date().toISOString()

    try {
      const booksStore = useBooksStore()
      const recordsStore = useRecordsStore()

      const payload = pendingItems.map((item) => {
        let itemPayload = {}
        if (item.entityType === 'book') {
          itemPayload = { book: booksStore.books.find((b) => b.id === item.entityId) || null }
        } else if (item.entityType === 'record') {
          itemPayload = { record: recordsStore.records.find((r) => r.id === item.entityId) || null }
        }

        return {
          syncId: item.id,
          companyId: item.companyId || '',
          bookId: item.bookId || '',
          entityType: item.entityType,
          entityId: item.entityId,
          operation: item.operation,
          payload: itemPayload,
        }
      })

      const response = await postSyncBatch(payload)
      const resultMap = new Map(
        Array.isArray(response?.results)
          ? response.results.map((result) => [result.syncId, result])
          : [],
      )

      let syncedAny = false
      syncQueue.value = syncQueue.value.map((item) => {
        if (item.status !== 'pending') return item
        const result = resultMap.get(item.id)
        if (!result) {
          return { ...item, status: 'failed', failedReason: 'Missing sync result from server', failedAt: now }
        }
        if (result.status === 'synced') {
          syncedAny = true
          return { ...item, status: 'synced', syncedAt: now, failedReason: '', failedAt: '' }
        }
        return { ...item, status: 'failed', failedReason: result.error || 'Sync failed', failedAt: now }
      })

      if (syncedAny) lastSyncedAt.value = now
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Network sync failed'
      const networkLikeError = /failed to fetch|network|timeout|backend api is not configured/i.test(message)
      syncQueue.value = syncQueue.value.map((item) =>
        item.status === 'pending'
          ? { ...item, status: networkLikeError ? 'pending' : 'failed', failedReason: message, failedAt: networkLikeError ? '' : now }
          : item
      )
    } finally {
      syncInFlight.value = false
    }
  }

  watch([syncQueue, lastSyncedAt], () => {
    localStorage.setItem(STORAGE_KEY_V2, JSON.stringify({
      syncQueue: syncQueue.value,
      lastSyncedAt: lastSyncedAt.value,
    }))
  }, { deep: true })

  return {
    syncQueue,
    syncInFlight,
    lastSyncedAt,
    syncSummary,
    failedSyncItems,
    getEntitySyncStatus,
    enqueueSyncChange,
    processSyncQueue,
    retryFailedSyncItems,
    resolveSyncConflict,
  }
})
