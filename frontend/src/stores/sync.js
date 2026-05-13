import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { postSyncBatch, isBackendConfigured, hasAuthSession } from '../services/api'
import { createId } from '../utils/helpers'

export const useSyncStore = defineStore('sync', () => {
  const syncQueue = ref([])
  const syncInFlight = ref(false)
  const lastSyncedAt = ref('')

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

  async function processSyncQueue(books = [], records = []) {
    if (syncInFlight.value || !isBackendConfigured() || !hasAuthSession()) return

    const pendingItems = syncQueue.value.filter((item) => item.status === 'pending')
    if (!pendingItems.length) return

    syncInFlight.value = true
    const now = new Date().toISOString()

    try {
      const payload = pendingItems.map((item) => {
        let itemPayload = {}
        if (item.entityType === 'book') {
          itemPayload = { book: books.find((b) => b.id === item.entityId) || null }
        } else if (item.entityType === 'record') {
          itemPayload = { record: records.find((r) => r.id === item.entityId) || null }
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
