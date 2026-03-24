<template>
  <main class="mx-auto grid w-full max-w-[430px] gap-3 px-2.5 pb-4 pt-2.5">
    <header class="flex items-center gap-2">
      <RouterLink
        class="grid h-9 w-9 place-items-center rounded-xl border border-[#6553281f] bg-[#fffdfa] text-[#2f3352] no-underline"
        to="/"
      >
        &larr;
      </RouterLink>
      <div>
        <h1 class="m-0 text-[1rem]">Settings</h1>
        <p class="m-0 text-[0.74rem] text-[#7a715f]">Manage tenant, backups, and sync tools.</p>
      </div>
    </header>

    <section class="grid gap-2 rounded-xl border border-[#6553281f] bg-[rgba(255,252,244,0.9)] p-3">
      <div class="flex items-center justify-between gap-2">
        <p class="m-0 text-[0.84rem] font-bold text-[#342716]">
          Session: {{ sessionActive ? 'Authenticated' : 'Guest' }}
        </p>
        <span class="text-[0.72rem] text-[#7a715f]">
          API: {{ backendReady ? 'Configured' : 'Not configured' }}
        </span>
      </div>
      <div class="flex flex-wrap items-center gap-1">
        <button
          v-if="!sessionActive"
          class="rounded-full border border-[#6553281f] bg-[#fffdfa] px-3 py-1.5 text-[0.78rem] font-bold text-[#345acb]"
          type="button"
          @click="goToLogin"
        >
          Login
        </button>
        <button
          v-else
          class="rounded-full border border-[#6553281f] bg-[#fffdfa] px-3 py-1.5 text-[0.78rem] font-bold text-[#c23c37]"
          type="button"
          @click="logout"
        >
          Logout
        </button>
      </div>
    </section>

    <section class="grid gap-2 rounded-xl border border-[#6553281f] bg-[rgba(255,252,244,0.9)] p-3">
      <div class="flex items-center justify-between gap-2">
        <p class="m-0 text-[0.84rem] font-bold text-[#342716]">Sync: {{ isOnline ? 'Online' : 'Offline' }}</p>
        <p class="m-0 text-[0.7rem] text-[#7a715f]">Last sync: {{ lastSyncedAt ? formatDateTime(lastSyncedAt) : 'Not yet' }}</p>
      </div>
      <div class="flex flex-wrap items-center gap-1">
        <span class="rounded-full bg-[#eef2ff] px-2 py-0.5 text-[0.72rem] font-bold text-[#2f47ba]">Pending {{ syncSummary.pending }}</span>
        <span class="rounded-full bg-[#e9f8ee] px-2 py-0.5 text-[0.72rem] font-bold text-[#1f7a45]">Synced {{ syncSummary.synced }}</span>
        <span class="rounded-full bg-[#ffe9e7] px-2 py-0.5 text-[0.72rem] font-bold text-[#b03226]">Failed {{ syncSummary.failed }}</span>
        <button
          class="rounded-full border border-[#6553281f] bg-[#fffdfa] px-3 py-1.5 text-[0.78rem] font-bold text-[#345acb]"
          type="button"
          @click="syncNow"
        >
          Sync now
        </button>
        <button
          v-if="sessionActive && backendReady"
          class="rounded-full border border-[#6553281f] bg-[#fffdfa] px-3 py-1.5 text-[0.78rem] font-bold text-[#345acb]"
          type="button"
          @click="pullLatestSnapshot"
        >
          Refresh from server
        </button>
        <button
          v-if="syncSummary.failed"
          class="rounded-full border border-[#6553281f] bg-[#fffdfa] px-3 py-1.5 text-[0.78rem] font-bold text-[#345acb]"
          type="button"
          @click="retryFailed"
        >
          Retry failed
        </button>
      </div>
      <p class="m-0 text-[0.74rem] text-[#7a715f]">
        Businesses: <strong class="text-[#342716]">{{ businesses.length }}</strong>
      </p>
    </section>

    <section class="grid gap-2">
      <RouterLink
        class="grid gap-1 rounded-xl border border-[#6553281f] bg-[#fffdfa] p-3 no-underline"
        :to="{ name: 'TenantRegister' }"
      >
        <strong class="text-[0.9rem] text-[#342716]">Tenant Registry</strong>
        <span class="text-[0.76rem] text-[#7a715f]">Register tenants by email/phone and continue as guest.</span>
      </RouterLink>

      <RouterLink
        class="grid gap-1 rounded-xl border border-[#6553281f] bg-[#fffdfa] p-3 no-underline"
        :to="{ name: 'BackupRestore' }"
      >
        <strong class="text-[0.9rem] text-[#342716]">Backup & Restore</strong>
        <span class="text-[0.76rem] text-[#7a715f]">Export local backup or import from JSON.</span>
      </RouterLink>

      <RouterLink
        class="grid gap-1 rounded-xl border border-[#6553281f] bg-[#fffdfa] p-3 no-underline"
        :to="{ name: 'SyncConflicts' }"
      >
        <strong class="text-[0.9rem] text-[#342716]">Sync Conflicts</strong>
        <span class="text-[0.76rem] text-[#7a715f]">Review failed sync queue items and resolve them.</span>
      </RouterLink>
    </section>

    <section class="rounded-xl border border-[#6553281f] bg-[rgba(255,252,244,0.9)] p-3">
      <div class="mb-2 flex items-center justify-between gap-2">
        <h2 class="m-0 text-[0.9rem] text-[#342716]">Activity Log</h2>
        <span class="text-[0.72rem] text-[#7a715f]">{{ recentAuditLogs.length }} recent</span>
      </div>

      <p v-if="!recentAuditLogs.length" class="m-0 rounded-[10px] bg-[#fffdfa] p-3 text-center text-[0.78rem] text-[#7a715f]">
        No activity yet.
      </p>

      <div v-else class="grid max-h-[40vh] gap-2 overflow-auto pr-1">
        <article
          v-for="entry in recentAuditLogs"
          :key="entry.id"
          class="rounded-[10px] border border-[#6553281f] bg-[#fffdfa] p-2.5"
        >
          <p class="m-0 text-[0.77rem] font-bold text-[#342716]">{{ formatAuditAction(entry.action) }}</p>
          <p class="m-0 mt-0.5 text-[0.72rem] text-[#7a715f]">
            {{ getBusinessName(entry.companyId) }} / {{ getBookName(entry.bookId) }}
          </p>
          <p class="m-0 mt-0.5 text-[0.7rem] text-[#7a715f]">{{ formatDateTime(entry.createdAt) }}</p>
        </article>
      </div>
    </section>
  </main>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'

