<template>
  <main class="mx-auto grid w-full max-w-[430px] gap-2.5 px-2.5 pb-24 pt-2.5">
    <section class="flex items-center justify-between gap-2.5">
      <button class="flex items-center gap-2.5 border-0 bg-transparent p-0 text-left" type="button" @click="showBusinessSheet = true">
        <span class="grid h-[38px] min-w-[38px] place-items-center rounded-[13px] border border-[#6553281f] bg-[rgba(255,252,246,0.96)] text-[0.72rem] font-extrabold shadow-[0_10px_24px_rgba(82,61,20,0.08)]">
          {{ getInitials(selectedBusiness.name) }}
        </span>
        <span>
          <strong class="block text-[#342716]">{{ selectedBusiness.name }}</strong>
          <small class="block text-[0.74rem] text-[#7a715f]">Tap to switch business</small>
        </span>
      </button>

      <div class="flex items-center gap-1.5">
        <button class="h-[38px] min-w-[38px] rounded-[13px] border border-[#6553281f] bg-[rgba(255,252,246,0.96)] px-3 text-[0.82rem] font-bold text-[#7c5515] shadow-[0_10px_24px_rgba(82,61,20,0.08)]" type="button" @click="openInviteSheet()">Team</button>
        <button class="h-[38px] min-w-[38px] rounded-[13px] border border-[#6553281f] bg-[rgba(255,252,246,0.96)] px-3 text-[0.82rem] font-bold text-[#345acb] shadow-[0_10px_24px_rgba(82,61,20,0.08)]" type="button" @click="openSettings">
          Settings
        </button>
      </div>
    </section>

    <section class="grid gap-1 rounded-xl bg-[radial-gradient(circle_at_top_right,rgba(255,203,92,0.35),transparent_24%),linear-gradient(135deg,#4f3510,#7c5515_55%,#9f7426)] px-2.5 py-2 text-[#fff8ea] shadow-[0_8px_16px_rgba(88,59,16,0.14)]">
      <div class="grid gap-1">
        <p class="m-0 text-[0.68rem] uppercase tracking-[0.12em] text-[rgba(255,248,234,0.82)]">Hebo Books</p>
        <div class="flex min-w-0 items-center gap-1.5 overflow-hidden text-ellipsis whitespace-nowrap">
          <strong class="text-[0.92rem]">{{ formatCurrency(selectedBusinessBalance) }}</strong>
          <span class="text-[0.74rem] text-[rgba(255,248,234,0.82)]">{{ selectedBusinessBookCount }} books</span>
          <span class="text-[0.74rem] text-[rgba(255,248,234,0.82)]">{{ selectedBusiness.name }}</span>
        </div>
      </div>
    </section>

    <section class="flex items-center justify-between gap-2.5 rounded-[14px] border border-[#6553281f] bg-[rgba(255,252,244,0.9)] px-3 py-2.5 shadow-[0_14px_32px_rgba(82,61,20,0.08)]">
      <div>
        <p class="mb-0.5 mt-0 text-[0.68rem] uppercase tracking-[0.12em] text-[#916f22]">Dashboard</p>
        <h2 class="m-0 text-base text-[#342716]">Your Books</h2>
        <p class="m-0 text-[0.74rem] text-[#7a715f]">{{ filteredBooks.length }} books ready to review</p>
      </div>

      <div class="flex flex-wrap justify-end gap-1">
        <button class="h-[38px] min-w-[38px] rounded-[13px] border border-[#6553281f] bg-[rgba(255,252,246,0.96)] px-3 text-[0.82rem] font-bold text-[#7c5515] shadow-[0_10px_24px_rgba(82,61,20,0.08)]" type="button" @click="showSortSheet = true">Sort</button>
        <button class="h-[38px] min-w-[38px] rounded-[13px] border border-[#6553281f] bg-[rgba(255,252,246,0.96)] px-3 text-[0.82rem] font-bold text-[#7c5515] shadow-[0_10px_24px_rgba(82,61,20,0.08)]" type="button" @click="showSearchSheet = true">Search</button>
      </div>
    </section>

    <BookList :books="filteredBooks" @toggle-menu="toggleBookMenu" />

    <button class="fixed bottom-16 right-3 z-10 max-w-[calc(100vw-1.5rem)] whitespace-nowrap rounded-full border-0 bg-[linear-gradient(135deg,#14532d,#1f7a45)] px-4 py-3 text-[0.82rem] font-bold text-[#fff8ea] shadow-[0_10px_20px_rgba(20,83,45,0.2)]" type="button" @click="showAddBookSheet = true">
      + Add Book
    </button>

    <nav class="fixed inset-x-0 bottom-0 z-10 bg-[rgba(255,252,246,0.96)] pb-[max(0.35rem,env(safe-area-inset-bottom))] pt-1.5 shadow-[0_-8px_20px_rgba(82,61,20,0.1)] backdrop-blur-[6px]">
      <div class="mx-auto grid w-full max-w-[430px] grid-cols-2 gap-2 px-2.5">
        <RouterLink
          class="grid place-items-center rounded-[12px] border border-[#6553281f] px-3 py-2 text-[0.78rem] font-bold no-underline"
          :class="route.name === 'BookList' ? 'bg-[rgba(255,237,204,0.7)] text-[#7c5515]' : 'bg-[#fffdfa] text-[#5d4930]'"
          :to="{ name: 'BookList' }"
        >
          Books
        </RouterLink>
        <RouterLink
          class="grid place-items-center rounded-[12px] border border-[#6553281f] px-3 py-2 text-[0.78rem] font-bold no-underline"
          :class="route.name === 'Settings' ? 'bg-[rgba(255,237,204,0.7)] text-[#7c5515]' : 'bg-[#fffdfa] text-[#5d4930]'"
          :to="{ name: 'Settings' }"
        >
          Settings
        </RouterLink>
      </div>
    </nav>

    <div v-if="activeMenuBook" class="fixed inset-0 z-20 flex items-start justify-end bg-[rgba(27,31,44,0.45)] px-4 pt-40" @click="activeMenuBook = null">
      <section class="w-[min(220px,calc(100vw-1.4rem))] rounded-[14px] bg-[rgba(255,252,244,0.98)] p-2 shadow-[0_-10px_40px_rgba(82,61,20,0.18)]" @click.stop>
        <button class="w-full rounded-[10px] bg-transparent px-2.5 py-2 text-left text-[0.85rem] text-[#342716]" type="button" @click="openRenameSheet">Rename</button>
        <button class="w-full rounded-[10px] bg-transparent px-2.5 py-2 text-left text-[0.85rem] text-[#342716]" type="button" @click="duplicateSelectedBook">Duplicate Book</button>
        <button class="w-full rounded-[10px] bg-transparent px-2.5 py-2 text-left text-[0.85rem] text-[#342716]" type="button" @click="openInviteSheet(activeMenuBook)">Add Members</button>
        <button class="w-full rounded-[10px] bg-transparent px-2.5 py-2 text-left text-[0.85rem] text-[#342716]" type="button" @click="openBookTransfer('move')">Move book</button>
        <button class="w-full rounded-[10px] bg-transparent px-2.5 py-2 text-left text-[0.85rem] text-[#342716]" type="button" @click="openBookTransfer('copy')">Copy book</button>
        <button class="w-full rounded-[10px] bg-transparent px-2.5 py-2 text-left text-[0.85rem] text-[#c23c37]" type="button" @click="deleteSelectedBook">Delete Book</button>
      </section>
    </div>

    <div v-if="showSearchSheet" class="fixed inset-0 z-20 flex items-end justify-center bg-[rgba(27,31,44,0.45)]" @click="showSearchSheet = false">
      <section class="w-full max-w-[430px] rounded-t-2xl bg-[rgba(255,252,244,0.98)] p-3 shadow-[0_-10px_40px_rgba(82,61,20,0.18)]" @click.stop>
        <div class="mb-3.5 flex items-center gap-3">
          <button class="border-0 bg-transparent text-2xl text-[#5d4930]" type="button" @click="showSearchSheet = false">x</button>
          <h2 class="m-0 text-[0.95rem]">Search by book name</h2>
        </div>
        <input
          v-model="searchQuery"
          class="w-full rounded-[10px] border border-[#6553281f] bg-[#fffdfa] px-3 py-2.5"
          type="text"
          placeholder="Type a book name"
        />
      </section>
    </div>

    <div v-if="showSortSheet" class="fixed inset-0 z-20 flex items-end justify-center bg-[rgba(27,31,44,0.45)]" @click="showSortSheet = false">
      <section class="w-full max-w-[430px] rounded-t-2xl bg-[rgba(255,252,244,0.98)] p-3 shadow-[0_-10px_40px_rgba(82,61,20,0.18)]" @click.stop>
        <div class="mb-3.5 flex items-center gap-3">
          <button class="border-0 bg-transparent text-2xl text-[#5d4930]" type="button" @click="showSortSheet = false">x</button>
          <h2 class="m-0 text-[0.95rem]">Sort Books By</h2>
        </div>

        <button
          v-for="option in sortOptions"
          :key="option.value"
          class="w-full rounded-[10px] bg-transparent px-2.5 py-2.5 text-left text-[0.85rem] text-[#342716]"
          :class="sortBy === option.value ? 'bg-[rgba(255,237,204,0.7)]' : ''"
          type="button"
          @click="sortBy = option.value"
        >
          {{ option.label }}
        </button>
      </section>
    </div>

    <div v-if="showBusinessSheet" class="fixed inset-0 z-20 flex items-end justify-center bg-[rgba(27,31,44,0.45)]" @click="closeBusinessSheet">
      <section class="w-full max-w-[430px] rounded-t-2xl bg-[rgba(255,252,244,0.98)] p-3 shadow-[0_-10px_40px_rgba(82,61,20,0.18)]" @click.stop>
        <div class="mb-3.5 flex items-center gap-3">
          <button class="border-0 bg-transparent text-2xl text-[#5d4930]" type="button" @click="closeBusinessSheet">x</button>
          <h2 class="m-0 text-[0.95rem]">Select Business</h2>
        </div>

        <article
          v-for="business in businesses"
          :key="business.id"
          class="mb-2 grid cursor-pointer grid-cols-[32px_minmax(0,1fr)_auto] items-center gap-2 rounded-xl p-2.5"
          :class="selectedBusinessId === business.id ? 'bg-[rgba(255,237,204,0.7)]' : ''"
          @click="selectBusiness(business.id)"
        >
          <div class="grid h-[38px] min-w-[38px] place-items-center rounded-[13px] border border-[#6553281f] bg-[rgba(255,252,246,0.96)] text-[0.72rem] font-extrabold shadow-[0_10px_24px_rgba(82,61,20,0.08)]">{{ getInitials(business.name) }}</div>
          <div>
            <strong class="m-0 text-[#342716]">{{ business.name }}</strong>
            <p class="m-0 text-[0.74rem] text-[#7a715f]">Your Role: Primary Admin - {{ getBusinessBookCount(business.id) }} Books</p>
          </div>
          <span>{{ selectedBusinessId === business.id ? 'OK' : '' }}</span>
        </article>

        <button class="rounded-full border-0 bg-[linear-gradient(135deg,#14532d,#1f7a45)] px-3.5 py-2.5 text-[#fff8ea] shadow-[0_12px_24px_rgba(20,83,45,0.18)]" type="button" @click="showAddBusinessSheet = true">
          + Add New Business
        </button>
      </section>
    </div>

    <div v-if="showAddBusinessSheet" class="fixed inset-0 z-20 flex items-end justify-center bg-[rgba(27,31,44,0.45)]" @click="closeAddBusinessSheet">
      <section class="w-full max-w-[430px] rounded-t-2xl bg-[rgba(255,252,244,0.98)] p-3 shadow-[0_-10px_40px_rgba(82,61,20,0.18)]" @click.stop>
        <div class="mb-3.5 flex items-center gap-3">
          <button class="border-0 bg-transparent text-2xl text-[#5d4930]" type="button" @click="closeAddBusinessSheet">x</button>
          <h2 class="m-0 text-[0.95rem]">Add New Business</h2>
        </div>

        <label class="mb-4 grid gap-1.5">
          <span class="font-bold text-[#342716]">Business name</span>
          <input
            v-model.trim="newBusinessName"
            class="w-full rounded-[10px] border border-[#6553281f] bg-[#fffdfa] px-3 py-2.5"
            type="text"
            placeholder="Example: Gig Traders"
          />
        </label>

        <button class="w-full rounded-full border-0 bg-[linear-gradient(135deg,#14532d,#1f7a45)] px-3.5 py-2.5 text-center text-[#fff8ea] shadow-[0_12px_24px_rgba(20,83,45,0.18)]" type="button" @click="addBusiness">
          Save Business
        </button>
      </section>
    </div>

    <div v-if="showAddBookSheet" class="fixed inset-0 z-20 flex items-end justify-center bg-[rgba(27,31,44,0.45)]" @click="closeAddBookSheet">
      <section class="w-full max-w-[430px] rounded-t-2xl bg-[rgba(255,252,244,0.98)] p-3 shadow-[0_-10px_40px_rgba(82,61,20,0.18)]" @click.stop>
        <div class="mb-3.5 flex items-center gap-3">
          <button class="border-0 bg-transparent text-2xl text-[#5d4930]" type="button" @click="closeAddBookSheet">x</button>
          <h2 class="m-0 text-[0.95rem]">Add New Book</h2>
        </div>

        <AddBook @submit="handleAddBook" />
      </section>
    </div>

    <div v-if="showRenameSheet" class="fixed inset-0 z-20 flex items-end justify-center bg-[rgba(27,31,44,0.45)]" @click="closeRenameSheet">
      <section class="w-full max-w-[430px] rounded-t-2xl bg-[rgba(255,252,244,0.98)] p-3 shadow-[0_-10px_40px_rgba(82,61,20,0.18)]" @click.stop>
        <div class="mb-3.5 flex items-center gap-3">
          <button class="border-0 bg-transparent text-2xl text-[#5d4930]" type="button" @click="closeRenameSheet">x</button>
          <h2 class="m-0 text-[0.95rem]">Rename Book</h2>
        </div>

        <label class="mb-4 grid gap-1.5">
          <span class="font-bold text-[#342716]">Book name</span>
          <input v-model.trim="renameValue" class="w-full rounded-[10px] border border-[#6553281f] bg-[#fffdfa] px-3 py-2.5" type="text" />
        </label>

        <button class="w-full rounded-full border-0 bg-[linear-gradient(135deg,#14532d,#1f7a45)] px-3.5 py-2.5 text-center text-[#fff8ea] shadow-[0_12px_24px_rgba(20,83,45,0.18)]" type="button" @click="renameSelectedBook">
          Save Name
        </button>
      </section>
    </div>

    <div v-if="showInviteSheet" class="fixed inset-0 z-20 flex items-end justify-center bg-[rgba(27,31,44,0.45)]" @click="closeInviteSheet">
      <section class="grid w-full max-w-[430px] gap-4 rounded-t-2xl bg-[rgba(255,252,244,0.98)] p-3 shadow-[0_-10px_40px_rgba(82,61,20,0.18)]" @click.stop>
        <div class="mb-1 flex items-center gap-3">
          <button class="border-0 bg-transparent text-2xl text-[#5d4930]" type="button" @click="closeInviteSheet">x</button>
          <h2 class="m-0 text-[0.95rem]">Add Team Member</h2>
        </div>

        <section class="flex justify-between gap-2.5 rounded-xl bg-[radial-gradient(circle_at_top_right,rgba(255,203,92,0.3),transparent_26%),linear-gradient(135deg,#4f3510,#7c5515_55%,#9f7426)] p-3 text-[#fff8ea]">
          <div>
            <p class="m-0 text-[0.68rem] uppercase tracking-[0.12em] text-[rgba(255,248,234,0.82)]">Invite people</p>
            <h3 class="m-0">Add users to this business</h3>
            <p class="m-0">Send a secure invite link or prepare an email invite for the selected book.</p>
          </div>
          <div class="grid h-[46px] min-w-[46px] place-items-center rounded-xl bg-[rgba(255,248,234,0.16)] text-[0.7rem] font-bold">TEAM</div>
        </section>

        <div class="grid grid-cols-2 gap-1.5">
          <button
            class="rounded-[10px] border border-[#6553281f] bg-[#fffdfa] px-2.5 py-2 text-[0.78rem] font-bold text-[#5d4930]"
            :class="inviteMode === 'link' ? 'bg-[rgba(255,237,204,0.7)] text-[#7c5515]' : ''"
            type="button"
            @click="inviteMode = 'link'"
          >
            Invite Link
          </button>
          <button
            class="rounded-[10px] border border-[#6553281f] bg-[#fffdfa] px-2.5 py-2 text-[0.78rem] font-bold text-[#5d4930]"
            :class="inviteMode === 'email' ? 'bg-[rgba(255,237,204,0.7)] text-[#7c5515]' : ''"
            type="button"
            @click="inviteMode = 'email'"
          >
            Email Invite
          </button>
        </div>

        <section v-if="inviteMode === 'link'" class="grid gap-2">
          <label class="mb-1 grid gap-1.5">
            <span class="font-bold text-[#342716]">Share link</span>
            <input :value="inviteLink" class="w-full rounded-[10px] border border-[#6553281f] bg-[#fffdfa] px-3 py-2.5" type="text" readonly />
          </label>

          <button class="w-full rounded-full border-0 bg-[linear-gradient(135deg,#14532d,#1f7a45)] px-3.5 py-2.5 text-center text-[#fff8ea] shadow-[0_12px_24px_rgba(20,83,45,0.18)]" type="button" @click="copyInviteLink">
            {{ inviteStatus || 'Copy Invite Link' }}
          </button>
        </section>

        <section v-else class="grid gap-2">
          <label class="mb-1 grid gap-1.5">
            <span class="font-bold text-[#342716]">Email address</span>
            <input
              v-model.trim="inviteEmail"
              class="w-full rounded-[10px] border border-[#6553281f] bg-[#fffdfa] px-3 py-2.5"
              type="email"
              placeholder="name@example.com"
            />
          </label>

          <label class="mb-1 grid gap-1.5">
            <span class="font-bold text-[#342716]">Role</span>
            <select v-model="inviteRole" class="w-full rounded-[10px] border border-[#6553281f] bg-[#fffdfa] px-3 py-2.5">
              <option value="admin">Admin</option>
              <option value="employee">Employee</option>
            </select>
          </label>

          <a class="block w-full rounded-full border-0 bg-[linear-gradient(135deg,#14532d,#1f7a45)] px-3.5 py-2.5 text-center text-[#fff8ea] no-underline shadow-[0_12px_24px_rgba(20,83,45,0.18)]" :href="inviteMailto">
            Send Invite Email
          </a>

          <button
            class="w-full rounded-full border border-[#6553281f] bg-[#fffdfa] px-3.5 py-2.5 text-center font-bold text-[#345acb]"
            type="button"
            @click="addMemberLocally"
          >
            Add Member To Team
          </button>
        </section>

        <section class="grid gap-1.5 rounded-[10px] border border-[#6553281f] bg-[#fffdfa] p-2.5">
          <p class="m-0 text-[0.78rem] font-bold text-[#342716]">Team members</p>
          <p v-if="!businessMembers.length" class="m-0 text-[0.74rem] text-[#7a715f]">
            No team members yet.
          </p>
          <article
            v-for="member in businessMembers"
            :key="member.id"
            class="flex items-center justify-between gap-2 rounded-[8px] bg-[rgba(255,252,246,0.96)] px-2 py-1.5"
          >
            <span class="text-[0.76rem] text-[#342716]">{{ member.email }}</span>
            <span class="rounded-full bg-[rgba(255,237,204,0.7)] px-2 py-0.5 text-[0.68rem] font-bold text-[#7c5515]">
              {{ member.role }}
            </span>
          </article>
        </section>
      </section>
    </div>
  </main>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'

