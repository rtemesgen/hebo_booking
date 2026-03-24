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
        <h1 class="m-0 text-[1rem]">Register Tenant</h1>
        <p class="m-0 text-[0.74rem] text-[#7a715f]">
          Create tenants with email or phone for future backend sync.
        </p>
      </div>
    </header>

    <section class="rounded-xl border border-[#6553281f] bg-[rgba(255,252,244,0.9)] p-3">
      <h2 class="m-0 mb-2 text-[0.9rem]">Tenant details</h2>

      <label class="mb-2 grid gap-1">
        <span class="text-[0.75rem] font-bold text-[#342716]">Tenant / Business Name *</span>
        <input
          v-model.trim="form.name"
          class="rounded-[10px] border border-[#6553281f] bg-[#fffdfa] px-3 py-2.5"
          type="text"
          placeholder="Example: Thomas Traders"
        />
      </label>

      <label class="mb-2 grid gap-1">
        <span class="text-[0.75rem] font-bold text-[#342716]">Your full name</span>
        <input
          v-model.trim="form.fullName"
          class="rounded-[10px] border border-[#6553281f] bg-[#fffdfa] px-3 py-2.5"
          type="text"
          placeholder="Example: Thomas"
        />
      </label>

      <label class="mb-2 grid gap-1">
        <span class="text-[0.75rem] font-bold text-[#342716]">Email</span>
        <input
          v-model.trim="form.email"
          class="rounded-[10px] border border-[#6553281f] bg-[#fffdfa] px-3 py-2.5"
          type="email"
          placeholder="name@business.com"
        />
      </label>

      <label class="mb-2 grid gap-1">
        <span class="text-[0.75rem] font-bold text-[#342716]">Phone</span>
        <input
          v-model.trim="form.phone"
          class="rounded-[10px] border border-[#6553281f] bg-[#fffdfa] px-3 py-2.5"
          type="tel"
          placeholder="+2567..."
        />
      </label>

      <label class="mb-2 grid gap-1">
        <span class="text-[0.75rem] font-bold text-[#342716]">Password (for backend login)</span>
        <input
          v-model="form.password"
          class="rounded-[10px] border border-[#6553281f] bg-[#fffdfa] px-3 py-2.5"
          type="password"
          placeholder="At least 6 characters"
        />
      </label>

      <label class="mb-3 grid gap-1">
        <span class="text-[0.75rem] font-bold text-[#342716]">Preferred contact</span>
        <select
          v-model="form.preferredContact"
          class="rounded-[10px] border border-[#6553281f] bg-[#fffdfa] px-3 py-2.5"
        >
          <option value="email">Email</option>
          <option value="phone">Phone</option>
        </select>
      </label>

      <button
        class="w-full rounded-full border-0 bg-[linear-gradient(135deg,#14532d,#1f7a45)] px-3.5 py-2.5 font-bold text-[#fff8ea]"
        type="button"
        @click="registerTenant"
      >
        Register Tenant
      </button>
      <button
        class="mt-2 w-full rounded-full border border-[#6553281f] bg-[#fffdfa] px-3.5 py-2.5 font-bold text-[#345acb]"
        type="button"
        @click="continueAsGuest"
      >
        Continue as Guest
      </button>
      <RouterLink
        class="mt-2 block w-full rounded-full border border-[#6553281f] bg-[#fffdfa] px-3.5 py-2.5 text-center font-bold text-[#345acb] no-underline"
        :to="{ name: 'Login' }"
      >
        I already have an account
      </RouterLink>
    </section>

    <section class="rounded-xl border border-[#6553281f] bg-[rgba(255,252,244,0.9)] p-3">
      <h2 class="m-0 mb-2 text-[0.9rem]">Registered tenants</h2>
      <p v-if="!tenants.length" class="m-0 text-[0.78rem] text-[#7a715f]">No tenants registered yet.</p>

      <article
        v-for="tenant in tenants"
        :key="tenant.id"
        class="mb-2 rounded-[10px] border border-[#6553281f] bg-[#fffdfa] p-2.5"
      >
        <p class="m-0 text-[0.83rem] font-bold text-[#342716]">{{ tenant.name }}</p>
        <p class="m-0 text-[0.74rem] text-[#7a715f]">
          {{ tenant.email || 'No email' }} - {{ tenant.phone || 'No phone' }}
        </p>
      </article>
    </section>
  </main>
</template>

<script setup>
import { computed, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'

import { useBooksStore } from '../stores/books'
import { useBusinessesStore } from '../stores/businesses'
import { isBackendConfigured, registerUser } from '../services/api'

const toast = useToast()
const router = useRouter()
const businessesStore = useBusinessesStore()
const booksStore = useBooksStore()

const form = reactive({
  name: '',
  fullName: '',
  email: '',
  phone: '',
  password: '',
  preferredContact: 'email',
})

const tenants = computed(() => businessesStore.businesses)

async function registerTenant() {
  const result = businessesStore.registerTenant({
    name: form.name,
    email: form.email,
    phone: form.phone,
    preferredContact: form.preferredContact,
  })

  if (!result.ok) {
    if (result.reason === 'missing_name') {
      toast.error('Tenant name is required')
      return
    }
    if (result.reason === 'missing_contact') {
      toast.error('Provide email or phone')
      return
    }
    if (result.reason === 'invalid_email') {
      toast.error('Email is invalid')
      return
    }
    if (result.reason === 'duplicate_name') {
      toast.error('Tenant name already exists')
      return
    }
    toast.error('Could not register tenant')
    return
  }

  let backendLinked = false
  if (isBackendConfigured()) {
    if (!form.email) {
      toast.error('Email is required for backend registration')
      return
    }
    if (!form.password || form.password.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }

    try {
      await registerUser({
        fullName: form.fullName || form.name,
        email: form.email,
        password: form.password,
        tenantName: form.name,
      })
      await businessesStore.syncBusinessesFromBackend()
      await booksStore.syncFromBackendSnapshot()
      backendLinked = true
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Backend registration failed')
      return
    }
  }

  form.name = ''
  form.fullName = ''
  form.email = ''
  form.phone = ''
  form.password = ''
  form.preferredContact = 'email'
  toast.success(backendLinked ? 'Tenant registered and backend session started' : 'Tenant registered')
  router.push('/')
}

function continueAsGuest() {
  businessesStore.continueAsGuest()
  toast.info('Continuing as guest')
  router.push('/')
}
</script>
