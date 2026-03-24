<template>
  <main v-if="book" class="mx-auto w-full max-w-[430px] px-2.5 pb-20 pt-2.5">
    <BookDetails :book="book" :record-count="filteredRecords.length" :show-action="false">
      <section v-if="selectedCount > 0" class="grid grid-cols-[auto_auto_1fr] items-center gap-2 rounded-[10px] border border-[#cfd8ff] bg-[#eef2ff] px-2 py-2">
        <button class="h-[26px] min-w-[26px] rounded-lg border-0 bg-[#dfe6ff]" type="button" @click="clearSelection">x</button>
        <span class="text-[0.78rem] font-bold">{{ selectedCount }} selected</span>
        <div class="flex flex-wrap justify-end gap-1">
          <button class="rounded-lg border-0 bg-[#fffdfa] px-2 py-1.5 text-[0.72rem] font-bold text-[#2f47ba]" type="button" @click="showDeleteSheet = true">Delete</button>
          <button class="rounded-lg border-0 bg-[#fffdfa] px-2 py-1.5 text-[0.72rem] font-bold text-[#2f47ba]" type="button" @click="openEditSheet">Edit</button>
          <button class="rounded-lg border-0 bg-[#fffdfa] px-2 py-1.5 text-[0.72rem] font-bold text-[#2f47ba]" type="button" @click="openMoveSheet">Move</button>
          <button class="rounded-lg border-0 bg-[#fffdfa] px-2 py-1.5 text-[0.72rem] font-bold text-[#2f47ba]" type="button" @click="openCopySheet">Copy</button>
        </div>
      </section>

      <SummaryCard
        :cash-in="summary.cashIn"
        :cash-out="summary.cashOut"
        :balance="summary.balance"
      />

      <section class="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
        <Filters
          :type="filters.type"
          :from="filters.from"
          :query="filters.query"
          @toggle-sheet="showFilterSheet = true"
          @update:type="filters.type = $event"
          @update:from="filters.from = $event"
          @update:query="filters.query = $event"
        />

        <RouterLink
          class="rounded-full border border-[#6553281f] bg-[#fffdfa] px-3 py-2.5 text-[0.78rem] font-bold text-[#345acb] no-underline"
          :to="{
            name: 'BookReport',
            params: { id: book.id },
            query: { type: filters.type, from: filters.from, q: filters.query },
          }"
        >
          Report
        </RouterLink>
      </section>
      <p class="mb-1 mt-1 text-center text-[0.76rem] font-bold text-[#7a715f]">
        Showing {{ filteredRecords.length }} entr{{ filteredRecords.length === 1 ? 'y' : 'ies' }}
      </p>
      <RecordList
        :records="filteredRecords"
        :selected-ids="selectedRecordIds"
        :selection-mode="selectedCount > 0"
        :sync-status-by-id="recordSyncStatusById"
        @toggle-select="toggleRecordSelection"
        @open-record="openRecordDetails"
      />
    </BookDetails>

    <section v-if="selectedCount === 0" class="fixed inset-x-0 bottom-0 grid grid-cols-2 gap-2 bg-[linear-gradient(180deg,rgba(236,233,223,0),rgba(236,233,223,0.95)_40%)] px-2.5 pb-3 pt-2">
      <button class="rounded-lg border-0 bg-[linear-gradient(135deg,#1d8a4f,#156a3b)] px-3 py-3 text-[0.88rem] font-extrabold uppercase tracking-[0.06em] text-[#fff8ea]" type="button" @click="activeRecordType = 'income'">
        + Cash In
      </button>
      <button class="rounded-lg border-0 bg-[linear-gradient(135deg,#d34238,#aa2c25)] px-3 py-3 text-[0.88rem] font-extrabold uppercase tracking-[0.06em] text-[#fff8ea]" type="button" @click="activeRecordType = 'expense'">
        - Cash Out
      </button>
    </section>

    <div v-if="showFilterSheet" class="fixed inset-0 z-20 flex items-end justify-center bg-[rgba(27,31,44,0.45)]" @click="showFilterSheet = false">
      <section class="w-full max-w-[430px] rounded-t-2xl bg-[rgba(255,252,244,0.98)] p-3 shadow-[0_-8px_24px_rgba(82,61,20,0.16)]" @click.stop>
        <div class="mb-2.5 flex items-center gap-2.5">
          <button class="border-0 bg-transparent text-xl text-[#5d4930]" type="button" @click="showFilterSheet = false">x</button>
          <h2 class="m-0 text-[0.92rem]">Filter Records</h2>
        </div>

        <label class="mb-2.5 grid gap-1.5">
          <span class="text-[0.76rem] font-bold text-[#342716]">Entry Type</span>
          <select v-model="filters.type" class="rounded-[10px] border border-[#6553281f] bg-[#fffdfa] p-2.5 text-[0.84rem]">
            <option value="all">All</option>
            <option value="income">Cash In only</option>
            <option value="expense">Cash Out only</option>
          </select>
        </label>

        <label class="mb-2.5 grid gap-1.5">
          <span class="text-[0.76rem] font-bold text-[#342716]">Select Date</span>
          <input v-model="filters.from" class="rounded-[10px] border border-[#6553281f] bg-[#fffdfa] p-2.5 text-[0.84rem]" type="date" />
        </label>

        <button class="w-full rounded-[10px] border-0 bg-[rgba(255,237,204,0.7)] py-2.5 text-[0.82rem] font-bold text-[#7c5515]" type="button" @click="resetFilters">Clear filters</button>
      </section>
    </div>

    <div v-if="activeRecordType" class="fixed inset-0 z-20 flex items-end justify-center bg-[rgba(27,31,44,0.45)]" @click="activeRecordType = ''">
      <section class="w-full max-w-[430px] rounded-t-2xl bg-[rgba(255,252,244,0.98)] p-3 shadow-[0_-8px_24px_rgba(82,61,20,0.16)]" @click.stop>
        <div class="mb-2.5 flex items-center gap-2.5">
          <button class="border-0 bg-transparent text-xl text-[#5d4930]" type="button" @click="activeRecordType = ''">x</button>
          <h2 class="m-0 text-[0.92rem]">{{ activeRecordType === 'income' ? 'Add Cash In Entry' : 'Add Cash Out Entry' }}</h2>
        </div>

        <AddRecord :type="activeRecordType" @submit="handleAddRecord" />
      </section>
    </div>

    <div v-if="showDeleteSheet" class="fixed inset-0 z-20 flex items-end justify-center bg-[rgba(27,31,44,0.45)]" @click="showDeleteSheet = false">
      <section class="w-full max-w-[430px] rounded-t-2xl bg-[rgba(255,252,244,0.98)] p-3 shadow-[0_-8px_24px_rgba(82,61,20,0.16)]" @click.stop>
        <div class="mb-2.5 flex items-center gap-2.5">
          <button class="border-0 bg-transparent text-xl text-[#5d4930]" type="button" @click="showDeleteSheet = false">x</button>
          <h2 class="m-0 text-[0.92rem]">Delete records</h2>
        </div>
        <p class="mb-2.5 mt-0 text-[0.82rem] text-[#5f5b48]">Delete {{ selectedCount }} selected record(s)? This cannot be undone.</p>
        <button class="w-full rounded-[10px] border-0 bg-[#d34238] py-2.5 text-[0.82rem] font-bold text-[#fff8ea]" type="button" @click="deleteSelectedRecords">Delete</button>
      </section>
    </div>

    <div v-if="showEditSheet" class="fixed inset-0 z-20 flex items-end justify-center bg-[rgba(27,31,44,0.45)]" @click="showEditSheet = false">
      <section class="w-full max-w-[430px] rounded-t-2xl bg-[rgba(255,252,244,0.98)] p-3 shadow-[0_-8px_24px_rgba(82,61,20,0.16)]" @click.stop>
        <div class="mb-2.5 flex items-center gap-2.5">
          <button class="border-0 bg-transparent text-xl text-[#5d4930]" type="button" @click="showEditSheet = false">x</button>
          <h2 class="m-0 text-[0.92rem]">Edit record</h2>
        </div>

        <label class="mb-2.5 grid gap-1.5">
          <span class="text-[0.76rem] font-bold text-[#342716]">Amount</span>
          <input v-model="editForm.amount" class="rounded-[10px] border border-[#6553281f] bg-[#fffdfa] p-2.5 text-[0.84rem]" type="number" min="0" step="0.01" />
        </label>

        <label class="mb-2.5 grid gap-1.5">
          <span class="text-[0.76rem] font-bold text-[#342716]">Remark</span>
          <input v-model="editForm.note" class="rounded-[10px] border border-[#6553281f] bg-[#fffdfa] p-2.5 text-[0.84rem]" type="text" />
        </label>

        <div class="mb-2.5 grid grid-cols-2 gap-2">
          <label class="grid gap-1.5">
            <span class="text-[0.76rem] font-bold text-[#342716]">Date</span>
            <input v-model="editForm.date" class="rounded-[10px] border border-[#6553281f] bg-[#fffdfa] p-2.5 text-[0.84rem]" type="date" />
          </label>

          <label class="grid gap-1.5">
            <span class="text-[0.76rem] font-bold text-[#342716]">Time</span>
            <input v-model="editForm.time" class="rounded-[10px] border border-[#6553281f] bg-[#fffdfa] p-2.5 text-[0.84rem]" type="time" />
          </label>
        </div>

        <label class="mb-2.5 grid gap-1.5">
          <span class="text-[0.76rem] font-bold text-[#342716]">Category</span>
          <input v-model="editForm.category" class="rounded-[10px] border border-[#6553281f] bg-[#fffdfa] p-2.5 text-[0.84rem]" type="text" />
        </label>

        <label class="mb-2.5 grid gap-1.5">
          <span class="text-[0.76rem] font-bold text-[#342716]">Payment Mode</span>
          <select v-model="editForm.paymentMode" class="rounded-[10px] border border-[#6553281f] bg-[#fffdfa] p-2.5 text-[0.84rem]">
            <option value="Cash">Cash</option>
            <option value="Online">Online</option>
            <option value="Bank">Bank</option>
          </select>
        </label>

        <button class="w-full rounded-[10px] border-0 bg-[#4764de] py-2.5 text-[0.82rem] font-bold text-[#fff8ea]" type="button" @click="saveEditedRecord">Save</button>
      </section>
    </div>

  </main>

  <main v-else class="mx-auto w-full max-w-[430px] px-2.5 pb-20 pt-2.5">
    <section class="rounded-[14px] bg-[rgba(255,252,244,0.9)] p-4">
      <h1>Book not found</h1>
      <RouterLink to="/">Go back to books</RouterLink>
    </section>
  </main>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'

