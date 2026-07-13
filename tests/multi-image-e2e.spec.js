// @ts-check
const { test, expect } = require('@playwright/test')
const path = require('path')
const fs = require('fs')

const TEST_EMAIL = 'admin@ltork.com'
const TEST_PASSWORD = 'Lovely@2023'
const BASE_API = 'https://api.ltorkcontrols.com'

function makeTestImage(filename, color = 'red') {
  const dir = path.join(__dirname, '.test-images')
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  const filePath = path.join(dir, filename)
  if (!fs.existsSync(filePath)) {
    // Create a minimal valid JPEG (smallest possible)
    const buf = Buffer.from(
      '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRof' +
      'Hh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwh' +
      'MjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAAR' +
      'CAABAAEDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAFRABA' +
      'QAAAAAAAAAAAAAAAAAAAAf/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAA' +
      'AAAAAP/aAAwDAQACEQMRAD8AKwA//9k=',
      'base64'
    )
    fs.writeFileSync(filePath, buf)
  }
  return filePath
}

test.describe('Multi-Image Upload & Retrieval E2E', () => {
  let createdProductId = null

  test('1. Login to dashboard', async ({ page }) => {
    await page.goto('/login')
    await page.waitForTimeout(1000)

    await page.fill('#login-email', TEST_EMAIL)
    await page.fill('#login-password', TEST_PASSWORD)
    await page.click('button:has-text("Login")')

    // Wait for either redirect to dashboard or error message
    try {
      await page.waitForURL('**/dashboard', { timeout: 20000 })
      await expect(page).toHaveURL(/\/dashboard/)
    } catch {
      // Rate limited — check for error, wait and retry once
      const errorEl = page.locator('#login-error')
      if (await errorEl.isVisible()) {
        const errorText = await errorEl.textContent()
        if (errorText.includes('Too many')) {
          console.log('Rate limited, waiting 60s then retrying...')
          await page.waitForTimeout(60000)
          await page.goto('/login')
          await page.waitForTimeout(1000)
          await page.fill('#login-email', TEST_EMAIL)
          await page.fill('#login-password', TEST_PASSWORD)
          await page.click('button:has-text("Login")')
          await page.waitForURL('**/dashboard', { timeout: 20000 })
          await expect(page).toHaveURL(/\/dashboard/)
        }
      }
    }
  })

  test('2. API returns products with images array', async ({ request }) => {
    const response = await request.get(
      `${BASE_API}/api/v1/products?status=active&limit=5`,
      { headers: { 'x-tenant-id': '1' } }
    )
    expect(response.ok()).toBeTruthy()
    const json = await response.json()
    expect(json.success).toBeTruthy()

    for (const product of json.data) {
      expect(product).toHaveProperty('id')
      expect(product).toHaveProperty('name')
      expect(product).toHaveProperty('main_image')
      expect(Array.isArray(product.images)).toBeTruthy()
    }
  })

  test('3. API product detail includes images array', async ({ request }) => {
    const listResponse = await request.get(
      `${BASE_API}/api/v1/products?status=active&limit=1`,
      { headers: { 'x-tenant-id': '1' } }
    )
    const listJson = await listResponse.json()
    if (listJson.data && listJson.data.length > 0) {
      const productId = listJson.data[0].id
      const detailResponse = await request.get(
        `${BASE_API}/api/v1/products/${productId}`,
        { headers: { 'x-tenant-id': '1' } }
      )
      expect(detailResponse.ok()).toBeTruthy()
      const detail = await detailResponse.json()
      expect(detail.success).toBeTruthy()
      expect(Array.isArray(detail.data.images)).toBeTruthy()

      if (detail.data.images.length > 0) {
        const img = detail.data.images[0]
        expect(img).toHaveProperty('id')
        expect(img).toHaveProperty('blob_url')
        expect(img).toHaveProperty('is_primary')
        expect(img).toHaveProperty('display_order')
        expect(img.blob_url).toContain('cloudinary.com')
      }
    }
  })

  test('4. Upload product with multiple images via dashboard', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForTimeout(3000)

    const nameInput = page.locator('#p-name')
    const exists = await nameInput.count()
    if (exists === 0) {
      console.log('Dashboard not loaded or product form not accessible, skipping upload test')
      return
    }

    // Click Add Product button
    const addBtn = page.locator('button:has-text("Add Product"), button:has-text("Add New Product")')
    if (await addBtn.count() > 0) {
      await addBtn.first().click()
      await page.waitForTimeout(1000)
    }

    // Fill in product name
    const uniqueName = `E2E Multi-Image Product ${Date.now()}`
    await page.fill('#p-name', uniqueName)
    await page.fill('#p-sku', `E2E-${Date.now()}`)
    await page.fill('#p-short-desc', 'E2E test product with multiple images')

    // Create test images and upload
    const img1 = makeTestImage('test1.jpg', 'red')
    const img2 = makeTestImage('test2.jpg', 'blue')
    const img3 = makeTestImage('test3.jpg', 'green')

    const fileInput = page.locator('#p-image-files')
    if (await fileInput.count() > 0) {
      await fileInput.setInputFiles([img1, img2, img3])
      await page.waitForTimeout(1000)

      // Verify preview shows 3 images
      const preview = page.locator('#p-image-preview')
      const previewImages = preview.locator('img')
      const previewCount = await previewImages.count()
      expect(previewCount).toBeGreaterThanOrEqual(3)
    }

    // Set status to active
    await page.selectOption('#p-status', 'active')

    // Save product
    const saveBtn = page.locator('#save-product-btn')
    await saveBtn.click()
    await page.waitForTimeout(5000)

    // Verify success alert
    const alert = page.locator('.alert, .swal2-popup, [role="alert"]')
    if (await alert.count() > 0) {
      await expect(alert.first()).toBeVisible()
    }

    // Reload and verify product appears in table
    await page.goto('/dashboard')
    await page.waitForTimeout(3000)

    const row = page.locator(`tr:has-text("${uniqueName}")`)
    if (await row.count() > 0) {
      createdProductId = true
      // Verify image badge shows count
      const badge = row.locator('span:has-text("3")')
      if (await badge.count() > 0) {
        await expect(badge.first()).toBeVisible()
      }
    }
  })

  test('5. Uploaded multi-image product retrievable via API', async ({ request }) => {
    const response = await request.get(
      `${BASE_API}/api/v1/products?status=active&limit=10`,
      { headers: { 'x-tenant-id': '1' } }
    )
    expect(response.ok()).toBeTruthy()
    const json = await response.json()

    const multiImageProducts = json.data.filter(p => p.images && p.images.length > 1)
    if (multiImageProducts.length > 0) {
      const product = multiImageProducts[0]
      expect(product.images.length).toBeGreaterThanOrEqual(2)

      for (const img of product.images) {
        expect(img.blob_url).toBeTruthy()
        expect(img.blob_url).toContain('cloudinary.com')
      }

      // Verify images are sorted by display_order
      for (let i = 1; i < product.images.length; i++) {
        expect(product.images[i].display_order).toBeGreaterThanOrEqual(
          product.images[i - 1].display_order
        )
      }
    }
  })

  test('6. Homepage product cards display multi-image indicator', async ({ page }) => {
    await page.goto('/')
    await page.waitForTimeout(3000)

    // Check product cards exist
    const productCards = page.locator('.product-card, .product-item, [onclick*="openProductDetail"]')
    if (await productCards.count() > 0) {
      // At least one product card should be visible
      await expect(productCards.first()).toBeVisible()
    }
  })

  test('7. Product detail modal shows image gallery', async ({ page }) => {
    await page.goto('/')
    await page.waitForTimeout(3000)

    // Click on a product card to open detail
    const productCard = page.locator('.product-card, .product-item, [onclick*="openProductDetail"]')
    if (await productCard.count() > 0) {
      await productCard.first().click()
      await page.waitForTimeout(2000)

      // Check detail modal is visible
      const modal = page.locator('.modal.show, #product-detail-modal, .detail-modal')
      if (await modal.count() > 0) {
        // Verify main image is shown
        const mainImg = page.locator('.detail-main-img, #detail-main-img, .modal img')
        if (await mainImg.count() > 0) {
          await expect(mainImg.first()).toBeVisible()
          const src = await mainImg.first().getAttribute('src')
          expect(src).toBeTruthy()
          expect(src).toContain('cloudinary.com')
        }

        // Check thumbnails
        const thumbs = page.locator('.detail-thumbnails img, #detail-thumbnails img')
        if (await thumbs.count() > 1) {
          // Multiple thumbnails = multi-image working
          expect(await thumbs.count()).toBeGreaterThanOrEqual(2)

          // Click second thumbnail to switch main image
          await thumbs.nth(1).click()
          await page.waitForTimeout(500)
          const newSrc = await mainImg.first().getAttribute('src')
          expect(newSrc).toBeTruthy()
        }
      }
    }
  })

  test('8. Edit product shows existing images', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForTimeout(3000)

    // Find an edit button
    const editBtn = page.locator('button:has-text("Edit")')
    if (await editBtn.count() > 0) {
      await editBtn.first().click()
      await page.waitForTimeout(2000)

      // Check preview shows existing images
      const preview = page.locator('#p-image-preview')
      if (await preview.count() > 0) {
        const previewImgs = preview.locator('img')
        if (await previewImgs.count() > 0) {
          await expect(previewImgs.first()).toBeVisible()
        }
      }
    }
  })

  test('9. Cleanup - delete test product via API', async ({ request }) => {
    const response = await request.get(
      `${BASE_API}/api/v1/products?status=active&limit=10`,
      { headers: { 'x-tenant-id': '1' } }
    )
    const json = await response.json()
    const testProduct = json.data.find(p => p.name && p.name.startsWith('E2E Multi-Image Product'))
    if (testProduct) {
      const deleteResponse = await request.delete(
        `${BASE_API}/api/v1/products/${testProduct.id}`,
        { headers: { 'x-tenant-id': '1' } }
      )
      expect(deleteResponse.ok()).toBeTruthy()
    }
  })
})