import BookList from '../components/BookList.vue'
import AddBook from '../components/AddBook.vue'
import { useBooksStore } from '../stores/books'
import { useBusinessesStore } from '../stores/businesses'

const booksStore = useBooksStore()
const businessesStore = useBusinessesStore()
const { books } = storeToRefs(booksStore)
const { businesses, selectedBusinessId, selectedBusiness } = storeToRefs(businessesStore)
const toast = useToast()
const route = useRoute()
const router = useRouter()
const showBusinessSheet = ref(false)
const showAddBusinessSheet = ref(false)
const showAddBookSheet = ref(false)
const showSearchSheet = ref(false)
const showSortSheet = ref(false)
const showInviteSheet = ref(false)
const showRenameSheet = ref(false)
const searchQuery = ref('')
const sortBy = ref('updated')
const activeMenuBook = ref(null)
const renameValue = ref('')
const newBusinessName = ref('')
const inviteMode = ref('link')
const inviteEmail = ref('')
const inviteRole = ref('employee')
const inviteStatus = ref('')
const selectedInviteBookId = ref('')

const sortOptions = [
  { value: 'updated', label: 'Last Updated' },
  { value: 'name', label: 'Name (A to Z)' },
  { value: 'balance-high', label: 'Net Balance (High to Low)' },
  { value: 'balance-low', label: 'Net Balance (Low to High)' },
  { value: 'created', label: 'Last Created' },
]

