import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { createTenantBusiness, fetchTenantBusinesses, hasAuthSession, isBackendConfigured } from '../services/api'

const STORAGE_KEY = 'hebo.businesses.v1'
const SELECTED_STORAGE_KEY = 'hebo.businesses.selected.v1'
const MEMBERS_STORAGE_KEY = 'hebo.businesses.members.v1'
const ONBOARDING_KEY = 'hebo.onboarding.completed.v1'
const fallbackBusinesses = [{ id: 'company-001', name: 'My Business' }]
const fallbackMembers = {}

function readBusinesses() {
  if (typeof window === 'undefined') {
    return [...fallbackBusinesses]
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return [...fallbackBusinesses]
    }

    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed) || !parsed.length) {
      return [...fallbackBusinesses]
    }

    return parsed
      .filter((item) => item && typeof item === 'object')
      .map((item) => ({
        id: item.id,
        name: item.name || 'Business',
        email: item.email || '',
        phone: item.phone || '',
        preferredContact: item.preferredContact || 'email',
        createdAt: item.createdAt || new Date().toISOString(),
      }))
  } catch {
    return [...fallbackBusinesses]
  }
}

function readSelectedBusinessId(currentBusinesses) {
  const fallbackId = currentBusinesses[0]?.id ?? fallbackBusinesses[0].id
  if (typeof window === 'undefined') {
    return fallbackId
  }

  const persistedId = window.localStorage.getItem(SELECTED_STORAGE_KEY)
  if (persistedId && currentBusinesses.some((business) => business.id === persistedId)) {
    return persistedId
  }

  return fallbackId
}

function readMembers() {
  if (typeof window === 'undefined') {
    return { ...fallbackMembers }
  }

  try {
    const raw = window.localStorage.getItem(MEMBERS_STORAGE_KEY)
    if (!raw) {
      return { ...fallbackMembers }
    }

    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') {
      return { ...fallbackMembers }
    }

    return { ...fallbackMembers, ...parsed }
  } catch {
    return { ...fallbackMembers }
  }
}

function hasMeaningfulTenantData(items) {
  if (!Array.isArray(items) || !items.length) {
    return false
  }

  if (items.length > 1) {
    return true
  }

  const first = items[0]
  if (!first) {
    return false
  }

  const name = (first.name || '').trim()
  return name !== 'My Business' || Boolean(first.email) || Boolean(first.phone)
}

function readOnboardingState(currentBusinesses) {
  if (typeof window === 'undefined') {
    return false
  }

  const explicit = window.localStorage.getItem(ONBOARDING_KEY) === 'true'
  if (explicit) {
    return true
  }

  if (hasMeaningfulTenantData(currentBusinesses)) {
    window.localStorage.setItem(ONBOARDING_KEY, 'true')
    return true
  }

  return false
}