import { clearAuthSession, hasAuthSession, isBackendConfigured } from '../services/api'
import { useBooksStore } from '../stores/books'
import { useBusinessesStore } from '../stores/businesses'

const booksStore = useBooksStore()
const businessesStore = useBusinessesStore()
const router = useRouter()
const toast = useToast()
const { syncSummary, isOnline, lastSyncedAt, auditLogs, books } = storeToRefs(booksStore)
const { businesses } = storeToRefs(businessesStore)
const sessionActive = ref(hasAuthSession())
const backendReady = isBackendConfigured()

const recentAuditLogs = computed(() => auditLogs.value.slice(0, 50))

function syncNow() {
  void booksStore.processSyncQueue()
  toast.info('Sync requested')
}

function retryFailed() {
  booksStore.retryFailedSyncItems()
  toast.info('Retrying failed sync items')
}

function formatDateTime(value) {
  if (!value) {
    return '-'
  }
  return new Date(value).toLocaleString()
}

function formatAuditAction(action) {
  if (!action) {
    return 'Unknown action'
  }
  return action.replaceAll('.', ' ').replace(/\b\w/g, (char) => char.toUpperCase())
}

function getBusinessName(businessId) {
  if (!businessId) {
    return 'Unknown business'
  }
  return businesses.value.find((item) => item.id === businessId)?.name || 'Unknown business'
}

function getBookName(bookId) {
  if (!bookId) {
    return 'General'
  }
  return books.value.find((item) => item.id === bookId)?.name || 'Deleted book'
}

async function pullLatestSnapshot() {
  const result = await booksStore.syncFromBackendSnapshot()
  if (!result.ok) {
    if (result.reason === 'local_unsynced_changes') {
      toast.error('Sync pending locally. Push or resolve conflicts before refresh.')
      return
    }
    toast.error('Could not refresh data from backend')
    return
  }
  toast.success('Latest backend data loaded')
}

function goToLogin() {
  router.push({ name: 'Login' })
}

function logout() {
  clearAuthSession()
  sessionActive.value = false
  toast.info('Logged out')
}

onMounted(() => {
  sessionActive.value = hasAuthSession()
})
</script>
