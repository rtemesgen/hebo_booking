<template>
  <main class="mx-auto grid w-full max-w-[430px] gap-3 px-2.5 pb-4 pt-2.5">
    <header class="flex items-center gap-2">
      <RouterLink class="grid h-9 w-9 place-items-center rounded-xl border border-[#6553281f] bg-[#fffdfa] text-[#2f3352] no-underline" to="/">
        &larr;
      </RouterLink>
      <div>
        <h1 class="m-0 text-[1rem]">Backup & Restore</h1>
        <p class="m-0 text-[0.74rem] text-[#7a715f]">Export or restore local offline data.</p>
      </div>
    </header>

    <section class="rounded-xl border border-[#6553281f] bg-[rgba(255,252,244,0.9)] p-3">
      <h2 class="m-0 mb-2 text-[0.9rem]">Export backup</h2>
      <p class="m-0 text-[0.76rem] text-[#7a715f]">Downloads a JSON snapshot of books, businesses, members, and sync state.</p>
      <button
        class="mt-2 rounded-full border-0 bg-[linear-gradient(135deg,#14532d,#1f7a45)] px-3.5 py-2 text-[0.78rem] font-bold text-[#fff8ea]"
        type="button"
        @click="exportBackup"
      >
        Export Backup
      </button>
    </section>

    <section class="rounded-xl border border-[#6553281f] bg-[rgba(255,252,244,0.9)] p-3">
      <h2 class="m-0 mb-2 text-[0.9rem]">Import backup</h2>
      <p class="m-0 text-[0.76rem] text-[#7a715f]">
        Restores a JSON backup and replaces current local data on this device.
      </p>
      <input class="mt-2 block w-full text-[0.78rem]" type="file" accept="application/json,.json" @change="importBackup" />
    </section>
  </main>
</template>

<script setup>
import { useToast } from 'vue-toastification'

const toast = useToast()

const STORAGE_KEYS = [
  'hebo.books.v1',
  'hebo.businesses.v1',
  'hebo.businesses.selected.v1',
  'hebo.businesses.members.v1',
  'hebo.onboarding.completed.v1',
  'hebo.cleanup.demoData.v1',
  'hebo.auth.accessToken.v1',
]

function exportBackup() {
  const payload = {
    exportedAt: new Date().toISOString(),
    schemaVersion: 1,
    data: Object.fromEntries(
      STORAGE_KEYS.map((key) => [key, window.localStorage.getItem(key)]),
    ),
  }

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `hebo-backup-${Date.now()}.json`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
  toast.success('Backup exported')
}

async function importBackup(event) {
  const file = event.target.files?.[0]
  if (!file) {
    return
  }

  try {
    const text = await file.text()
    const parsed = JSON.parse(text)
    if (!parsed?.data || typeof parsed.data !== 'object') {
      toast.error('Invalid backup file')
      return
    }

    for (const key of STORAGE_KEYS) {
      const value = parsed.data[key]
      if (typeof value === 'string') {
        window.localStorage.setItem(key, value)
      } else {
        window.localStorage.removeItem(key)
      }
    }

    toast.success('Backup restored. Reloading...')
    setTimeout(() => window.location.reload(), 400)
  } catch {
    toast.error('Could not import backup')
  } finally {
    event.target.value = ''
  }
}
</script>
