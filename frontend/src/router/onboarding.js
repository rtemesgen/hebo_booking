export const ONBOARDING_KEY = 'hebo.onboarding.completed.v1'
export const BUSINESSES_KEY = 'hebo.businesses.v1'

export function hasMeaningfulTenantDataFromStorage(storageValue) {
  if (!storageValue) {
    return false
  }

  let parsed
  try {
    parsed = JSON.parse(storageValue)
  } catch {
    return false
  }

  if (!Array.isArray(parsed) || !parsed.length) {
    return false
  }

  if (parsed.length > 1) {
    return true
  }

  const first = parsed[0] || {}
  const name = (first.name || '').trim()
  return name !== 'My Business' || Boolean(first.email) || Boolean(first.phone)
}

export function hasMeaningfulTenantData(storage) {
  if (!storage) {
    return false
  }
  const raw = storage.getItem(BUSINESSES_KEY)
  return hasMeaningfulTenantDataFromStorage(raw)
}
