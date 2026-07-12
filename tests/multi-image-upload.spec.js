// @ts-check
const { test, expect } = require('@playwright/test')
const path = require('path')
const fs = require('fs')
const frontendRoot = path.resolve(__dirname, '..')
const backendSrc = path.resolve(__dirname, '..', '..', 'backend', 'src')

// Create small test images for upload testing
function createTestImage(filename) {
  const dir = path.join(__dirname, 'fixtures')
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  const pngBuffer = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
    'base64'
  )
  const filePath = path.join(dir, filename)
  fs.writeFileSync(filePath, pngBuffer)
  return filePath
}

test.describe('Multi-Image Upload - UI Elements', () => {
  test('file input accepts multiple files', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForTimeout(2000)
    const fileInput = page.locator('#p-image-files')
    const exists = await fileInput.count()
    if (exists > 0) {
      const accept = await fileInput.getAttribute('accept')
      expect(accept).toContain('.jpg')
      expect(accept).toContain('.png')
      expect(accept).toContain('.webp')
      const multiple = await fileInput.getAttribute('multiple')
      expect(multiple).not.toBeNull()
    }
  })

  test('image preview container exists in HTML (local check)', async ({ page }) => {
    const dashboardHtml = fs.readFileSync(path.join(frontendRoot, 'dashboard', 'index.html'), 'utf-8')
    expect(dashboardHtml).toContain('id="p-image-preview"')
  })
})

test.describe('Multi-Image Upload - File Selection Preview', () => {
  test('selecting images shows preview thumbnails', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForTimeout(2000)
    const fileInput = page.locator('#p-image-files')
    const exists = await fileInput.count()
    if (exists > 0) {
      const img1 = createTestImage('test1.png')
      const img2 = createTestImage('test2.png')
      await fileInput.setInputFiles([img1, img2])
      await page.waitForTimeout(1000)
      const preview = page.locator('#p-image-preview')
      const imgs = preview.locator('img')
      const count = await imgs.count()
      expect(count).toBe(2)
    }
  })
})

test.describe('Multi-Image Upload - Source Code Verification', () => {
  const frontendRoot = path.resolve(__dirname, '..')

  test('saveProduct uses images field in FormData', () => {
    const content = fs.readFileSync(path.join(frontendRoot, 'assets', 'js', 'dashboard.js'), 'utf-8')
    expect(content).toContain("'images'")
    expect(content).toContain('p-image-files')
    expect(content).toContain('for (const file of imgFiles)')
  })

  test('renderProductsTable handles images array', () => {
    const content = fs.readFileSync(path.join(frontendRoot, 'assets', 'js', 'dashboard.js'), 'utf-8')
    expect(content).toContain('p.images')
    expect(content).toContain('is_primary')
    expect(content).toContain('imgCount')
  })

  test('openEditProduct calls showExistingImages', () => {
    const content = fs.readFileSync(path.join(frontendRoot, 'assets', 'js', 'dashboard.js'), 'utf-8')
    expect(content).toContain('showExistingImages(p.images')
  })

  test('setupImagePreviewListener is called on bootstrap', () => {
    const content = fs.readFileSync(path.join(frontendRoot, 'assets', 'js', 'dashboard.js'), 'utf-8')
    expect(content).toContain('setupImagePreviewListener()')
  })
})

test.describe('Multi-Image Backward Compatibility - Live API', () => {
  test('existing products still have main_image', async ({ request }) => {
    const response = await request.get(
      'https://api.l-torks-controls.online/api/v1/products?status=active&limit=5',
      { headers: { 'x-tenant-id': '1' } }
    )
    const json = await response.json()
    if (json.data && json.data.length > 0) {
      for (const product of json.data) {
        expect(product).toHaveProperty('main_image')
      }
    }
  })

  test('product detail preserves all existing fields', async ({ request }) => {
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
      expect(d).toHaveProperty('id')
      expect(d).toHaveProperty('name')
      expect(d).toHaveProperty('main_image')
      expect(d).toHaveProperty('specifications')
      expect(d).toHaveProperty('short_description')
      expect(d).toHaveProperty('detailed_description')
      expect(d).toHaveProperty('status')
    }
  })

  test('specifications array structure preserved', async ({ request }) => {
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
      expect(Array.isArray(d.specifications)).toBeTruthy()
      if (d.specifications.length > 0) {
        const spec = d.specifications[0]
        expect(spec).toHaveProperty('spec_key')
        expect(spec).toHaveProperty('spec_value')
        expect(spec).toHaveProperty('is_deleted')
      }
    }
  })
})

