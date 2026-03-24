<template>
  <section class="record-list">
    <article
      v-for="record in records"
      :key="record.id"
      class="record-card"
      :class="{ selected: selectedIds.includes(record.id) }"
      @pointerdown="startPress(record.id)"
      @pointerup="endPress(record.id)"
      @pointerleave="cancelPress"
      @pointercancel="cancelPress"
    >
      <div class="record-main">
        <div>
          <p class="record-chip">{{ record.paymentMode || 'Cash' }}</p>
          <h3>{{ record.note }}</h3>
        </div>

        <div class="record-right">
          <span
            v-if="syncStatusById[record.id]"
            class="sync-badge"
            :class="syncStatusById[record.id]"
          >
            {{ syncStatusById[record.id] }}
          </span>
          <span class="select-dot">{{ selectedIds.includes(record.id) ? 'OK' : '' }}</span>
          <strong :class="record.type">
          {{ record.type === 'income' ? '+' : '-' }}{{ formatCurrency(record.amount) }}
          </strong>
        </div>
      </div>

      <div class="record-meta">
        <span>{{ formatRecordMoment(record) }}</span>
        <span v-if="record.attachments?.length" class="attachment-meta">
          {{ record.attachments.length }} attachment{{ record.attachments.length > 1 ? 's' : '' }}
        </span>
        <span>Entry by You</span>
      </div>
    </article>

    <p v-if="!records.length" class="empty-state">
      No records match the current filters.
    </p>
  </section>
</template>

<script setup>
const props = defineProps({
  records: {
    type: Array,
    required: true,
  },
  selectedIds: {
    type: Array,
    default: () => [],
  },
  selectionMode: {
    type: Boolean,
    default: false,
  },
  syncStatusById: {
    type: Object,
    default: () => ({}),
  },
})

const emit = defineEmits(['toggle-select', 'open-record'])

let pressTimer = null
let longPressed = false
const LONG_PRESS_MS = 420

function startPress(recordId) {
  cancelPress()
  longPressed = false
  pressTimer = setTimeout(() => {
    longPressed = true
    emit('toggle-select', recordId)
  }, LONG_PRESS_MS)
}

function endPress(recordId) {
  if (pressTimer) {
    clearTimeout(pressTimer)
    pressTimer = null
  }

  if (longPressed) {
    return
  }

  if (props.selectionMode) {
    emit('toggle-select', recordId)
  } else {
    emit('open-record', recordId)
  }
}

function cancelPress() {
  if (pressTimer) {
    clearTimeout(pressTimer)
    pressTimer = null
  }
}

function formatCurrency(value) {
  return new Intl.NumberFormat('en-UG', {
    style: 'currency',
    currency: 'UGX',
    maximumFractionDigits: 0,
  }).format(value)
}

function formatRecordMoment(record) {
  const datePart = record.date || ''
  const timePart = record.time || ''
  if (!datePart && !timePart) {
    return '-'
  }

  return timePart ? `${datePart} ${timePart}` : datePart
}
</script>

<style scoped>
.record-list {
  display: grid;
  gap: 0.5rem;
}

.record-card {
  padding: 0.72rem 0.8rem;
  border-radius: 14px;
  background: rgba(255, 252, 246, 0.95);
  border: 1px solid rgba(101, 83, 40, 0.12);
  cursor: pointer;
}

.record-card.selected {
  background: #eef2ff;
  border-color: #b8c6ff;
}

.record-main,
.record-meta {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
}

.record-right {
  display: grid;
  justify-items: end;
  gap: 0.2rem;
}

.sync-badge {
  padding: 0.1rem 0.4rem;
  border-radius: 999px;
  font-size: 0.62rem;
  font-weight: 700;
  text-transform: uppercase;
}

.sync-badge.pending {
  background: #fff6d9;
  color: #956602;
}

.sync-badge.synced {
  background: #e7f8ec;
  color: #1c7d45;
}

.sync-badge.failed {
  background: #fde8e6;
  color: #b03226;
}

.select-dot {
  min-width: 18px;
  height: 18px;
  border-radius: 999px;
  font-size: 0.56rem;
  display: grid;
  place-items: center;
  color: #fffdfa;
  background: #4f67db;
}

.record-main h3,
.record-meta span {
  margin: 0;
}

.record-chip {
  margin: 0 0 0.2rem;
  display: inline-block;
  border-radius: 6px;
  background: #e8f0ff;
  color: #3365a8;
  padding: 0.15rem 0.42rem;
  font-size: 0.7rem;
  font-weight: 700;
}

strong.income {
  color: #166534;
}

strong.expense {
  color: #9f2f1e;
}

.record-meta {
  margin-top: 0.35rem;
  color: #6d6b61;
  font-size: 0.72rem;
}

.attachment-meta {
  color: #315dbc;
  font-weight: 700;
}

.empty-state {
  margin: 0;
  padding: 0.8rem;
  border-radius: 12px;
  background: rgba(255, 252, 246, 0.7);
  color: #6b695d;
  text-align: center;
  font-size: 0.82rem;
}

.record-main h3 {
  font-size: 0.9rem;
}
</style>