const selectedBusinessBooks = computed(() =>
  books.value.filter((book) => book.companyId === selectedBusinessId.value),
)

const selectedBusinessBookCount = computed(() => selectedBusinessBooks.value.length)

const selectedBusinessBalance = computed(() =>
  selectedBusinessBooks.value.reduce(
    (sum, book) => sum + booksStore.getBookSummary(book.id).balance,
    0,
  ),
)

const filteredBooks = computed(() => {
  const filtered = selectedBusinessBooks.value.filter((book) =>
    book.name.toLowerCase().includes(searchQuery.value.toLowerCase()),
  )

  return [...filtered].sort((left, right) => {
    if (sortBy.value === 'name') {
      return left.name.localeCompare(right.name)
    }

    if (sortBy.value === 'balance-high') {
      return booksStore.getBookSummary(right.id).balance - booksStore.getBookSummary(left.id).balance
    }

    if (sortBy.value === 'balance-low') {
      return booksStore.getBookSummary(left.id).balance - booksStore.getBookSummary(right.id).balance
    }

    if (sortBy.value === 'created') {
      return new Date(right.createdAt) - new Date(left.createdAt)
    }

    return new Date(right.updatedAt || right.createdAt) - new Date(left.updatedAt || left.createdAt)
  })
})

const selectedInviteBook = computed(() =>
  selectedInviteBookId.value ? booksStore.getBookById(selectedInviteBookId.value) : null,
)