import BookDetails from '../components/BookDetails.vue'
import SummaryCard from '../components/SummaryCard.vue'
import Filters from '../components/Filters.vue'
import RecordList from '../components/RecordList.vue'
import AddRecord from '../components/AddRecord.vue'
import { useBooksStore } from '../stores/books'

const route = useRoute()
const router = useRouter()
const booksStore = useBooksStore()
const toast = useToast()

const filters = reactive({
  type: 'all',
  from: '',
  query: '',
})

const showFilterSheet = ref(false)
const showDeleteSheet = ref(false)
const showEditSheet = ref(false)
const activeRecordType = ref('')
const selectedRecordIds = ref([])

const editForm = reactive({
  amount: '',
  note: '',
  category: '',
  paymentMode: 'Cash',
  date: '',
  time: '',
})

const book = computed(() => booksStore.getBookById(route.params.id))

const summary = computed(() =>
  book.value
    ? booksStore.getBookSummary(book.value.id)
    : { cashIn: 0, cashOut: 0, balance: 0 },
)

const filteredRecords = computed(() => {
  if (!book.value) {
    return []
  }

  return booksStore.getRecordsByBookId(book.value.id).filter((record) => {
    const matchesType = filters.type === 'all' || record.type === filters.type
    const matchesDate = !filters.from || record.date >= filters.from
    const matchesQuery =
      !filters.query ||
      record.note.toLowerCase().includes(filters.query.toLowerCase()) ||
      record.amount.toString().includes(filters.query)

    return matchesType && matchesDate && matchesQuery
  })
})

