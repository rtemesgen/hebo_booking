const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').trim()
const ACCESS_TOKEN_KEY = 'hebo.auth.accessToken.v1'

function getAccessToken() {
  if (typeof window === 'undefined') {
    return ''
  }
  return window.localStorage.getItem(ACCESS_TOKEN_KEY) || ''
}

function withAuthHeaders(headers = {}) {
  const token = getAccessToken()
  if (!token) {
    return headers
  }
  return {
    ...headers,
    Authorization: `Bearer ${token}`,
  }
}

export function isBackendConfigured() {
  return Boolean(API_BASE_URL)
}

export function hasAuthSession() {
  return Boolean(getAccessToken())
}

export function clearAuthSession() {
  if (typeof window === 'undefined') {
    return
  }
  window.localStorage.removeItem(ACCESS_TOKEN_KEY)
}

export async function postSyncBatch(changes) {
  if (!isBackendConfigured()) {
    throw new Error('Backend API is not configured')
  }

  const response = await fetch(`${API_BASE_URL}/api/sync/batch`, {
    method: 'POST',
    headers: withAuthHeaders({
      'Content-Type': 'application/json',
    }),
    body: JSON.stringify({ changes }),
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data?.message || 'Sync request failed')
  }

  return data
}

export async function registerUser(payload) {
  if (!isBackendConfigured()) {
    throw new Error('Backend API is not configured')
  }

  const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data?.message || 'Registration failed')
  }

  if (typeof window !== 'undefined' && data?.accessToken) {
    window.localStorage.setItem(ACCESS_TOKEN_KEY, data.accessToken)
  }
  return data
}

export async function loginUser(payload) {
  if (!isBackendConfigured()) {
    throw new Error('Backend API is not configured')
  }

  const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data?.message || 'Login failed')
  }

  if (typeof window !== 'undefined' && data?.accessToken) {
    window.localStorage.setItem(ACCESS_TOKEN_KEY, data.accessToken)
  }
  return data
}

export async function fetchTenantBusinesses() {
  if (!isBackendConfigured()) {
    throw new Error('Backend API is not configured')
  }

  const response = await fetch(`${API_BASE_URL}/api/tenant/businesses`, {
    method: 'GET',
    headers: withAuthHeaders(),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data?.message || 'Could not fetch businesses')
  }
  return data
}

export async function createTenantBusiness(payload) {
  if (!isBackendConfigured()) {
    throw new Error('Backend API is not configured')
  }

  const response = await fetch(`${API_BASE_URL}/api/tenant/businesses`, {
    method: 'POST',
    headers: withAuthHeaders({
      'Content-Type': 'application/json',
    }),
    body: JSON.stringify(payload),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data?.message || 'Could not create business')
  }
  return data
}

export async function fetchTenantSnapshot() {
  if (!isBackendConfigured()) {
    throw new Error('Backend API is not configured')
  }

  const response = await fetch(`${API_BASE_URL}/api/data/snapshot`, {
    method: 'GET',
    headers: withAuthHeaders(),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data?.message || 'Could not fetch tenant snapshot')
  }
  return data
}

export async function createBookApi(payload) {
  if (!isBackendConfigured()) {
    throw new Error('Backend API is not configured')
  }
  const response = await fetch(`${API_BASE_URL}/api/books`, {
    method: 'POST',
    headers: withAuthHeaders({
      'Content-Type': 'application/json',
    }),
    body: JSON.stringify(payload),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data?.message || 'Could not create book')
  }
  return data
}

export async function updateBookApi(bookId, payload) {
  if (!isBackendConfigured()) {
    throw new Error('Backend API is not configured')
  }
  const response = await fetch(`${API_BASE_URL}/api/books/${bookId}`, {
    method: 'PATCH',
    headers: withAuthHeaders({
      'Content-Type': 'application/json',
    }),
    body: JSON.stringify(payload),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data?.message || 'Could not update book')
  }
  return data
}