const inviteLink = computed(() => {
  const bookSegment = selectedInviteBook.value?.id ?? 'all-books'
  return `https://hebo.app/invite/${bookSegment}?role=${inviteRole.value}`
})

const inviteMailto = computed(() => {
  const targetBook = selectedInviteBook.value?.name ?? `${selectedBusiness.value.name} Books`
  const subject = encodeURIComponent(`Join ${targetBook} on Hebo`)
  const body = encodeURIComponent(
    `Hello,\n\nYou have been invited to ${targetBook} as ${inviteRole.value}.\nUse this invite link:\n${inviteLink.value}\n\nThanks.`,
  )

  return `mailto:${inviteEmail.value}?subject=${subject}&body=${body}`
})
const businessMembers = computed(() => businessesStore.getMembersForBusiness(selectedBusinessId.value))

async function handleAddBook(payload) {
  const created = await booksStore.createBook({
    ...payload,
    companyId: selectedBusinessId.value,
  })

  if (created) {
    toast.success('Book added')
  } else {
    toast.error('Book name is invalid or already used in this business')
  }

  showAddBookSheet.value = false
}

function closeAddBookSheet() {
  showAddBookSheet.value = false
}

function toggleBookMenu(bookId) {
  activeMenuBook.value = activeMenuBook.value === bookId ? null : bookId
}

