import { ref } from 'vue'
import { defineStore } from 'pinia'
import { useSyncStore } from './sync'
import {
  createRecordApi,
  updateRecordApi,
  deleteRecordsBulkApi,
  moveRecordsApi,
  copyRecordsApi,
} from '../services/api'
import { createId, parseRecordMoment } from '../utils/helpers'

export const useRecordsStore = defineStore('records', () => {
  const syncStore = useSyncStore()
  const records = ref([])

  function setRecords(newRecords) {
    records.value = newRecords
  }

  function getRecordById(recordId) {
    return records.value.find((record) => record.id === recordId) ?? null
  }

  function getRecordsByBookId(bookId) {
    return records.value
      .filter((record) => record.bookId === bookId)
      .sort((a, b) => parseRecordMoment(b) - parseRecordMoment(a))
  }

  function addRecord(payload, companyId) {
    const amount = Number(payload.amount)
    if (!payload.bookId || !payload.type || !amount || amount <= 0) return false

    const now = new Date().toISOString()
    const newRecord = {
      id: createId('record'),
      bookId: payload.bookId,
      type: payload.type,
      amount,
      note: payload.note?.trim() || 'No remark',
      contact: payload.contact?.trim() || '',
      category: payload.category?.trim() || '',
      paymentMode: payload.paymentMode || 'Cash',
      date: payload.date || now.slice(0, 10),
      time: payload.time || now.slice(11, 16),
      attachments: Array.isArray(payload.attachments) ? payload.attachments : [],
      createdAt: now,
    }
    records.value.unshift(newRecord)

    syncStore.enqueueSyncChange({
      companyId: companyId || 'company-001',
      bookId: payload.bookId,
      entityType: 'record',
      entityId: newRecord.id,
      operation: 'create',
    })

    return newRecord
  }

  async function createRecord(payload, companyId, shouldUseBackend) {
    if (!shouldUseBackend) return addRecord(payload, companyId)

    try {
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
      return true
    } catch {
      return addRecord(payload, companyId)
    }
  }

  function updateRecord(recordId, payload, companyId) {
    const index = records.value.findIndex((r) => r.id === recordId)
    if (index < 0) return false

    const amount = Number(payload.amount)
    if (!amount || amount <= 0) return false

    const updated = {
      ...records.value[index],
      ...payload,
      amount,
      updatedAt: new Date().toISOString(),
    }
    records.value[index] = updated

    syncStore.enqueueSyncChange({
      companyId: companyId || 'company-001',
      bookId: updated.bookId,
      entityType: 'record',
      entityId: updated.id,
      operation: 'update',
    })
    return true
  }

  async function editRecord(recordId, payload, companyId, shouldUseBackend) {
    if (!shouldUseBackend) return updateRecord(recordId, payload, companyId)
    try {
      await updateRecordApi(recordId, payload)
      return true
    } catch {
      return updateRecord(recordId, payload, companyId)
    }
  }

  function deleteRecordsByIds(recordIds, companyId) {
    const idSet = new Set(recordIds)
    const removed = records.value.filter(r => idSet.has(r.id))
    records.value = records.value.filter(r => !idSet.has(r.id))

    removed.forEach(r => {
      syncStore.enqueueSyncChange({
        companyId: companyId || 'company-001',
        bookId: r.bookId,
        entityType: 'record',
        entityId: r.id,
        operation: 'delete',
      })
    })
    return removed.length
  }

  async function removeRecords(recordIds, companyId, shouldUseBackend) {
    if (!shouldUseBackend) return deleteRecordsByIds(recordIds, companyId)
    try {
      const resp = await deleteRecordsBulkApi(recordIds)
      return resp.deletedCount
    } catch {
      return deleteRecordsByIds(recordIds, companyId)
    }
  }

  return {
    records,
    setRecords,
    getRecordById,
    getRecordsByBookId,
    createRecord,
    editRecord,
    removeRecords,
  }
})
