<template>
  <main class="mx-auto grid w-full max-w-[430px] gap-3 px-2.5 pb-4 pt-2.5">
    <header class="flex items-center gap-2">
      <RouterLink class="grid h-9 w-9 place-items-center rounded-xl border border-[#6553281f] bg-[#fffdfa] text-[#2f3352] no-underline" to="/">
        &larr;
      </RouterLink>
      <div>
        <h1 class="m-0 text-[1rem]">Sync Conflicts</h1>
        <p class="m-0 text-[0.74rem] text-[#7a715f]">Resolve failed sync items from real queue data.</p>
      </div>
    </header>

    <section class="rounded-xl border border-[#6553281f] bg-[rgba(255,252,244,0.9)] p-3">
      <p class="m-0 text-[0.78rem] text-[#7a715f]">
        Failed items: <strong class="text-[#b03226]">{{ syncSummary.failed }}</strong>
      </p>
      <div class="mt-2 flex gap-2">
      <button
        v-if="syncSummary.failed"
        class="rounded-full border border-[#6553281f] bg-[#fffdfa] px-3 py-1.5 text-[0.76rem] font-bold text-[#345acb]"
        type="button"
        @click="retryAll"
      >
        Retry All Failed
      </button>
      </div>
    </section>

    <section class="rounded-xl border border-[#6553281f] bg-[rgba(255,252,244,0.9)] p-3">
      <h2 class="m-0 mb-2 text-[0.9rem]">Conflict Items</h2>
      <p v-if="!failedSyncItems.length" class="m-0 text-[0.78rem] text-[#7a715f]">No conflicts right now.</p>

      <article
        v-for="item in failedSyncItems"
        :key="item.id"
        class="mb-2 rounded-[10px] border border-[#6553281f] bg-[#fffdfa] p-2.5"
      >
        <p class="m-0 text-[0.8rem] font-bold text-[#342716]">
          {{ item.entityType }} / {{ item.operation }}
        </p>
        <p class="m-0 text-[0.72rem] text-[#7a715f]">
          {{ item.entityId }} - {{ item.failedReason || 'Sync conflict' }}
        </p>
        <div class="mt-2 flex gap-2">
          <button
            class="rounded-full border border-[#6553281f] bg-[#fffdfa] px-2.5 py-1 text-[0.72rem] font-bold text-[#345acb]"
            type="button"
            @click="resolve(item.id, 'retry')"
          >
            Retry
          </button>
          <button
            class="rounded-full border border-[#6553281f] bg-[#fffdfa] px-2.5 py-1 text-[0.72rem] font-bold text-[#7a715f]"
            type="button"
            @click="resolve(item.id, 'skip')"
          >
            Skip
          </button>
        </div>
      </article>
    </section>
  </main>
</template>

<script setup>
import { storeToRefs } from 'pinia'
import { useToast } from 'vue-toastification'

import { useBooksStore } from '../stores/books'

const toast = useToast()
const booksStore = useBooksStore()
const { failedSyncItems, syncSummary } = storeToRefs(booksStore)

function resolve(syncItemId, strategy) {
  const ok = booksStore.resolveSyncConflict(syncItemId, strategy)
  if (!ok) {
    toast.error('Could not resolve sync item')
    return
  }

  toast.success(strategy === 'skip' ? 'Conflict skipped' : 'Conflict retried')
}

function retryAll() {
  booksStore.retryFailedSyncItems()
  toast.info('Retry requested for all failed items')
}
</script>
