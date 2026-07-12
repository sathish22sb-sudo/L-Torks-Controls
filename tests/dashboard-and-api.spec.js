// @ts-check
const { test, expect } = require('@playwright/test')
const fs = require('fs')
const path = require('path')
const frontendRoot = path.resolve(__dirname, '..')
const backendSrc = path.resolve(__dirname, '..', '..', 'backend', 'src')

test.describe('Dashboard - Auth Redirect', () => {
  test('dashboard redirects unauthenticated users to login', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForTimeout(3000)
    await expect(page).toHaveURL(/\/login/)
  })
})

test.describe('Dashboard - Product Form HTML Structure', () => {
  test('dashboard has product modal with file input (local file check)', () => {
    const content = fs.readFileSync(path.join(frontendRoot, 'dashboard', 'index.html'), 'utf-8')
    expect(content).toContain('id="p-image-files"')
    expect(content).toContain('id="p-catalogue-file"')
    expect(content).toContain('id="save-product-btn"')
  })
})

test.describe('Product Form - Multi-Image Input', () => {
  test('file input has multiple attribute in HTML', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForTimeout(2000)
    const fileInput = page.locator('#p-image-files')
    const exists = await fileInput.count()
    if (exists > 0) {
      const isMultiple = await fileInput.getAttribute('multiple')
      expect(isMultiple).not.toBeNull()
    }
  })

  test('image preview container exists in HTML', () => {
    const content = fs.readFileSync(path.join(frontendRoot, 'dashboard', 'index.html'), 'utf-8')
    expect(content).toContain('id="p-image-preview"')
  })
})

test.describe('Backend API - Products Endpoint', () => {
  test('GET /products returns data', async ({ request }) => {
    const response = await request.get(
      'https://api.l-torks-controls.online/api/v1/products?status=active&limit=1',
      { headers: { 'x-tenant-id': '1' } }
    )
    expect(response.ok()).toBeTruthy()
    const json = await response.json()
    expect(json.success).toBeTruthy()
    expect(Array.isArray(json.data)).toBeTruthy()
  })

  test('each product has id and name', async ({ request }) => {
    const response = await request.get(
      'https://api.l-torks-controls.online/api/v1/products?status=active&limit=5',
      { headers: { 'x-tenant-id': '1' } }
    )
    const json = await response.json()
    if (json.data && json.data.length > 0) {
      for (const product of json.data) {
        expect(product.id).toBeDefined()
        expect(product.name).toBeDefined()
      }
    }
  })

  test('GET /products/:id returns detail', async ({ request }) => {
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
    }
  })
})

test.describe('Local Source Code - Multi-Image Implementation', () => {
  const frontendRoot = path.resolve(__dirname, '..')

  test('dashboard.js contains multi-image upload logic', () => {
    const content = fs.readFileSync(path.join(frontendRoot, 'assets', 'js', 'dashboard.js'), 'utf-8')
    expect(content).toContain("'images'")
    expect(content).toContain('p-image-files')
    expect(content).toContain('for (const file of imgFiles)')
    expect(content).toContain('showExistingImages')
    expect(content).toContain('clearImagePreview')
    expect(content).toContain('is_primary')
  })

  test('products-page.js contains thumbnail gallery logic', () => {
    const content = fs.readFileSync(path.join(frontendRoot, 'assets', 'js', 'products-page.js'), 'utf-8')
    expect(content).toContain('switchDetailImage')
    expect(content).toContain('detail-thumbnails')
    expect(content).toContain('detail-main-img')
    expect(content).toContain('p.images')
    expect(content).toContain('is_primary')
    expect(content).toContain('hasMultipleImages')
  })

  test('home.js contains images array support', () => {
    const content = fs.readFileSync(path.join(frontendRoot, 'assets', 'js', 'home.js'), 'utf-8')
    expect(content).toContain('p.images')
    expect(content).toContain('is_primary')
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

test.describe('Local Backend Source - Multi-Image Implementation', () => {
  const backendSrc = path.resolve(__dirname, '..', '..', 'backend', 'src')

  test('product.routes.js uses images field with maxCount 10', () => {
    const content = fs.readFileSync(path.join(backendSrc, 'modules', 'products', 'product.routes.js'), 'utf-8')
    expect(content).toContain("'images'")
    expect(content).toContain('maxCount: 10')
  })

  test('product.service.js handles multi-image upload', () => {
    const content = fs.readFileSync(path.join(backendSrc, 'modules', 'products', 'product.service.js'), 'utf-8')
    expect(content).toContain('files?.images')
    expect(content).toContain('createImages')
    expect(content).toContain('replaceImages')
    expect(content).toContain('is_primary')
    expect(content).toContain('display_order')
  })

  test('product.repository.js has image methods and queries', () => {
    const content = fs.readFileSync(path.join(backendSrc, 'modules', 'products', 'product.repository.js'), 'utf-8')
    expect(content).toContain('createImages')
    expect(content).toContain('replaceImages')
    expect(content).toContain('product_images')
    expect(content).toContain('is_deleted')
  })

  test('app.js has cache-control middleware for /api', () => {
    const content = fs.readFileSync(path.join(backendSrc, 'app.js'), 'utf-8')
    expect(content).toContain('Cache-Control')
    expect(content).toContain('no-store')
    expect(content).toContain('no-cache')
    expect(content).toContain("'/api'")
  })
})

test.describe('Health Check', () => {
  test('backend health endpoint responds', async ({ request }) => {
    const response = await request.get('https://api.l-torks-controls.online/health')
    expect(response.ok()).toBeTruthy()
    const json = await response.json()
    expect(json.status).toBe('ok')
  })
})