function openRenameSheet() {
  const currentBook = booksStore.getBookById(activeMenuBook.value)
  if (!currentBook) {
    return
  }

  renameValue.value = currentBook.name
  showRenameSheet.value = true
}

function closeRenameSheet() {
  showRenameSheet.value = false
  activeMenuBook.value = null
  renameValue.value = ''
}

async function renameSelectedBook() {
  if (!activeMenuBook.value) {
    return
  }

  const renamed = await booksStore.renameBookEntry(activeMenuBook.value, renameValue.value)
  if (renamed) {
    toast.success('Book renamed')
    closeRenameSheet()
  } else {
    toast.error('Name is invalid or already used in this business')
  }
}

async function duplicateSelectedBook() {
  if (!activeMenuBook.value) {
    return
  }

  const duplicated = await booksStore.duplicateBookEntry(activeMenuBook.value)
  if (duplicated) {
    toast.success('Book duplicated')
  } else {
    toast.error('Could not duplicate book')
  }
  activeMenuBook.value = null
}

async function deleteSelectedBook() {
  if (!activeMenuBook.value) {
    return
  }

  const removed = await booksStore.removeBook(activeMenuBook.value)
  if (!removed) {
    toast.error('Could not delete book')
    return
  }
  toast.success('Book deleted')
  activeMenuBook.value = null
}

