import { describe, expect, it } from 'vitest'
import { hasMeaningfulTenantDataFromStorage } from './onboarding'

describe('onboarding tenant data detection', () => {
  it('returns false for empty or invalid storage payload', () => {
    expect(hasMeaningfulTenantDataFromStorage('')).toBe(false)
    expect(hasMeaningfulTenantDataFromStorage('not-json')).toBe(false)
    expect(hasMeaningfulTenantDataFromStorage('{}')).toBe(false)
    expect(hasMeaningfulTenantDataFromStorage('[]')).toBe(false)
  })

  it('returns false for untouched default business', () => {
    const payload = JSON.stringify([{ name: 'My Business', email: '', phone: '' }])
    expect(hasMeaningfulTenantDataFromStorage(payload)).toBe(false)
  })

  it('returns true when user has meaningful business data', () => {
    const oneCustomized = JSON.stringify([{ name: 'North Branch', email: '', phone: '' }])
    const twoBusinesses = JSON.stringify([
      { name: 'My Business', email: '', phone: '' },
      { name: 'Second Store', email: '', phone: '' },
    ])
    expect(hasMeaningfulTenantDataFromStorage(oneCustomized)).toBe(true)
    expect(hasMeaningfulTenantDataFromStorage(twoBusinesses)).toBe(true)
  })
})