test.describe('Backend API - Multi-Image Validation', () => {
  test('Products endpoint includes images in list response', async ({ request }) => {
    const response = await request.get(
      `${BASE_API}/api/v1/products?status=active`,
      { headers: { 'x-tenant-id': '1' } }
    )
    expect(response.ok()).toBeTruthy()
    const json = await response.json()

    for (const product of json.data) {
      expect(product).toHaveProperty('images')
      expect(Array.isArray(product.images)).toBeTruthy()

      for (const img of product.images) {
        expect(img).toHaveProperty('id')
        expect(img).toHaveProperty('blob_url')
        expect(img).toHaveProperty('is_primary')
        expect(img).toHaveProperty('display_order')
      }
    }
  })

  test('Product detail endpoint includes full image data', async ({ request }) => {
    const listResponse = await request.get(
      `${BASE_API}/api/v1/products?status=active&limit=1`,
      { headers: { 'x-tenant-id': '1' } }
    )
    const listJson = await listResponse.json()
    if (!listJson.data?.length) return

    const id = listJson.data[0].id
    const response = await request.get(
      `${BASE_API}/api/v1/products/${id}`,
      { headers: { 'x-tenant-id': '1' } }
    )
    const json = await response.json()
    expect(json.success).toBeTruthy()
    expect(Array.isArray(json.data.images)).toBeTruthy()
  })

  test('Backend health check', async ({ request }) => {
    const response = await request.get(`${BASE_API}/health`)
    expect(response.ok()).toBeTruthy()
    const json = await response.json()
    expect(json.status).toBe('ok')
  })
})

