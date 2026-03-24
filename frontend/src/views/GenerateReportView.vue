<template>
  <main v-if="book" class="page">
    <header class="top-bar flex items-center gap-2">
      <RouterLink class="back-link" :to="`/book/${book.id}`">&lt;-</RouterLink>
      <div>
        <h1>Generate Report</h1>
        <p>{{ book.name }}</p>
      </div>
    </header>

    <section class="summary-strip">
      <article>
        <span>Duration</span>
        <strong>{{ durationLabel }}</strong>
      </article>
      <article>
        <span>Entry Type</span>
        <strong>{{ entryTypeLabel }}</strong>
      </article>
      <article>
        <span>Payment</span>
        <strong>{{ paymentModeLabel }}</strong>
      </article>
      <article>
        <span>Search</span>
        <strong>{{ reportFilters.searchTerm || 'None' }}</strong>
      </article>
    </section>

    <section class="panel">
      <h2>Report filters</h2>

      <div class="grid-two md:grid-cols-2">
        <label class="field">
          <span>Duration</span>
          <select v-model="reportFilters.duration">
            <option value="all">All Time</option>
            <option value="month">This Month</option>
            <option value="custom">Custom Range</option>
          </select>
        </label>

        <label class="field">
          <span>Entry Type</span>
          <select v-model="reportFilters.entryType">
            <option value="all">All</option>
            <option value="income">Cash In</option>
            <option value="expense">Cash Out</option>
          </select>
        </label>
      </div>

      <div class="grid-two md:grid-cols-2">
        <label class="field">
          <span>Payment Mode</span>
          <select v-model="reportFilters.paymentMode">
            <option value="all">All</option>
            <option value="Cash">Cash</option>
            <option value="Online">Online</option>
            <option value="Bank">Bank</option>
          </select>
        </label>

        <label class="field">
          <span>Search Term</span>
          <input v-model.trim="reportFilters.searchTerm" type="text" placeholder="Remark or amount" />
        </label>
      </div>

      <div v-if="reportFilters.duration === 'custom'" class="grid-two md:grid-cols-2">
        <label class="field">
          <span>From Date</span>
          <input v-model="reportFilters.fromDate" type="date" />
        </label>

        <label class="field">
          <span>To Date</span>
          <input v-model="reportFilters.toDate" type="date" />
        </label>
      </div>
    </section>

    <section class="panel">
      <h2>Select report type</h2>
      <label
        v-for="option in reportTypeOptions"
        :key="option.value"
        class="report-option"
        :class="{ active: reportFilters.reportType === option.value }"
      >
        <input v-model="reportFilters.reportType" type="radio" :value="option.value" />
        <div>
          <strong>{{ option.label }}</strong>
          <p>{{ option.description }}</p>
        </div>
      </label>
    </section>

    <section class="panel preview">
      <h2>Preview</h2>
      <p>{{ filteredRecords.length }} record(s) included</p>
    </section>

    <footer class="export-actions pb-1">
      <button class="btn excel" type="button" @click="generateExcel">Generate Excel</button>
      <button class="btn pdf" type="button" @click="generatePdf">Generate PDF</button>
    </footer>
  </main>

  <main v-else class="page">
    <section class="panel">
      <h1>Book not found</h1>
      <RouterLink to="/">Go back</RouterLink>
    </section>
  </main>
</template>

<script setup>
import { computed, reactive } from 'vue'
import { useRoute } from 'vue-router'
import { useToast } from 'vue-toastification'

import { useBooksStore } from '../stores/books'

const route = useRoute()
const booksStore = useBooksStore()
const toast = useToast()

const book = computed(() => booksStore.getBookById(route.params.id))

const reportFilters = reactive({
  duration: 'all',
  entryType: route.query.type || 'all',
  paymentMode: 'all',
  searchTerm: route.query.q || '',
  reportType: 'allEntries',
  fromDate: route.query.from || '',
  toDate: '',
})

const reportTypeOptions = [
  {
    value: 'allEntries',
    label: 'All Entries Report',
    description: 'List of all entries and details',
  },
  {
    value: 'dayWise',
    label: 'Day-wise summary',
    description: 'Day-wise total in, out and balance',
  },
  {
    value: 'contactWise',
    label: 'Contact-wise summary',
    description: 'Contact-wise total in, out and balance',
  },
  {
    value: 'categoryWise',
    label: 'Category-wise summary',
    description: 'Income and expenses of all categories',
  },
  {
    value: 'paymentWise',
    label: 'Payment Modes summary',
    description: 'Income and expenses by all payment modes',
  },
]