function openBookTransfer(mode) {
  if (!activeMenuBook.value) {
    return
  }

  const selectedBookId = activeMenuBook.value
  activeMenuBook.value = null
  router.push({
    name: 'BookBusinessTransfer',
    params: { id: selectedBookId },
    query: { mode },
  })
}

function selectBusiness(businessId) {
  if (businessesStore.selectBusiness(businessId)) {
    closeBusinessSheet()
  }
}

function closeBusinessSheet() {
  showBusinessSheet.value = false
}

function openSettings() {
  router.push({ name: 'Settings' })
}

function closeAddBusinessSheet() {
  showAddBusinessSheet.value = false
  newBusinessName.value = ''
}

async function addBusiness() {
  const business = await businessesStore.addBusinessWithBackend(newBusinessName.value)
  if (!business) {
    toast.error('Business name is required or could not be created')
    return
  }

  await booksStore.createBook({
    name: `${business.name} Main Book`,
    companyId: business.id,
  })
  closeAddBusinessSheet()
  showBusinessSheet.value = false
  toast.success('Business added')
}

onMounted(async () => {
  const result = await businessesStore.syncBusinessesFromBackend()
  if (!result.ok) {
    return
  }
  await booksStore.syncFromBackendSnapshot()
})

function getBusinessBookCount(businessId) {
  return books.value.filter((book) => book.companyId === businessId).length
}

