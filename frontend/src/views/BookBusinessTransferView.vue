<template>
  <main class="page">
    <header class="top-bar">
      <RouterLink class="back-link" to="/" aria-label="Back to dashboard">
        <span aria-hidden="true">&larr;</span>
      </RouterLink>
      <div>
        <h1>{{ isMove ? 'Move Book To Business' : 'Copy Book To Business' }}</h1>
        <p>{{ book?.name || 'Book' }}</p>
      </div>
    </header>

    <section class="panel">
      <label class="field">
        <span>Search business</span>
        <input v-model.trim="search" type="text" placeholder="Search business" />
      </label>
    </section>

    <section class="panel">
      <h2>Target businesses</h2>
      <p v-if="!targets.length" class="hint">No businesses found.</p>
      <button
        v-for="target in targets"
        :key="target.id"
        class="target-item"
        :class="{ active: targetBusinessId === target.id }"
        type="button"
        @click="targetBusinessId = target.id"
      >
        <strong>{{ target.name }}</strong>
      </button>
    </section>

    <footer class="actions">
      <button class="action-button" type="button" @click="submitTransfer">
        {{ isMove ? 'Move Book' : 'Copy Book' }}
      </button>
    </footer>
  </main>
</template>

<script setup>
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'

import { useBooksStore } from '../stores/books'
import { useBusinessesStore } from '../stores/businesses'

const route = useRoute()
const router = useRouter()
const toast = useToast()
const booksStore = useBooksStore()
const businessesStore = useBusinessesStore()
const { businesses } = storeToRefs(businessesStore)

const search = ref('')
const targetBusinessId = ref('')
const isMove = computed(() => route.query.mode === 'move')
const bookId = route.params.id
const book = computed(() => booksStore.getBookById(bookId))

const targets = computed(() => {
  const source = book.value
  if (!source) {
    return []
  }

  return businesses.value
    .filter(
      (business) =>
        business.id !== source.companyId &&
        business.name.toLowerCase().includes(search.value.toLowerCase()),
    )
    .sort((a, b) => a.name.localeCompare(b.name))
})

async function submitTransfer() {
  if (!book.value) {
    toast.error('Book not found')
    return
  }

  if (!targetBusinessId.value) {
    toast.error('Select target business')
    return
  }

  if (isMove.value) {
    const moved = await booksStore.moveBookEntry(book.value.id, targetBusinessId.value)
    if (!moved) {
      toast.error('Could not move book')
      return
    }
    toast.success('Book moved to business')
  } else {
    const copied = await booksStore.copyBookEntry(book.value.id, targetBusinessId.value)
    if (!copied) {
      toast.error('Could not copy book')
      return
    }
    toast.success('Book copied to business')
  }

  router.push('/')
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
.top-bar h1 { font-size: 0.95rem; }
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
.target-item {
  width: 100%; border: 1px solid rgba(101, 83, 40, 0.12); border-radius: 10px; padding: 0.62rem 0.7rem;
  background: #fffdfa; text-align: left; margin-bottom: 0.4rem;
}
.target-item.active { background: #eef2ff; border-color: #cfd8ff; }
.target-item strong { font-size: 0.82rem; }
.actions { display: grid; }
.action-button {
  border: 0; border-radius: 10px; padding: 0.72rem; color: #fff8ea;
  background: linear-gradient(135deg, #4a67df, #5878ff); font-weight: 800; font-size: 0.84rem;
}
</style>
