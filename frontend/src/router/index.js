import { createRouter, createWebHistory } from 'vue-router'


const routes = [
  {
    path: '/',
    name: 'BookList',
    component: () => import('../views/BookListView.vue'),
    meta: { title: 'Hebo - Dashboard' },
  },
  {
    path: '/book/:id',
    name: 'BookDetails',
    component: () => import('../views/BookDetailsView.vue'),
    props: true,
    meta: { title: 'Hebo - Book Details' },
  },
  {
    path: '/book/:id/report',
    name: 'BookReport',
    component: () => import('../views/GenerateReportView.vue'),
    props: true,
    meta: { title: 'Hebo - Generate Report' },
  },
  {
    path: '/book/:id/records-transfer',
    name: 'RecordTransfer',
    component: () => import('../views/RecordTransferView.vue'),
    props: true,
    meta: { title: 'Hebo - Transfer Records' },
  },
  {
    path: '/book/:id/business-transfer',
    name: 'BookBusinessTransfer',
    component: () => import('../views/BookBusinessTransferView.vue'),
    props: true,
    meta: { title: 'Hebo - Transfer Book' },
  },
  {
    path: '/tenant/register',
    name: 'TenantRegister',
    component: () => import('../views/TenantRegisterView.vue'),
    meta: { title: 'Hebo - Register Tenant' },
  },
  {
    path: '/auth/login',
    name: 'Login',
    component: () => import('../views/LoginView.vue'),
    meta: { title: 'Hebo - Login' },
  },
  {
    path: '/sync/conflicts',
    name: 'SyncConflicts',
    component: () => import('../views/SyncConflictsView.vue'),
    meta: { title: 'Hebo - Sync Conflicts' },
  },
  {
    path: '/settings/backup',
    name: 'BackupRestore',
    component: () => import('../views/BackupRestoreView.vue'),
    meta: { title: 'Hebo - Backup & Restore' },
  },
  {
    path: '/settings',
    name: 'Settings',
    component: () => import('../views/SettingsView.vue'),
    meta: { title: 'Hebo - Settings' },
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

const ONBOARDING_KEY = 'hebo.onboarding.completed.v1'
const BUSINESSES_KEY = 'hebo.businesses.v1'

function hasMeaningfulTenantData() {
  if (typeof window === 'undefined') {
    return true
  }

  try {
    const raw = window.localStorage.getItem(BUSINESSES_KEY)
    if (!raw) {
      return false
    }
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed) || !parsed.length) {
      return false
    }

    if (parsed.length > 1) {
      return true
    }

    const first = parsed[0] || {}
    const name = (first.name || '').trim()
    return name !== 'My Business' || Boolean(first.email) || Boolean(first.phone)
  } catch {
    return false
  }
}

router.beforeEach((to) => {
  if (typeof window === 'undefined') {
    return true
  }

  const isOnboardedFlag = window.localStorage.getItem(ONBOARDING_KEY) === 'true'
  const isOnboarded = isOnboardedFlag || hasMeaningfulTenantData()
  if (isOnboarded && !isOnboardedFlag) {
    window.localStorage.setItem(ONBOARDING_KEY, 'true')
  }

  if (!isOnboarded && to.name !== 'TenantRegister' && to.name !== 'Login') {
    return { name: 'TenantRegister' }
  }

  return true
})

router.afterEach((to) => {
  document.title = to.meta.title || 'Hebo'
})

export default router