const selectedCount = computed(() => selectedRecordIds.value.length)
const selectedRecord = computed(() =>
  selectedCount.value === 1 ? booksStore.getRecordById(selectedRecordIds.value[0]) : null,
)
const recordSyncStatusById = computed(() => {
  const statuses = {}
  for (const record of filteredRecords.value) {
    const status = booksStore.getEntitySyncStatus('record', record.id)
    if (status !== 'none') {
      statuses[record.id] = status
    }
  }
  return statuses
})

watch(filteredRecords, (nextRecords) => {
  const validIds = new Set(nextRecords.map((record) => record.id))
  selectedRecordIds.value = selectedRecordIds.value.filter((id) => validIds.has(id))
})

function toggleRecordSelection(recordId) {
  if (selectedRecordIds.value.includes(recordId)) {
    selectedRecordIds.value = selectedRecordIds.value.filter((id) => id !== recordId)
  } else {
    selectedRecordIds.value = [...selectedRecordIds.value, recordId]
  }
}

function clearSelection() {
  selectedRecordIds.value = []
}

function openRecordDetails(recordId) {
  const record = booksStore.getRecordById(recordId)
  if (!record) {
    return
  }

  toast.info(`${record.type === 'income' ? 'Cash In' : 'Cash Out'}: ${record.amount}`)
}