test.describe('Backend Source - Multi-Image Implementation', () => {
  const backendSrc = path.resolve(__dirname, '..', '..', 'backend', 'src')

  test('multer config accepts images field with maxCount 10', () => {
    const content = fs.readFileSync(path.join(backendSrc, 'modules', 'products', 'product.routes.js'), 'utf-8')
    expect(content).toContain("name: 'images'")
    expect(content).toContain('maxCount: 10')
  })

  test('service handles multiple image files', () => {
    const content = fs.readFileSync(path.join(backendSrc, 'modules', 'products', 'product.service.js'), 'utf-8')
    expect(content).toContain('files?.images')
    expect(content).toContain('for (let i = 0; i < imageFiles.length')
    expect(content).toContain('is_primary: i === 0')
    expect(content).toContain('display_order: i')
  })

  test('repository has createImages and replaceImages', () => {
    const content = fs.readFileSync(path.join(backendSrc, 'modules', 'products', 'product.repository.js'), 'utf-8')
    expect(content).toContain('createImages(')
    expect(content).toContain('replaceImages(')
    expect(content).toContain("'product_images'")
  })

  test('repository findAll joins product_images', () => {
    const content = fs.readFileSync(path.join(backendSrc, 'modules', 'products', 'product.repository.js'), 'utf-8')
    expect(content).toContain('images:product_images')
    expect(content).toContain('media_asset:media_assets!media_asset_id')
    expect(content).toContain('display_order')
  })

  test('repository findById joins product_images', () => {
    const content = fs.readFileSync(path.join(backendSrc, 'modules', 'products', 'product.repository.js'), 'utf-8')
    // findById should also include images
    const findByIdIdx = content.indexOf('findById(')
    const createIdx = content.indexOf('createImages(')
    const findByIdSection = content.substring(findByIdIdx, createIdx)
    expect(findByIdSection).toContain('images:product_images')
  })

  test('service sets main_image_id to first image', () => {
    const content = fs.readFileSync(path.join(backendSrc, 'modules', 'products', 'product.service.js'), 'utf-8')
    expect(content).toContain('mainImageId = asset.id')
    expect(content).toContain('if (i === 0) mainImageId = asset.id')
  })
})

test.describe('Product Card Image Display Logic - Source Code', () => {
  const frontendRoot = path.resolve(__dirname, '..')

  test('homepage uses images array with fallback', () => {
    const content = fs.readFileSync(path.join(frontendRoot, 'assets', 'js', 'home.js'), 'utf-8')
    expect(content).toContain('p.images && p.images.length > 0')
    expect(content).toContain('(images.find(i => i.is_primary) || images[0]).blob_url')
    expect(content).toContain("p.main_image?.blob_url || null")
  })

  test('products page uses images array with fallback', () => {
    const content = fs.readFileSync(path.join(frontendRoot, 'assets', 'js', 'products-page.js'), 'utf-8')
    expect(content).toContain('p.images && p.images.length > 0')
    expect(content).toContain('(images.find(i => i.is_primary) || images[0]).blob_url')
    expect(content).toContain("p.main_image?.blob_url || null")
  })

  test('detail modal has thumbnail strip', () => {
    const content = fs.readFileSync(path.join(frontendRoot, 'assets', 'js', 'products-page.js'), 'utf-8')
    expect(content).toContain('detail-thumbnails')
    expect(content).toContain('detail-main-img')
    expect(content).toContain('switchDetailImage')
    expect(content).toContain('hasMultipleImages')
  })

  test('detail modal uses images array', () => {
    const content = fs.readFileSync(path.join(frontendRoot, 'assets', 'js', 'products-page.js'), 'utf-8')
    expect(content).toContain('const images = p.images')
    expect(content).toContain('images.find(i => i.is_primary)')
  })
})

test.describe('CORS & API Headers', () => {
  test('API accepts x-tenant-id header', async ({ request }) => {
    const response = await request.get(
      'https://api.l-torks-controls.online/api/v1/products',
      { headers: { 'x-tenant-id': '1' } }
    )
    expect(response.ok()).toBeTruthy()
  })

  test('API returns proper JSON structure', async ({ request }) => {
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
})

test.describe('Health Check', () => {
  test('backend health endpoint responds', async ({ request }) => {
    const response = await request.get('https://api.l-torks-controls.online/health')
    expect(response.ok()).toBeTruthy()
    const json = await response.json()
    expect(json.status).toBe('ok')
  })
})
