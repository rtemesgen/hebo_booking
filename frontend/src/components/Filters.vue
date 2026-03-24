<template>
  <section class="filters">
    <button class="filter-pill" type="button" @click="$emit('toggle-sheet')">
      <span>{{ activeLabel }}</span>
      <strong>{{ activeCountLabel }}</strong>
    </button>

    <input
      class="search-input"
      :value="query"
      type="text"
      placeholder="Search records"
      @input="$emit('update:query', $event.target.value)"
    />
  </section>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  type: {
    type: String,
    required: true,
  },
  from: {
    type: String,
    required: true,
  },
  query: {
    type: String,
    required: true,
  },
})

defineEmits(['update:type', 'update:from', 'update:query', 'toggle-sheet'])

const activeLabel = computed(() => {
  if (props.type === 'income') {
    return 'Income only'
  }

  if (props.type === 'expense') {
    return 'Expense only'
  }

  return props.from ? `From ${props.from}` : 'All records'
})

const activeCountLabel = computed(() => (props.from ? 'Date set' : 'Tap to filter'))
</script>

<style scoped>
.filters {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 0.45rem;
  align-items: center;
}

.filter-pill {
  border: 0;
  border-radius: 999px;
  padding: 0.58rem 0.72rem;
  min-width: 110px;
  text-align: left;
  background: white;
  box-shadow: 0 8px 16px rgba(52, 58, 87, 0.08);
}

.filter-pill span,
.filter-pill strong {
  display: block;
}

.filter-pill span {
  font-size: 0.74rem;
  font-weight: 700;
  color: #2f3346;
}

.filter-pill strong {
  margin-top: 0.02rem;
  font-size: 0.64rem;
  color: #8a8b92;
}

.search-input {
  width: 100%;
  padding: 0.64rem 0.8rem;
  border-radius: 999px;
  border: 0;
  background: white;
  box-shadow: 0 8px 16px rgba(52, 58, 87, 0.08);
  font-size: 0.85rem;
}
</style>