async function handleAddRecord(payload) {
  if (!book.value) {
    toast.error('Book not found')
    return
  }

  const created = await booksStore.createRecord({
    ...payload,
    bookId: book.value.id,
  })

  if (created) {
    if (booksStore.lastWriteStatus === 'queued') {
      toast.success('Saved offline. Will sync when backend/network is ready.')
    } else {
      toast.success(payload.type === 'income' ? 'Cash in added' : 'Cash out added')
    }
    activeRecordType.value = ''
  } else {
    toast.error('Amount must be greater than zero')
  }
}

async function deleteSelectedRecords() {
  const removed = await booksStore.removeRecords(selectedRecordIds.value)
  showDeleteSheet.value = false
  clearSelection()
  toast.success(`${removed} record(s) deleted`)
}

function openEditSheet() {
  if (selectedCount.value !== 1) {
    toast.info('Select one record to edit')
    return
  }

  editForm.amount = selectedRecord.value.amount
  editForm.note = selectedRecord.value.note || ''
  editForm.category = selectedRecord.value.category || ''
  editForm.paymentMode = selectedRecord.value.paymentMode || 'Cash'
  editForm.date = selectedRecord.value.date || new Date().toISOString().slice(0, 10)
  editForm.time = selectedRecord.value.time || '00:00'
  showEditSheet.value = true
}

async function saveEditedRecord() {
  if (!selectedRecord.value) {
    toast.error('No record selected')
    return
  }

  const saved = await booksStore.editRecord(selectedRecord.value.id, {
    amount: editForm.amount,
    note: editForm.note,
    category: editForm.category,
    paymentMode: editForm.paymentMode,
    type: selectedRecord.value.type,
    date: editForm.date,
    time: editForm.time,
  })

  if (saved) {
    showEditSheet.value = false
    clearSelection()
    toast.success('Record updated')
  } else {
    toast.error('Could not update record')
  }
}

function openMoveSheet() {
  if (!selectedCount.value) {
    toast.info('Select at least one record')
    return
  }
  booksStore.setPendingRecordTransferIds(selectedRecordIds.value)
  clearSelection()
  router.push({ name: 'RecordTransfer', params: { id: book.value.id }, query: { mode: 'move' } })
}

function openCopySheet() {
  if (!selectedCount.value) {
    toast.info('Select at least one record')
    return
  }
  booksStore.setPendingRecordTransferIds(selectedRecordIds.value)
  clearSelection()
  router.push({ name: 'RecordTransfer', params: { id: book.value.id }, query: { mode: 'copy' } })
}

function resetFilters() {
  filters.type = 'all'
  filters.from = ''
  showFilterSheet.value = false
  toast.info('Filters cleared')
}

function formatDateTime(value) {
  if (!value) {
    return '-'
  }

  return new Date(value).toLocaleString()
}
</script>
