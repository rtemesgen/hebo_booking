const DB_NAME = 'hebo-attachments'
const DB_VERSION = 1
const STORE_NAME = 'files'

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error || new Error('Could not open attachment storage'))
  })
}

export async function saveAttachmentBlob(file) {
  const db = await openDb()
  const id =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? `att-${crypto.randomUUID()}`
      : `att-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).put({
      id,
      blob: file,
      name: file.name,
      type: file.type || 'application/octet-stream',
      size: file.size,
      createdAt: new Date().toISOString(),
    })
    tx.oncomplete = () => resolve(id)
    tx.onerror = () => reject(tx.error || new Error('Could not save attachment'))
  })
}

export async function getAttachmentBlob(id) {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const request = tx.objectStore(STORE_NAME).get(id)
    request.onsuccess = () => resolve(request.result || null)
    request.onerror = () => reject(request.error || new Error('Could not load attachment'))
  })
}

export async function deleteAttachmentBlob(id) {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).delete(id)
    tx.oncomplete = () => resolve(true)
    tx.onerror = () => reject(tx.error || new Error('Could not delete attachment'))
  })
}