export const useBusinessesStore = defineStore('businesses', () => {
  const businesses = ref(readBusinesses())
  const selectedBusinessId = ref(readSelectedBusinessId(businesses.value))
  const membersByBusiness = ref(readMembers())
  const isOnboarded = ref(readOnboardingState(businesses.value))

  const selectedBusiness = computed(() => {
    return (
      businesses.value.find((business) => business.id === selectedBusinessId.value) ??
      businesses.value[0] ??
      fallbackBusinesses[0]
    )
  })

  function selectBusiness(businessId) {
    if (!businesses.value.some((business) => business.id === businessId)) {
      return false
    }

    selectedBusinessId.value = businessId
    return true
  }

  function addBusiness(name) {
    const result = saveBusinessLocally({ name, requireContact: false })
    return result.ok ? result.business : null
  }

  function markOnboardingCompleted() {
    isOnboarded.value = true
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(ONBOARDING_KEY, 'true')
    }
  }

  function continueAsGuest() {
    markOnboardingCompleted()
    return true
  }

  function saveBusinessLocally(payload) {
    const trimmed = payload?.name?.trim()
    const email = (payload?.email || '').trim().toLowerCase()
    const phone = (payload?.phone || '').trim()
    const preferredContact =
      payload?.preferredContact === 'phone' && phone ? 'phone' : 'email'

    if (!trimmed) {
      return { ok: false, reason: 'missing_name' }
    }

    const requireContact = payload?.requireContact !== false
    if (requireContact && !email && !phone) {
      return { ok: false, reason: 'missing_contact' }
    }

    if (email && !email.includes('@')) {
      return { ok: false, reason: 'invalid_email' }
    }

    const existsByName = businesses.value.some(
      (business) => business.name.toLowerCase() === trimmed.toLowerCase(),
    )
    if (existsByName) {
      return { ok: false, reason: 'duplicate_name' }
    }

    const businessId = `company-${Date.now()}`
    const business = {
      id: businessId,
      name: trimmed,
      email,
      phone,
      preferredContact,
      createdAt: new Date().toISOString(),
    }

    businesses.value.unshift(business)
    membersByBusiness.value[businessId] = []
    selectedBusinessId.value = businessId
    markOnboardingCompleted()
    return { ok: true, business }
  }

  function registerTenant(payload) {
    return saveBusinessLocally(payload)
  }

  async function syncBusinessesFromBackend() {
    if (!isBackendConfigured() || !hasAuthSession()) {
      return { ok: false, reason: 'backend_not_ready' }
    }

    try {
      const response = await fetchTenantBusinesses()
      const serverBusinesses = Array.isArray(response?.businesses) ? response.businesses : []
      businesses.value = serverBusinesses.map((item) => ({
        id: item.id,
        name: item.name || 'Business',
        email: '',
        phone: '',
        preferredContact: 'email',
        createdAt: item.created_at || new Date().toISOString(),
      }))

      if (!businesses.value.length) {
        businesses.value = [...fallbackBusinesses]
      }

      if (!businesses.value.some((item) => item.id === selectedBusinessId.value)) {
        selectedBusinessId.value = businesses.value[0].id
      }

      return { ok: true }
    } catch (error) {
      return {
        ok: false,
        reason: error instanceof Error ? error.message : 'Could not sync businesses',
      }
    }
  }

  async function addBusinessWithBackend(name) {
    const trimmed = (name || '').trim()
    if (!trimmed) {
      return null
    }

    if (isBackendConfigured() && hasAuthSession()) {
      try {
        const response = await createTenantBusiness({ name: trimmed })
        const business = response?.business
        if (business?.id) {
          const next = {
            id: business.id,
            name: business.name || trimmed,
            email: '',
            phone: '',
            preferredContact: 'email',
            createdAt: new Date().toISOString(),
          }
          businesses.value.unshift(next)
          selectedBusinessId.value = next.id
          markOnboardingCompleted()
          return next
        }
      } catch {
        return null
      }
    }

    const local = saveBusinessLocally({ name: trimmed, requireContact: false })
    return local.ok ? local.business : null
  }

  function getMembersForBusiness(businessId) {
    return membersByBusiness.value[businessId] || []
  }

  function addMemberToBusiness({ businessId, email, role }) {
    const normalizedEmail = (email || '').trim().toLowerCase()
    if (!businessId || !normalizedEmail || !normalizedEmail.includes('@')) {
      return { ok: false, reason: 'invalid_email' }
    }

    const nextRole = role === 'admin' ? 'admin' : 'employee'
    const currentMembers = membersByBusiness.value[businessId] || []
    const exists = currentMembers.some((member) => member.email.toLowerCase() === normalizedEmail)
    if (exists) {
      return { ok: false, reason: 'already_exists' }
    }

    const nextMember = {
      id: `member-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      email: normalizedEmail,
      role: nextRole,
      status: 'active',
      addedAt: new Date().toISOString(),
    }

    membersByBusiness.value[businessId] = [nextMember, ...currentMembers]
    return { ok: true, member: nextMember }
  }

  watch(
    businesses,
    (nextBusinesses) => {
      if (typeof window === 'undefined') {
        return
      }

      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextBusinesses))
    },
    { deep: true },
  )

  watch(selectedBusinessId, (nextSelectedId) => {
    if (typeof window === 'undefined') {
      return
    }

    window.localStorage.setItem(SELECTED_STORAGE_KEY, nextSelectedId)
  })

  watch(
    membersByBusiness,
    (nextMembers) => {
      if (typeof window === 'undefined') {
        return
      }

      window.localStorage.setItem(MEMBERS_STORAGE_KEY, JSON.stringify(nextMembers))
    },
    { deep: true },
  )

  return {
    businesses,
    selectedBusinessId,
    selectedBusiness,
    isOnboarded,
    membersByBusiness,
    selectBusiness,
    addBusiness,
    addBusinessWithBackend,
    registerTenant,
    syncBusinessesFromBackend,
    continueAsGuest,
    getMembersForBusiness,
    addMemberToBusiness,
  }
})
