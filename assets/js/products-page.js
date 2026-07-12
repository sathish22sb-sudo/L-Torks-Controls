// ── PRODUCTS PAGE MODULE ────────────────────────────────────────────────────
// Handles: product listing/grid, product detail modal, catalogue download lead capture.
// Dependencies: api.js, productService.js, enquiryService.js, config.js, core.js

// ── STATE ──────────────────────────────────────────────────────────────────
let products = []
let showAllProducts = false

const productDetailCache = {}

const CATALOGUE_LEAD_COOKIE = 'ltork_catalogue_lead'
const CATALOGUE_LEAD_HOURS = 1

let pendingCatalogueDownload = null
let catalogueLeadReturnProductId = null

// ── PRODUCT LISTING / GRID ─────────────────────────────────────────────────
async function loadLandingProducts() {
	try {
		products = await productService.getAll({ status: 'active' })
	} catch (e) {
		console.error('Failed to load products:', e)
		products = []
	}
	renderLandingGrid()
}

function renderLandingGrid() {
	const grid = document.getElementById('landing-products-grid')
	const btnContainer = document.getElementById('landing-more-btn-container')
	if (!grid) return

	if (!products.length) {
		grid.innerHTML =
			'<p style="color:var(--muted);text-align:center;grid-column:1/-1;padding:3rem">No products available at this time.</p>'
		if (btnContainer) btnContainer.innerHTML = ''
		return
	}

	const visibleProducts = showAllProducts ? products : products.slice(0, 4)

	grid.innerHTML = visibleProducts
		.map((p) => {
			const imgUrl = p.main_image?.blob_url
			const altText = escHtml(p.name || 'Industrial product')
			return `
      <div class="product-card">
        ${
					imgUrl
						? `<img class="card-img" src="${imgUrl}" alt="${altText} — L Tork Controls" width="400" height="180"
               loading="lazy"
               onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"/>
             <div class="card-img-placeholder" style="display:none"><span>\u{1F4E6}</span></div>`
						: `<div class="card-img-placeholder"><span>\u{1F4E6}</span></div>`
				}
        <div class="card-body">
          <div class="card-title">${escHtml(p.name)}</div>
          ${p.sku ? `<div style="font-size:.72rem;color:var(--muted);margin-bottom:4px">SKU: ${escHtml(p.sku)}</div>` : ''}
          <div class="card-desc">${escHtml(p.short_description || '')}</div>
          <div style="margin-top:8px"><button class="btn-sm btn-ghost" onclick="openProductDetail(${p.id})">View Details &rarr;</button></div>
        </div>
      </div>`
		})
		.join('')

	if (btnContainer) {
		if (products.length > 4) {
			btnContainer.innerHTML = `
        <button class="btn-primary" onclick="toggleLandingProducts()">
          ${showAllProducts ? 'See Less' : 'See More Products'}
        </button>
      `
		} else {
			btnContainer.innerHTML = ''
		}
	}
}

function toggleLandingProducts() {
	showAllProducts = !showAllProducts
	renderLandingGrid()
}

// ── PRODUCT DETAIL MODAL ───────────────────────────────────────────────────
async function openProductDetail(id) {
	const modalEl = document.getElementById('detail-modal-overlay')
	const bsModal = bootstrap.Modal.getOrCreateInstance(modalEl)
	bsModal.show()

	document.getElementById('detail-modal').innerHTML =
		'<p style="color:var(--muted);text-align:center;padding:3rem">Loading…</p>'
	try {
		if (!productDetailCache[id]) {
			productDetailCache[id] = await productService.getById(id)
		}
		renderDetailModal(productDetailCache[id])
	} catch (e) {
		document.getElementById('detail-modal').innerHTML =
			'<p style="color:var(--red);text-align:center;padding:3rem">Failed to load product details.</p>'
	}
}

