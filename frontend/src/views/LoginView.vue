<template>
  <main class="mx-auto grid w-full max-w-[430px] gap-3 px-2.5 pb-4 pt-2.5">
    <header class="flex items-center gap-2">
      <RouterLink
        class="grid h-9 w-9 place-items-center rounded-xl border border-[#6553281f] bg-[#fffdfa] text-[#2f3352] no-underline"
        :to="{ name: 'TenantRegister' }"
      >
        &larr;
      </RouterLink>
      <div>
        <h1 class="m-0 text-[1rem]">Login</h1>
        <p class="m-0 text-[0.74rem] text-[#7a715f]">Use your email and password to load tenant data.</p>
      </div>
    </header>

    <section class="rounded-xl border border-[#6553281f] bg-[rgba(255,252,244,0.9)] p-3">
      <label class="mb-2 grid gap-1">
        <span class="text-[0.75rem] font-bold text-[#342716]">Email</span>
        <input
          v-model.trim="email"
          class="rounded-[10px] border border-[#6553281f] bg-[#fffdfa] px-3 py-2.5"
          type="email"
          placeholder="name@business.com"
        />
      </label>

      <label class="mb-3 grid gap-1">
        <span class="text-[0.75rem] font-bold text-[#342716]">Password</span>
        <input
          v-model="password"
          class="rounded-[10px] border border-[#6553281f] bg-[#fffdfa] px-3 py-2.5"
          type="password"
          placeholder="Your password"
        />
      </label>

      <button
        class="w-full rounded-full border-0 bg-[linear-gradient(135deg,#14532d,#1f7a45)] px-3.5 py-2.5 font-bold text-[#fff8ea]"
        type="button"
        @click="login"
      >
        Login
      </button>
    </section>
  </main>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'

import { loginUser } from '../services/api'
import { useBooksStore } from '../stores/books'
import { useBusinessesStore } from '../stores/businesses'

const toast = useToast()
const router = useRouter()
const businessesStore = useBusinessesStore()
const booksStore = useBooksStore()

const email = ref('')
const password = ref('')

async function login() {
  if (!email.value) {
    toast.error('Email is required')
    return
  }
  if (!password.value || password.value.length < 6) {
    toast.error('Password must be at least 6 characters')
    return
  }

  try {
    await loginUser({
      email: email.value,
      password: password.value,
    })

    const synced = await businessesStore.syncBusinessesFromBackend()
    if (!synced.ok) {
      toast.error('Login worked, but businesses could not load yet')
    }
    const booksSynced = await booksStore.syncFromBackendSnapshot()
    if (!booksSynced.ok && booksSynced.reason !== 'local_unsynced_changes') {
      toast.info('Logged in, but book snapshot is not loaded yet')
    }

    businessesStore.continueAsGuest()
    toast.success('Logged in')
    router.push({ name: 'BookList' })
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Login failed')
  }
}
</script>
