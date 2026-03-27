import { expect, test } from '@playwright/test'

test.describe('Hebo app', () => {
  test('onboarding allows continue as guest', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })

    await expect(page.getByRole('heading', { name: 'Register Tenant' })).toBeVisible()
    await page.getByRole('button', { name: 'Continue as Guest' }).click()

    await expect(page.getByRole('heading', { name: 'Your Books' })).toBeVisible()
  })

  test('works offline for local add book flow', async ({ page, context }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await page.getByRole('button', { name: 'Continue as Guest' }).click()
    await expect(page.getByRole('heading', { name: 'Your Books' })).toBeVisible()

    await context.setOffline(true)

    await page.getByRole('button', { name: /^\+ Add Book$/ }).click()
    await expect(page.getByRole('heading', { name: 'Add New Book' })).toBeVisible()
    await page.getByPlaceholder('Example: Branch A Book').fill('Offline Book One')
    await page
      .locator('section', { has: page.getByRole('heading', { name: 'Add New Book' }) })
      .getByRole('button', { name: 'Add Book' })
      .click()

    await expect(page.getByText('Offline Book One')).toBeVisible()
  })

  test('backend health endpoint is reachable when backend is running', async ({ request }) => {
    // Keep local/offline CI green; backend-dependent checks run only when API URL is provided.
    test.skip(!process.env.E2E_BACKEND_URL, 'Set E2E_BACKEND_URL to run backend reachability test')
    const backendUrl = process.env.E2E_BACKEND_URL
    const response = await request.get(`${backendUrl}/health`)
    expect(response.ok()).toBeTruthy()
    const body = await response.json()
    expect(body.ok).toBeTruthy()
  })

  test('offline queue syncs after authentication and sync now', async ({ page, context, request }) => {
    test.skip(!process.env.E2E_BACKEND_URL, 'Requires backend for sync validation')

    const stamp = Date.now()
    const backendUrl = process.env.E2E_BACKEND_URL
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await page.getByRole('button', { name: 'Continue as Guest' }).click()
    await expect(page.getByRole('heading', { name: 'Your Books' })).toBeVisible()

    await context.setOffline(true)
    await page.getByRole('button', { name: /^\+ Add Book$/ }).click()
    await expect(page.getByRole('heading', { name: 'Add New Book' })).toBeVisible()
    await page.getByPlaceholder('Example: Branch A Book').fill(`Offline Sync Book ${stamp}`)
    await page
      .locator('section', { has: page.getByRole('heading', { name: 'Add New Book' }) })
      .getByRole('button', { name: 'Add Book' })
      .click()
    await expect(page.getByText(`Offline Sync Book ${stamp}`)).toBeVisible()

    await context.setOffline(false)
    await page.reload({ waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { name: 'Your Books' })).toBeVisible()

    const registerResponse = await request.post(`${backendUrl}/api/auth/register`, {
      data: {
        fullName: 'Sync User',
        email: `sync-${stamp}@hebo.test`,
        password: 'Pass1234',
        tenantName: `Sync Tenant ${stamp}`,
      },
    })
    expect(registerResponse.ok()).toBeTruthy()
    const registerBody = await registerResponse.json()
    expect(registerBody.accessToken).toBeTruthy()

    const businessResponse = await request.post(`${backendUrl}/api/tenant/businesses`, {
      headers: {
        Authorization: `Bearer ${registerBody.accessToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        name: `Sync Biz ${stamp}`,
      },
    })
    expect(businessResponse.ok()).toBeTruthy()
    const businessBody = await businessResponse.json()
    expect(businessBody.business?.id).toBeTruthy()

    const business = businessBody.business
    await page.evaluate(({ token, businessId, businessName }) => {
      // Promote guest local data into the authenticated business context for sync validation.
      window.localStorage.setItem('hebo.auth.accessToken.v1', token)
      window.localStorage.setItem(
        'hebo.businesses.v1',
        JSON.stringify([{ id: businessId, name: businessName }]),
      )
      window.localStorage.setItem('hebo.businesses.selected.v1', businessId)
      window.localStorage.setItem('hebo.onboarding.completed.v1', 'true')
      const booksRaw = window.localStorage.getItem('hebo.books.v1')
      if (!booksRaw) {
        return
      }
      const parsed = JSON.parse(booksRaw)
      const nextBooks = Array.isArray(parsed.books)
        ? parsed.books.map((item) => ({ ...item, companyId: businessId }))
        : []
      const nextQueue = Array.isArray(parsed.syncQueue)
        ? parsed.syncQueue.map((item) => ({ ...item, companyId: businessId }))
        : []
      window.localStorage.setItem(
        'hebo.books.v1',
        JSON.stringify({
          ...parsed,
          books: nextBooks,
          syncQueue: nextQueue,
        }),
      )
    }, {
      token: registerBody.accessToken,
      businessId: business.id,
      businessName: business.name || `Sync Biz ${stamp}`,
    })

    await page.goto('/settings')
    await expect(page.getByText(/Pending\s+[1-9]/)).toBeVisible()
    await page.getByRole('button', { name: 'Sync now' }).click()

    await expect.poll(async () =>
      page.evaluate(() => {
        const raw = window.localStorage.getItem('hebo.books.v1')
        if (!raw) {
          return 0
        }
        const parsed = JSON.parse(raw)
        const queue = Array.isArray(parsed.syncQueue) ? parsed.syncQueue : []
        return queue.filter((item) => item.status === 'pending').length
      }),
    { timeout: 20000 }).toBe(0)

    await expect.poll(async () =>
      page.evaluate(() => {
        const raw = window.localStorage.getItem('hebo.books.v1')
        if (!raw) {
          return 0
        }
        const parsed = JSON.parse(raw)
        const queue = Array.isArray(parsed.syncQueue) ? parsed.syncQueue : []
        return queue.filter((item) => item.status === 'synced').length
      }),
    { timeout: 20000 }).toBeGreaterThan(0)
  })
})