export async function deleteBookApi(bookId) {
  if (!isBackendConfigured()) {
    throw new Error('Backend API is not configured')
  }
  const response = await fetch(`${API_BASE_URL}/api/books/${bookId}`, {
    method: 'DELETE',
    headers: withAuthHeaders(),
  })
  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    throw new Error(data?.message || 'Could not delete book')
  }
  return true
}

export async function createRecordApi(payload) {
  if (!isBackendConfigured()) {
    throw new Error('Backend API is not configured')
  }
  const response = await fetch(`${API_BASE_URL}/api/records`, {
    method: 'POST',
    headers: withAuthHeaders({
      'Content-Type': 'application/json',
    }),
    body: JSON.stringify(payload),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data?.message || 'Could not create record')
  }
  return data
}

export async function updateRecordApi(recordId, payload) {
  if (!isBackendConfigured()) {
    throw new Error('Backend API is not configured')
  }
  const response = await fetch(`${API_BASE_URL}/api/records/${recordId}`, {
    method: 'PATCH',
    headers: withAuthHeaders({
      'Content-Type': 'application/json',
    }),
    body: JSON.stringify(payload),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data?.message || 'Could not update record')
  }
  return data
}

export async function deleteRecordsBulkApi(ids) {
  if (!isBackendConfigured()) {
    throw new Error('Backend API is not configured')
  }
  const response = await fetch(`${API_BASE_URL}/api/records/bulk-delete`, {
    method: 'POST',
    headers: withAuthHeaders({
      'Content-Type': 'application/json',
    }),
    body: JSON.stringify({ ids }),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data?.message || 'Could not delete records')
  }
  return data
}

export async function duplicateBookApi(bookId) {
  if (!isBackendConfigured()) {
    throw new Error('Backend API is not configured')
  }
  const response = await fetch(`${API_BASE_URL}/api/books/${bookId}/duplicate`, {
    method: 'POST',
    headers: withAuthHeaders(),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data?.message || 'Could not duplicate book')
  }
  return data
}

export async function moveBookApi(bookId, targetBusinessId) {
  if (!isBackendConfigured()) {
    throw new Error('Backend API is not configured')
  }
  const response = await fetch(`${API_BASE_URL}/api/books/${bookId}/move`, {
    method: 'POST',
    headers: withAuthHeaders({
      'Content-Type': 'application/json',
    }),
    body: JSON.stringify({ targetBusinessId }),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data?.message || 'Could not move book')
  }
  return data
}

export async function copyBookApi(bookId, targetBusinessId) {
  if (!isBackendConfigured()) {
    throw new Error('Backend API is not configured')
  }
  const response = await fetch(`${API_BASE_URL}/api/books/${bookId}/copy`, {
    method: 'POST',
    headers: withAuthHeaders({
      'Content-Type': 'application/json',
    }),
    body: JSON.stringify({ targetBusinessId }),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data?.message || 'Could not copy book')
  }
  return data
}

export async function moveRecordsApi(recordIds, targetBookId) {
  if (!isBackendConfigured()) {
    throw new Error('Backend API is not configured')
  }
  const response = await fetch(`${API_BASE_URL}/api/records/move`, {
    method: 'POST',
    headers: withAuthHeaders({
      'Content-Type': 'application/json',
    }),
    body: JSON.stringify({ recordIds, targetBookId }),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data?.message || 'Could not move records')
  }
  return data
}

export async function copyRecordsApi(recordIds, targetBookIds) {
  if (!isBackendConfigured()) {
    throw new Error('Backend API is not configured')
  }
  const response = await fetch(`${API_BASE_URL}/api/records/copy`, {
    method: 'POST',
    headers: withAuthHeaders({
      'Content-Type': 'application/json',
    }),
    body: JSON.stringify({ recordIds, targetBookIds }),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data?.message || 'Could not copy records')
  }
  return data
}