async function copyInviteLink() {
  try {
    await navigator.clipboard.writeText(inviteLink.value)
    inviteStatus.value = 'Invite Link Copied'
    toast.success('Invite link copied')
  } catch {
    inviteStatus.value = 'Copy Failed'
    toast.error('Could not copy invite link')
  }
}

function openInviteSheet(bookId = '') {
  selectedInviteBookId.value = bookId
  inviteMode.value = 'link'
  inviteStatus.value = ''
  showInviteSheet.value = true
  activeMenuBook.value = null
}

function closeInviteSheet() {
  showInviteSheet.value = false
  inviteStatus.value = ''
  inviteEmail.value = ''
  inviteRole.value = 'employee'
  selectedInviteBookId.value = ''
}

function addMemberLocally() {
  const result = businessesStore.addMemberToBusiness({
    businessId: selectedBusinessId.value,
    email: inviteEmail.value,
    role: inviteRole.value,
  })

  if (!result.ok) {
    if (result.reason === 'already_exists') {
      toast.error('This member is already in the team')
      return
    }

    toast.error('Enter a valid email to add member')
    return
  }

  inviteEmail.value = ''
  toast.success('Member added to business team')
}

function formatCurrency(value) {
  return new Intl.NumberFormat('en-UG', {
    style: 'currency',
    currency: 'UGX',
    maximumFractionDigits: 0,
  }).format(value)
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