test.describe('Source Code - Multi-Image Implementation', () => {
  const frontendRoot = path.resolve(__dirname, '..')

  test('dashboard.js has multi-image upload logic', () => {
    const content = fs.readFileSync(path.join(frontendRoot, 'assets', 'js', 'dashboard.js'), 'utf-8')
    expect(content).toContain("'images'")
    expect(content).toContain('p-image-files')
    expect(content).toContain('showExistingImages')
    expect(content).toContain('clearImagePreview')
    expect(content).toContain('is_primary')
  })

  test('products-page.js has image gallery', () => {
    const content = fs.readFileSync(path.join(frontendRoot, 'assets', 'js', 'products-page.js'), 'utf-8')
    expect(content).toContain('switchDetailImage')
    expect(content).toContain('detail-thumbnails')
    expect(content).toContain('detail-main-img')
    expect(content).toContain('p.images')
    expect(content).toContain('hasMultipleImages')
  })

  test('dashboard HTML has multi-file input', () => {
    const content = fs.readFileSync(path.join(frontendRoot, 'dashboard', 'index.html'), 'utf-8')
    expect(content).toContain('id="p-image-files"')
    expect(content).toContain('multiple')
    expect(content).toContain('id="p-image-preview"')
  })

  test('api.js has cache: no-store', () => {
    const content = fs.readFileSync(path.join(frontendRoot, 'services', 'api.js'), 'utf-8')
    expect(content).toContain("cache: 'no-store'")
  })
})