const durationLabel = computed(() => {
  if (reportFilters.duration === 'month') {
    return 'This Month'
  }
  if (reportFilters.duration === 'custom') {
    return `${reportFilters.fromDate || 'Start'} - ${reportFilters.toDate || 'End'}`
  }
  return 'All Time'
})

const entryTypeLabel = computed(() => {
  if (reportFilters.entryType === 'income') {
    return 'Cash In'
  }
  if (reportFilters.entryType === 'expense') {
    return 'Cash Out'
  }
  return 'All'
})

const paymentModeLabel = computed(() =>
  reportFilters.paymentMode === 'all' ? 'All' : reportFilters.paymentMode,
)

const filteredRecords = computed(() => {
  if (!book.value) {
    return []
  }

  const now = new Date()

  return booksStore.getRecordsByBookId(book.value.id).filter((record) => {
    const matchesType =
      reportFilters.entryType === 'all' || record.type === reportFilters.entryType

    const matchesMode =
      reportFilters.paymentMode === 'all' ||
      (record.paymentMode || 'Cash') === reportFilters.paymentMode

    const search = reportFilters.searchTerm.toLowerCase()
    const haystack = [
      record.note,
      record.contact,
      record.category,
      record.amount?.toString(),
      record.paymentMode,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    const matchesSearch = !search || haystack.includes(search)

    let matchesDuration = true
    const recordDate = new Date(record.date)
    if (reportFilters.duration === 'month') {
      matchesDuration =
        recordDate.getMonth() === now.getMonth() &&
        recordDate.getFullYear() === now.getFullYear()
    } else if (reportFilters.duration === 'custom') {
      if (reportFilters.fromDate) {
        matchesDuration = matchesDuration && record.date >= reportFilters.fromDate
      }
      if (reportFilters.toDate) {
        matchesDuration = matchesDuration && record.date <= reportFilters.toDate
      }
    }

    return matchesType && matchesMode && matchesSearch && matchesDuration
  })
})

const reportPayload = computed(() => {
  const rows = buildRows(reportFilters.reportType, filteredRecords.value)

  return {
    headers: rows.headers,
    body: rows.body,
    title: `${book.value?.name || 'Book'} - ${rows.title}`,
  }
})

function buildRows(type, records) {
  if (type === 'dayWise') {
    return buildGroupedRows(records, (record) => record.date, 'Day-wise summary')
  }

  if (type === 'contactWise') {
    return buildGroupedRows(records, (record) => record.contact || 'No Contact', 'Contact-wise summary')
  }

  if (type === 'categoryWise') {
    return buildGroupedRows(records, (record) => record.category || 'Uncategorized', 'Category-wise summary')
  }

  if (type === 'paymentWise') {
    return buildGroupedRows(records, (record) => record.paymentMode || 'Cash', 'Payment mode summary')
  }

  return {
    title: 'All entries report',
    headers: ['Date', 'Time', 'Type', 'Amount', 'Contact', 'Remark', 'Category', 'Mode'],
    body: records.map((record) => [
      record.date,
      record.time || '',
      record.type,
      record.amount,
      record.contact || '',
      record.note || '',
      record.category || '',
      record.paymentMode || 'Cash',
    ]),
  }
}

function buildGroupedRows(records, keyFn, title) {
  const map = new Map()
  for (const record of records) {
    const key = keyFn(record)
    const bucket = map.get(key) || { in: 0, out: 0 }
    if (record.type === 'income') {
      bucket.in += Number(record.amount) || 0
    } else {
      bucket.out += Number(record.amount) || 0
    }
    map.set(key, bucket)
  }

  const body = Array.from(map.entries()).map(([key, value]) => [
    key,
    value.in,
    value.out,
    value.in - value.out,
  ])

  return {
    title,
    headers: ['Group', 'Total In', 'Total Out', 'Balance'],
    body,
  }
}

async function generateExcel() {
  if (!reportPayload.value.body.length) {
    toast.error('No records to export')
    return
  }

  const rows = [reportPayload.value.headers, ...reportPayload.value.body]
  const csv = rows
    .map((row) =>
      row
        .map((cell) => {
          const value = cell == null ? '' : String(cell)
          const escaped = value.replace(/"/g, '""')
          return /[",\n]/.test(value) ? `"${escaped}"` : escaped
        })
        .join(','),
    )
    .join('\n')

  const filename = `${sanitizeName(book.value?.name || 'book')}-${reportFilters.reportType}-report.csv`
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)

  toast.success('Excel-compatible CSV report generated')
}

async function generatePdf() {
  if (!reportPayload.value.body.length) {
    toast.error('No records to export')
    return
  }

  const { default: jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')
  const doc = new jsPDF()
  doc.setFontSize(12)
  doc.text(reportPayload.value.title, 14, 14)
  autoTable(doc, {
    head: [reportPayload.value.headers],
    body: reportPayload.value.body,
    startY: 20,
    styles: { fontSize: 9 },
  })
  const filename = `${sanitizeName(book.value?.name || 'book')}-${reportFilters.reportType}-report.pdf`
  doc.save(filename)
  toast.success('PDF report generated')
}

function sanitizeName(value) {
  return value.replace(/[^a-z0-9]+/gi, '-').toLowerCase()
}
</script>

<style scoped>
.page {
  width: min(100%, 430px);
  margin: 0 auto;
  padding: 0.65rem 0.65rem 1rem;
  display: grid;
  gap: 0.65rem;
}

.top-bar {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.back-link {
  min-width: 34px;
  height: 34px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  background: #fffdfa;
  border: 1px solid rgba(101, 83, 40, 0.12);
  color: #2f3352;
  text-decoration: none;
}

.top-bar h1,
.top-bar p {
  margin: 0;
}

.top-bar h1 {
  font-size: 1rem;
}

.top-bar p {
  font-size: 0.74rem;
  color: #7a715f;
}

.summary-strip {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.45rem;
  padding: 0.6rem;
  border-radius: 12px;
  background: rgba(255, 252, 244, 0.9);
  border: 1px solid rgba(101, 83, 40, 0.12);
}

.summary-strip article span,
.summary-strip article strong {
  display: block;
}

.summary-strip article span {
  font-size: 0.66rem;
  color: #7a715f;
}

.summary-strip article strong {
  margin-top: 0.08rem;
  font-size: 0.8rem;
  color: #1d2b57;
}

.panel {
  padding: 0.75rem;
  border-radius: 12px;
  background: rgba(255, 252, 244, 0.9);
  border: 1px solid rgba(101, 83, 40, 0.12);
}

.panel h2,
.panel p {
  margin: 0;
}

.panel h2 {
  font-size: 0.88rem;
  margin-bottom: 0.6rem;
}

.panel.preview p {
  font-size: 0.8rem;
  color: #5f5b48;
}

.grid-two {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.45rem;
  margin-bottom: 0.45rem;
}

.field {
  display: grid;
  gap: 0.28rem;
}

.field span {
  font-size: 0.68rem;
  color: #6b634f;
  font-weight: 700;
}

.field input,
.field select {
  border: 1px solid rgba(101, 83, 40, 0.12);
  border-radius: 10px;
  padding: 0.55rem 0.6rem;
  background: #fffdfa;
  font-size: 0.78rem;
}

.report-option {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 0.5rem;
  align-items: start;
  padding: 0.55rem;
  border-radius: 10px;
  margin-bottom: 0.4rem;
  border: 1px solid transparent;
}

.report-option.active {
  background: #eef0fb;
  border-color: #d8def5;
}

.report-option strong,
.report-option p {
  margin: 0;
}

.report-option strong {
  font-size: 0.82rem;
}

.report-option p {
  font-size: 0.72rem;
  color: #7a715f;
}

.export-actions {
  display: grid;
  gap: 0.45rem;
}

.btn {
  border: 0;
  border-radius: 8px;
  padding: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-size: 0.78rem;
  font-weight: 800;
}

.btn.excel {
  background: #fffdfa;
  color: #325bc5;
  border: 1px solid #b9c7f2;
}

.btn.pdf {
  background: linear-gradient(135deg, #4a67df, #5878ff);
  color: #fff8ea;
}
</style>
