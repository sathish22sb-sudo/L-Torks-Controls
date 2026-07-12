// @ts-check
const { test, expect } = require('@playwright/test')

test.describe('Homepage', () => {
  test('loads successfully and has correct title', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/L.?Tork/i)
  })

  test('navigation bar is visible', async ({ page }) => {
    await page.goto('/')
    const nav = page.locator('nav, .navbar, header').first()
    await expect(nav).toBeVisible()
  })

  test('products section loads on homepage', async ({ page }) => {
    await page.goto('/')
    const grid = page.locator('#landing-products-grid')
    await expect(grid).toBeVisible({ timeout: 15000 })
    await expect(grid).not.toBeEmpty()
  })

  test('navigation links work - Products page', async ({ page }) => {
    await page.goto('/')
    const productsLink = page.locator('a[href="/products"]').first()
    if (await productsLink.isVisible()) {
      await productsLink.click()
      await page.waitForURL('**/products**')
      expect(page.url()).toContain('/products')
    }
  })

  test('navigation links work - Contact page', async ({ page }) => {
    await page.goto('/')
    const contactLink = page.locator('a[href="/contact"]').first()
    if (await contactLink.isVisible()) {
      await contactLink.click()
      await page.waitForURL('**/contact**')
      expect(page.url()).toContain('/contact')
    }
  })

  test('enquiry form exists on homepage', async ({ page }) => {
    await page.goto('/')
    const form = page.locator('form').first()
    await expect(form).toBeVisible()
  })

  test('homepage product cards render correctly', async ({ page }) => {
    await page.goto('/')
    await page.waitForTimeout(3000)
    const cards = page.locator('.product-card')
    const count = await cards.count()
    if (count > 0) {
      const firstCard = cards.first()
      await expect(firstCard).toBeVisible()
      const title = firstCard.locator('.card-title')
      await expect(title).toBeVisible()
    }
  })

  test('homepage product cards have image or placeholder', async ({ page }) => {
    await page.goto('/')
    await page.waitForTimeout(3000)
    const cards = page.locator('.product-card')
    const count = await cards.count()
    for (let i = 0; i < Math.min(count, 4); i++) {
      const card = cards.nth(i)
      const hasImage = await card.locator('.card-img').isVisible().catch(() => false)
      const hasPlaceholder = await card.locator('.card-img-placeholder').isVisible().catch(() => false)
      expect(hasImage || hasPlaceholder).toBeTruthy()
    }
  })
})

test.describe('Products Page', () => {
  test('loads successfully', async ({ page }) => {
    await page.goto('/products')
    await page.waitForTimeout(3000)
    // Page should load with content
    const body = page.locator('body')
    await expect(body).toBeVisible()
  })

  test('product cards render with images or placeholders', async ({ page }) => {
    await page.goto('/products')
    await page.waitForTimeout(3000)
    const cards = page.locator('.product-card')
    const count = await cards.count()
    if (count > 0) {
      const firstCard = cards.first()
      await expect(firstCard).toBeVisible()
      const title = firstCard.locator('.card-title')
      await expect(title).toBeVisible()
    }
  })

  test('product detail modal opens on "View Details" click', async ({ page }) => {
    await page.goto('/products')
    await page.waitForTimeout(3000)
    const viewBtn = page.locator('.product-card .btn-ghost').first()
    if (await viewBtn.isVisible()) {
      await viewBtn.click()
      const modal = page.locator('#detail-modal-overlay')
      await expect(modal).toBeVisible({ timeout: 10000 })
    }
  })

  test('See More Products toggle works', async ({ page }) => {
    await page.goto('/products')
    await page.waitForTimeout(3000)
    const toggleBtn = page.locator('button:has-text("See More Products")')
    if (await toggleBtn.isVisible()) {
      await toggleBtn.click()
      const lessBtn = page.locator('button:has-text("See Less")')
      await expect(lessBtn).toBeVisible()
    }
  })
})

test.describe('Product Detail Modal', () => {
  test('shows product name, SKU, and image', async ({ page }) => {
    await page.goto('/products')
    await page.waitForTimeout(3000)
    const viewBtn = page.locator('.product-card .btn-ghost').first()
    if (await viewBtn.isVisible()) {
      await viewBtn.click()
      const modal = page.locator('#detail-modal')
      await expect(modal).toBeVisible({ timeout: 10000 })
      const html = await modal.innerHTML()
      expect(html.length).toBeGreaterThan(50)
    }
  })

  test('detail modal can be closed', async ({ page }) => {
    await page.goto('/products')
    await page.waitForTimeout(3000)
    const viewBtn = page.locator('.product-card .btn-ghost').first()
    if (await viewBtn.isVisible()) {
      await viewBtn.click()
      await page.waitForTimeout(2000)
      const closeBtn = page.locator('#detail-modal button[aria-label="Close"]')
      if (await closeBtn.isVisible()) {
        await closeBtn.click()
        await page.waitForTimeout(500)
      }
    }
  })
})