function closeDetailModal() {
	const modalEl = document.getElementById('detail-modal-overlay')
	const bsModal = bootstrap.Modal.getInstance(modalEl)
	if (bsModal) bsModal.hide()
	removeProductSchema()
}

function renderDetailModal(p) {
	const imgUrl = p.main_image?.blob_url
	const catId = p.catalogue?.id
	const catStreamUrl = catId
		? `${CONFIG.BASE_URL}/api/${CONFIG.API_VERSION}/media/${catId}/stream?tenant=${CONFIG.TENANT_ID}`
		: null

	const activeSpecs = (p.specifications || []).filter((s) => !s.is_deleted)
	const specsHtml = activeSpecs.length
		? `<div style="margin-top:1.2rem">
        <div style="font-size:.72rem;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:.4rem">Specifications</div>
        <table style="width:100%;border-collapse:collapse;border: 1px solid var(--mid)" aria-label="Product specifications">
          ${activeSpecs
						.map(
							(s) => `
            <tr>
              <td style="padding:.38rem .55rem;background:var(--black);border-bottom:1px solid var(--mid);font-size:.8rem;color:var(--muted);width:42%">${escHtml(s.spec_key)}</td>
              <td style="padding:.38rem .55rem;border-bottom:1px solid var(--mid);font-size:.8rem;color:var(--offwhite)">${escHtml(s.spec_value)}</td>
            </tr>`,
						)
						.join('')}
        </table>
      </div>`
		: ''

	injectProductSchema(p)

	const productSlug = (p.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
	const productUrl = `${SITE_URL}/product/${p.id}/${productSlug}`
	const canonicalEl = document.getElementById('dynamic-canonical')
	if (canonicalEl) canonicalEl.href = productUrl
	setMetaTag('og:url', productUrl)

	document.getElementById('detail-modal').innerHTML = `
    <button onclick="closeDetailModal()" aria-label="Close"
      style="position:absolute;top:1rem;right:1rem;background:none;border:none;color:var(--muted);font-size:1.5rem;cursor:pointer;line-height:1;z-index:100">&times;</button>
    ${
			imgUrl
				? `<img src="${escHtml(imgUrl)}" alt="${escHtml(p.name)} — L Tork Controls industrial product" width="640" height="300"
           style="width:100%;max-height:300px;object-fit:cover;border-radius:8px;margin-bottom:1.2rem;border:1px solid var(--mid)"
           loading="lazy"
           onerror="this.style.display='none'"/>`
				: ''
		}
    <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;flex-wrap:wrap;margin-bottom:.8rem">
      <div>
        <h2 style="color:var(--white);margin:0 0 .25rem;font-size:1.35rem">${escHtml(p.name)}</h2>
        ${p.sku ? `<div style="font-size:.75rem;color:var(--muted)">SKU: ${escHtml(p.sku)}</div>` : ''}
      </div>
      ${
				catStreamUrl
					? `<button type="button" onclick="handleCatalogueDownloadClick(this)"
             data-product-id="${p.id}" data-product-name="${escHtml(p.name)}" data-catalogue-url="${escHtml(catStreamUrl)}"
             style="background:var(--yellow);color:var(--steel);font-weight:700;font-size:.8rem;padding:.4rem .9rem;border-radius:4px;border:none;cursor:pointer;white-space:nowrap;flex-shrink:0">
             Download Catalogue</button>`
					: ''
			}
    </div>
    ${p.short_description ? `<p style="color:var(--offwhite);margin-bottom:.6rem;line-height:1.55">${escHtml(p.short_description)}</p>` : ''}
    ${p.detailed_description ? `<p style="color:var(--muted);font-size:.87rem;line-height:1.65">${escHtml(p.detailed_description)}</p>` : ''}
    ${specsHtml}
    <div style="margin-top:1.5rem;padding-top:1rem;border-top:1px solid var(--mid)">
      <button onclick="closeDetailModal();goSection('contact')"
        style="background:var(--yellow);color:var(--steel);font-weight:700;font-size:.85rem;padding:.55rem 1.2rem;border:none;border-radius:5px;cursor:pointer">
        Get a Quote &rarr;
      </button>
    </div>
  `
}

// ── CATALOGUE DOWNLOAD / LEAD CAPTURE ──────────────────────────────────────
function handleCatalogueDownloadClick(btn) {
	const { productId, productName, catalogueUrl } = btn.dataset
	initiateCatalogueDownload(productId, productName, catalogueUrl)
}

function initiateCatalogueDownload(productId, productName, catalogueUrl) {
	const lead = getStoredCatalogueLead()
	if (lead) {
		logCatalogueDownload(lead, productId, productName)
		window.open(catalogueUrl, '_blank')
		return
	}
	pendingCatalogueDownload = { productId, productName, catalogueUrl }
	catalogueLeadReturnProductId = productId
	closeDetailModal()
	openCatalogueLeadModal(productName)
}

function getStoredCatalogueLead() {
	const raw = getCookie(CATALOGUE_LEAD_COOKIE)
	if (!raw) return null
	try {
		return JSON.parse(raw)
	} catch {
		return null
	}
}

function openCatalogueLeadModal(productName) {
	;[
		'cat-lead-name',
		'cat-lead-company',
		'cat-lead-phone',
		'cat-lead-email',
	].forEach((id) => {
		const el = document.getElementById(id)
		if (el) el.value = ''
	})
	document.getElementById('cat-lead-error').style.display = 'none'
	const subtitleEl = document.getElementById('cat-lead-product-name')
	if (subtitleEl)
		subtitleEl.textContent = productName
			? `For: ${productName}`
			: 'Please share your details to continue'

	const modalEl = document.getElementById('catalogue-lead-modal')
	const bsModal = bootstrap.Modal.getOrCreateInstance(modalEl)
	bsModal.show()
}

function closeCatalogueLeadModal() {
	const modalEl = document.getElementById('catalogue-lead-modal')
	const bsModal = bootstrap.Modal.getInstance(modalEl)
	if (bsModal) bsModal.hide()
}

function resetCatalogueLeadForm() {
	closeCatalogueLeadModal()
}

function submitCatalogueLead() {
	const full_name = document.getElementById('cat-lead-name').value.trim()
	const company = document.getElementById('cat-lead-company').value.trim()
	const phone = document.getElementById('cat-lead-phone').value.trim()
	const email = document.getElementById('cat-lead-email').value.trim()

	if (!full_name || !phone || !email) {
		document.getElementById('cat-lead-error').style.display = 'block'
		return
	}
	document.getElementById('cat-lead-error').style.display = 'none'

	const lead = { full_name, company, phone, email }
	setCookie(CATALOGUE_LEAD_COOKIE, JSON.stringify(lead), CATALOGUE_LEAD_HOURS)
	closeCatalogueLeadModal()

	if (pendingCatalogueDownload) {
		const { productId, productName, catalogueUrl } = pendingCatalogueDownload
		logCatalogueDownload(lead, productId, productName)
		window.open(catalogueUrl, '_blank')
		pendingCatalogueDownload = null
	}
}

async function logCatalogueDownload(lead, productId, productName) {
	try {
		await enquiryService.submit({
			full_name: lead.full_name,
			company: lead.company || null,
			phone: lead.phone,
			email: lead.email,
			enquiry_type: 'Catalogue Download',
			message: `Downloaded the catalogue for: ${productName}`,
			product_id: productId ? parseInt(productId, 10) : undefined,
		})
	} catch (e) {
		console.error('Failed to log catalogue download:', e)
	}

	if (
		typeof emailjs !== 'undefined' &&
		EMAILJS_PUBLIC_KEY &&
		EMAILJS_PUBLIC_KEY !== 'YOUR_EMAILJS_PUBLIC_KEY'
	) {
		const adminParams = {
			to_email: 'infoltorkcontrols@gmail.com',
			from_name: lead.full_name,
			from_email: lead.email,
			company: lead.company || '—',
			phone: lead.phone,
			enquiry_type: 'Catalogue Download',
			message: `Downloaded the catalogue for: ${productName}`,
		}
		const clientParams = {
			client_name: lead.full_name,
			client_email: lead.email,
			enquiry_type: 'Catalogue Download',
			message: `Catalogue for ${productName}`,
		}
		if (EMAILJS_ADMIN_TEMPLATE_ID) {
			emailjs
				.send(EMAILJS_SERVICE_ID, EMAILJS_ADMIN_TEMPLATE_ID, adminParams)
				.then((res) =>
					console.log(
						'Catalogue-download admin notification triggered:',
						res.status,
						res.text,
					),
				)
				.catch((err) =>
					console.error(
						'Catalogue-download admin EmailJS trigger failed:',
						err,
					),
				)
		}
		if (
			EMAILJS_CLIENT_TEMPLATE_ID &&
			EMAILJS_CLIENT_TEMPLATE_ID !== 'YOUR_CLIENT_TEMPLATE_ID'
		) {
			emailjs
				.send(EMAILJS_SERVICE_ID, EMAILJS_CLIENT_TEMPLATE_ID, clientParams)
				.then((res) =>
					console.log(
						'Catalogue-download client auto-reply triggered:',
						res.status,
						res.text,
					),
				)
				.catch((err) =>
					console.error(
						'Catalogue-download client EmailJS auto-reply failed:',
						err,
					),
				)
		}
	}
}

// Re-show the product detail modal once the lead modal has fully closed
// (fires on submit, cancel, and backdrop/Esc dismissal alike).
document
	.getElementById('catalogue-lead-modal')
	?.addEventListener('hidden.bs.modal', () => {
		if (catalogueLeadReturnProductId) {
			const id = catalogueLeadReturnProductId
			catalogueLeadReturnProductId = null
			openProductDetail(id)
		}
	})

// ── SEO: Product JSON-LD Schema ────────────────────────────────────────────
function injectProductSchema(product) {
	document.getElementById('product-schema-jsonld')?.remove()

	const schema = {
		'@context': 'https://schema.org',
		'@type': 'Product',
		name: product.name,
		description: product.short_description || product.detailed_description || '',
		sku: product.sku || undefined,
		image: product.main_image?.blob_url || undefined,
		brand: {
			'@type': 'Brand',
			name: 'L Tork Controls',
		},
		manufacturer: {
			'@type': 'Organization',
			name: 'L Tork Controls',
			address: {
				'@type': 'PostalAddress',
				streetAddress: 'Plot No. 96E, 1st Floor, SIDCO Industrial Estate',
				addressLocality: 'Arakkonam',
				addressRegion: 'Tamil Nadu',
				postalCode: '631005',
				addressCountry: 'IN',
			},
		},
		offers: {
			'@type': 'Offer',
			availability: product.status === 'active' ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
			url: SITE_URL,
			priceCurrency: 'INR',
			seller: {
				'@type': 'Organization',
				name: 'L Tork Controls',
			},
		},
	}

	const cleaned = JSON.parse(JSON.stringify(schema))

	const script = document.createElement('script')
	script.id = 'product-schema-jsonld'
	script.type = 'application/ld+json'
	script.textContent = JSON.stringify(cleaned)
	document.head.appendChild(script)
}

function removeProductSchema() {
	document.getElementById('product-schema-jsonld')?.remove()
	const canonicalEl = document.getElementById('dynamic-canonical')
	if (canonicalEl) canonicalEl.href = SITE_URL + '/'
	setMetaTag('og:url', SITE_URL + '/')
}

// ── SEO: Meta Tag Helper ───────────────────────────────────────────────────
function setMetaTag(name, content) {
	let el = document.querySelector(`meta[name="${name}"], meta[property="${name}"]`)
	if (!el) return
	el.setAttribute('content', content)
}
