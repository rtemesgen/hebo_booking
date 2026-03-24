<template>
  <main class="page">
    <header class="top-bar">
      <RouterLink class="back-link" :to="`/book/${bookId}`" aria-label="Back to book">
        <span aria-hidden="true">&larr;</span>
      </RouterLink>
      <div>
        <h1>{{ isMove ? 'Move Records' : 'Copy Records' }}</h1>
        <p>{{ selectedIds.length }} selected record(s)</p>
      </div>
    </header>

    <section class="panel">
      <label class="field">
        <span>Search books</span>
        <input v-model.trim="search" type="text" placeholder="Search target book" />
      </label>
    </section>

    <section class="panel">
      <h2>Target books (same business)</h2>
      <p v-if="!targets.length" class="hint">No target books found.</p>

      <div v-if="isMove" class="target-list">
        <button
          v-for="target in targets"
          :key="target.id"
          class="target-item"
          :class="{ active: moveTargetId === target.id }"
          type="button"
          @click="moveTargetId = target.id"
        >
          <strong>{{ target.name }}</strong>
          <span>{{ target.currency }}</span>
        </button>
      </div>

      <div v-else class="target-list">
        <label v-for="target in targets" :key="target.id" class="target-check">
          <input
            type="checkbox"
            :checked="copyTargetIds.includes(target.id)"
            @change="toggleCopyTarget(target.id)"
          />
          <div>
            <strong>{{ target.name }}</strong>
            <span>{{ target.currency }}</span>
          </div>
        </label>
      </div>
    </section>

    <footer class="actions">
      <button class="action-button" type="button" @click="submitTransfer">
        {{ isMove ? 'Move Records' : 'Copy Records' }}
      </button>
    </footer>
  </main>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'

import { useBooksStore } from '../stores/books'

const route = useRoute()
const router = useRouter()
const toast = useToast()
const booksStore = useBooksStore()

const search = ref('')
const moveTargetId = ref('')
const copyTargetIds = ref([])

const bookId = route.params.id
const isMove = computed(() => route.query.mode === 'move')
const selectedIds = computed(() => booksStore.pendingRecordTransferIds)
const sourceBook = computed(() => booksStore.getBookById(bookId))

const targets = computed(() => {
  const source = sourceBook.value
  if (!source) {
    return []
  }

  return booksStore.books
    .filter(
      (book) =>
        book.id !== source.id &&
        book.companyId === source.companyId &&
        book.name.toLowerCase().includes(search.value.toLowerCase()),
    )
    .sort((a, b) => a.name.localeCompare(b.name))
})

function toggleCopyTarget(bookIdToToggle) {
  if (copyTargetIds.value.includes(bookIdToToggle)) {
    copyTargetIds.value = copyTargetIds.value.filter((id) => id !== bookIdToToggle)
  } else {
    copyTargetIds.value = [...copyTargetIds.value, bookIdToToggle]
  }
}

async function submitTransfer() {
  if (!selectedIds.value.length) {
    toast.error('No selected records to transfer')
    return
  }

  if (isMove.value) {
    if (!moveTargetId.value) {
      toast.error('Select a target book')
      return
    }

    const moved = await booksStore.moveRecords(selectedIds.value, moveTargetId.value)
    if (!moved) {
      toast.error('Move failed. Target must be same business.')
      return
    }
    toast.success(`${moved} record(s) moved`)
  } else {
    const copied = await booksStore.copyRecords(selectedIds.value, copyTargetIds.value)
    if (!copied) {
      toast.error('Select at least one target book in same business')
      return
    }
    toast.success(`${copied} copied record(s) created`)
  }

  booksStore.clearPendingRecordTransferIds()
  router.push(`/book/${bookId}`)
}
</script>

<style scoped>
.page { width: min(100%, 430px); margin: 0 auto; padding: 0.75rem; display: grid; gap: 0.6rem; }
.top-bar { display: flex; gap: 0.55rem; align-items: center; }
.back-link {
  width: 38px;
  height: 38px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  text-decoration: none;
  color: #2b355f;
  background: linear-gradient(180deg, #ffffff, #f7f9ff);
  border: 1px solid rgba(70, 86, 153, 0.16);
  box-shadow: 0 8px 18px rgba(52, 58, 87, 0.12);
  font-size: 1rem;
  font-weight: 800;
}
.top-bar h1, .top-bar p { margin: 0; }
.top-bar h1 { font-size: 0.98rem; }
.top-bar p { font-size: 0.74rem; color: #7a715f; }
.panel { border: 1px solid rgba(101, 83, 40, 0.12); background: #fffdfa; border-radius: 12px; padding: 0.7rem; }
.field { display: grid; gap: 0.25rem; }
.field span { font-size: 0.72rem; font-weight: 700; color: #5f5b48; }
.field input {
  border: 1px solid rgba(101, 83, 40, 0.12); border-radius: 10px; padding: 0.62rem 0.68rem; font-size: 0.84rem;
}
.panel h2, .hint { margin: 0; }
.panel h2 { font-size: 0.86rem; margin-bottom: 0.5rem; }
.hint { font-size: 0.76rem; color: #7a715f; }
.target-list { display: grid; gap: 0.42rem; }
.target-item {
  border: 1px solid rgba(101, 83, 40, 0.12); border-radius: 10px; padding: 0.62rem 0.7rem; background: #fffdfa;
  text-align: left;
}
.target-item.active { background: #eef2ff; border-color: #cfd8ff; }
.target-item strong, .target-item span { display: block; }
.target-item strong { font-size: 0.82rem; }
.target-item span { font-size: 0.72rem; color: #7a715f; margin-top: 0.1rem; }
.target-check {
  display: flex; gap: 0.55rem; align-items: center; border: 1px solid rgba(101, 83, 40, 0.12);
  border-radius: 10px; padding: 0.62rem 0.7rem; background: #fffdfa;
}
.target-check strong, .target-check span { display: block; }
.target-check strong { font-size: 0.82rem; }
.target-check span { font-size: 0.72rem; color: #7a715f; margin-top: 0.1rem; }
.actions { display: grid; }
.action-button {
  border: 0; border-radius: 10px; padding: 0.72rem; color: #fff8ea;
  background: linear-gradient(135deg, #4a67df, #5878ff); font-weight: 800; font-size: 0.84rem;
}
</style>
