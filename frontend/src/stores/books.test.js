
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useBooksStore } from './books'

describe('Books Store Optimization', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    // Mock localStorage
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    })
  })

  it('calculates totalBalance correctly in $O(R)$ pass', () => {
    const store = useBooksStore()
    store.records = [
      { id: 'r1', bookId: 'b1', type: 'income', amount: 100 },
      { id: 'r2', bookId: 'b1', type: 'expense', amount: 40 },
      { id: 'r3', bookId: 'b2', type: 'income', amount: 200 },
    ]
    expect(store.totalBalance).toBe(260)
  })

  it('calculates getBookSummary correctly using pre-computed Map', () => {
    const store = useBooksStore()
    store.records = [
      { id: 'r1', bookId: 'b1', type: 'income', amount: 100 },
      { id: 'r2', bookId: 'b1', type: 'expense', amount: 40 },
      { id: 'r3', bookId: 'b2', type: 'income', amount: 200 },
    ]
    const summaryB1 = store.getBookSummary('b1')
    expect(summaryB1).toEqual({
      cashIn: 100,
      cashOut: 40,
      balance: 60
    })

    const summaryB2 = store.getBookSummary('b2')
    expect(summaryB2).toEqual({
      cashIn: 200,
      cashOut: 0,
      balance: 200
    })
  })

  it('returns sorted records in getRecordsByBookId', () => {
    const store = useBooksStore()
    store.records = [
      { id: 'r1', bookId: 'b1', type: 'income', amount: 100, date: '2023-01-01', time: '10:00' },
      { id: 'r2', bookId: 'b1', type: 'expense', amount: 40, date: '2023-01-01', time: '11:00' },
    ]
    const records = store.getRecordsByBookId('b1')
    expect(records[0].id).toBe('r2') // r2 is later than r1
    expect(records[1].id).toBe('r1')
  })
})
