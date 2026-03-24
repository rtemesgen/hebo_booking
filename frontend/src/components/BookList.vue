<template>
  <section class="book-list-shell">
    <div class="book-list">
      <article v-for="book in books" :key="book.id" class="book-card">
        <RouterLink class="book-main" :to="`/book/${book.id}`">
          <div class="book-icon">{{ getInitials(book.name) }}</div>

          <div class="book-inline">
            <h3>{{ book.name }}</h3>
            <span class="book-meta">{{ formatRelativeTime(book.updatedAt || book.createdAt) }}</span>
            <strong>{{ formatCurrency(getBookSummary(book.id).balance) }}</strong>
            <small>{{ book.currency }}</small>
          </div>
        </RouterLink>

        <button class="menu-trigger" type="button" @click="$emit('toggle-menu', book.id)">
          ...
        </button>
      </article>

      <p v-if="!books.length" class="empty-state">
        No books match the current dashboard filters.
      </p>
    </div>
  </section>
</template>

<script setup>
import { useBooksStore } from '../stores/books'

defineProps({
  books: {
    type: Array,
    required: true,
  },
})

defineEmits(['toggle-menu'])

function getBookSummary(bookId) {
  const booksStore = useBooksStore()
  return booksStore.getBookSummary(bookId)
}

function formatCurrency(value) {
  return new Intl.NumberFormat('en-UG', {
    style: 'currency',
    currency: 'UGX',
    maximumFractionDigits: 0,
  }).format(value)
}

function formatRelativeTime(value) {
  const diffInMinutes = Math.max(
    1,
    Math.floor((Date.now() - new Date(value).getTime()) / 1000 / 60),
  )

  if (diffInMinutes < 60) {
    return `${diffInMinutes} min ago`
  }

  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) {
    return `${diffInHours} hr ago`
  }

  return `${Math.floor(diffInHours / 24)} day ago`
}

function getInitials(name) {
  if (!name) {
    return 'NA'
  }

  const cleaned = name.trim()
  if (!cleaned) {
    return 'NA'
  }

  const parts = cleaned.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  }

  return cleaned.slice(0, 2).toUpperCase()
}
</script>

<style scoped>
.book-list-shell {
  padding: 0.25rem;
  border-radius: 14px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.55), rgba(255, 248, 234, 0.35)),
    rgba(255, 252, 244, 0.82);
  border: 1px solid rgba(101, 83, 40, 0.1);
  box-shadow: 0 16px 34px rgba(82, 61, 20, 0.07);
}

.book-list {
  display: grid;
  gap: 0.4rem;
}

.book-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.4rem;
  padding: 0.58rem 0.62rem;
  border-radius: 12px;
  background: rgba(255, 252, 246, 0.96);
  border: 1px solid rgba(101, 83, 40, 0.08);
}

.book-main {
  display: grid;
  grid-template-columns: 36px minmax(0, 1fr);
  gap: 0.58rem;
  align-items: center;
  flex: 1;
  text-decoration: none;
  color: inherit;
}

.book-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  font-weight: 800;
  color: #fff8ea;
  background: linear-gradient(135deg, #7c5515, #9f7426);
  box-shadow: 0 10px 20px rgba(124, 85, 21, 0.18);
}

.book-inline h3,
.book-inline span,
.book-inline strong,
.book-inline small {
  margin: 0;
}

.book-inline {
  min-width: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto auto;
  align-items: center;
  gap: 0.35rem;
}

.book-inline h3 {
  font-size: 0.84rem;
  color: #342716;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.book-inline small,
.book-meta {
  color: #7a715f;
  font-size: 0.66rem;
}

.book-inline strong {
  font-size: 0.82rem;
  color: #14532d;
}

.menu-trigger {
  width: 30px;
  height: 30px;
  border: 0;
  border-radius: 12px;
  background: rgba(255, 246, 226, 0.8);
  color: #7c5515;
  font-size: 0.88rem;
  font-weight: 800;
}

.empty-state {
  margin: 0;
  padding: 0.8rem;
  border-radius: 12px;
  text-align: center;
  color: #7a715f;
  background: rgba(255, 252, 246, 0.8);
  font-size: 0.8rem;
}

@media (max-width: 640px) {
  .book-inline {
    grid-template-columns: minmax(0, 1fr) auto;
    row-gap: 0.2rem;
  }

  .book-inline strong,
  .book-inline small,
  .book-meta {
    justify-self: start;
  }
}
</style>