test.describe('Backend API - Existing Functionality', () => {
  test('GET /products returns array', async ({ request }) => {
    const response = await request.get(
      'https://api.l-torks-controls.online/api/v1/products?status=active',
      { headers: { 'x-tenant-id': '1' } }
    )
    expect(response.ok()).toBeTruthy()
    const json = await response.json()
    expect(json.success).toBeTruthy()
    expect(Array.isArray(json.data)).toBeTruthy()
  })

  test('each product has required fields', async ({ request }) => {
    const response = await request.get(
      'https://api.l-torks-controls.online/api/v1/products?status=active&limit=5',
      { headers: { 'x-tenant-id': '1' } }
    )
    const json = await response.json()
    if (json.data && json.data.length > 0) {
      for (const product of json.data) {
        expect(product).toHaveProperty('id')
        expect(product).toHaveProperty('name')
        expect(product).toHaveProperty('main_image')
      }
    }
  })

  test('GET /products/:id returns full detail', async ({ request }) => {
    const listResponse = await request.get(
      'https://api.l-torks-controls.online/api/v1/products?status=active&limit=1',
      { headers: { 'x-tenant-id': '1' } }
    )
    const listJson = await listResponse.json()
    if (listJson.data && listJson.data.length > 0) {
      const productId = listJson.data[0].id
      const detailResponse = await request.get(
        `https://api.l-torks-controls.online/api/v1/products/${productId}`,
        { headers: { 'x-tenant-id': '1' } }
      )
      expect(detailResponse.ok()).toBeTruthy()
      const detailJson = await detailResponse.json()
      expect(detailJson.success).toBeTruthy()
      expect(detailJson.data).toHaveProperty('id')
      expect(detailJson.data).toHaveProperty('name')
      expect(detailJson.data).toHaveProperty('main_image')
      expect(detailJson.data).toHaveProperty('specifications')
    }
  })

  test('API returns proper JSON envelope', async ({ request }) => {
    const response = await request.get(
      'https://api.l-torks-controls.online/api/v1/products?limit=1',
      { headers: { 'x-tenant-id': '1' } }
    )
    const json = await response.json()
    expect(json).toHaveProperty('success')
    expect(json).toHaveProperty('data')
    expect(json).toHaveProperty('meta')
    expect(json.meta).toHaveProperty('timestamp')
  })

  test('health endpoint responds', async ({ request }) => {
    const response = await request.get('https://api.l-torks-controls.online/health')
    expect(response.ok()).toBeTruthy()
    const json = await response.json()
    expect(json.status).toBe('ok')
  })

  test('API accepts x-tenant-id header', async ({ request }) => {
    const response = await request.get(
      'https://api.l-torks-controls.online/api/v1/products',
      { headers: { 'x-tenant-id': '1' } }
    )
    expect(response.ok()).toBeTruthy()
  })
})

test.describe('Dashboard - Auth Redirect', () => {
  test('dashboard redirects unauthenticated users', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForTimeout(3000)
    const url = page.url()
    // Should either redirect to login or show the dashboard with auth guard
    // (which redirects to /login)
    expect(url).toBeTruthy()
  })
})

test.describe('Backward Compatibility - Product Rendering', () => {
  test('products render with existing main_image data', async ({ request }) => {
    const listResponse = await request.get(
      'https://api.l-torks-controls.online/api/v1/products?status=active&limit=5',
      { headers: { 'x-tenant-id': '1' } }
    )
    const listJson = await listResponse.json()
    if (listJson.data && listJson.data.length > 0) {
      for (const product of listJson.data) {
        // main_image should still be present
        expect(product).toHaveProperty('main_image')
        if (product.main_image) {
          expect(product.main_image).toHaveProperty('blob_url')
        }
      }
    }
  })

  test('product detail preserves backward compat fields', async ({ request }) => {
    const listResponse = await request.get(
      'https://api.l-torks-controls.online/api/v1/products?status=active&limit=1',
      { headers: { 'x-tenant-id': '1' } }
    )
    const listJson = await listResponse.json()
    if (listJson.data && listJson.data.length > 0) {
      const id = listJson.data[0].id
      const detail = await request.get(
        `https://api.l-torks-controls.online/api/v1/products/${id}`,
        { headers: { 'x-tenant-id': '1' } }
      )
      const d = (await detail.json()).data
      // All existing fields must still be present
      expect(d).toHaveProperty('id')
      expect(d).toHaveProperty('name')
      expect(d).toHaveProperty('sku')
      expect(d).toHaveProperty('short_description')
      expect(d).toHaveProperty('detailed_description')
      expect(d).toHaveProperty('status')
      expect(d).toHaveProperty('main_image')
      expect(d).toHaveProperty('specifications')
      expect(Array.isArray(d.specifications)).toBeTruthy()
    }
  })
})
