// ── LANDING PAGE PRODUCTS ────────────────────────────────────────────────────
let showAllProducts = false

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

// ── ENQUIRY FORM DISPATCH (Saves to database & triggers parallel emails) ───────
async function handleEnquiry(e) {
	e.preventDefault()
	const btn = document.getElementById('enq-submit-btn')
	btn.disabled = true

	const full_name = document.getElementById('eq-name').value.trim()
	const company = document.getElementById('eq-company').value.trim() || '—'
	const phone = document.getElementById('eq-phone').value.trim()
	const email = document.getElementById('eq-email').value.trim()
	const enquiry_type =
		document.getElementById('eq-type').value || 'General Enquiry'
	const message = document.getElementById('eq-msg').value.trim()

	try {
		await enquiryService.submit({
			full_name,
			company: company === '—' ? null : company,
			phone,
			email,
			enquiry_type,
			message,
		})

		const adminParams = {
			to_email: 'infoltorkcontrols@gmail.com',
			from_name: full_name,
			from_email: email,
			company: company,
			phone: phone,
			enquiry_type: enquiry_type,
			message: message,
		}

		const clientParams = {
			client_name: full_name,
			client_email: email,
			enquiry_type: enquiry_type,
			message: message,
		}

		await dispatchEmails(adminParams, clientParams)

		btn.textContent = '✓ Enquiry Sent!'
		btn.style.background = '#16a34a'
		btn.style.color = '#fff'
		e.target.reset()
		setTimeout(() => {
			btn.textContent = 'Send Enquiry →'
			btn.style.background = ''
			btn.style.color = ''
			btn.disabled = false
		}, 3000)
	} catch (err) {
		showCustomAlert('Failed to send enquiry: ' + err.message, 'error')
		btn.disabled = false
	}
}

// ── CATALOGUE DOWNLOAD LEAD CAPTURE ───────────────────────────────────────────
const CATALOGUE_LEAD_COOKIE = 'ltork_catalogue_lead'
const CATALOGUE_LEAD_HOURS = 1

function getStoredCatalogueLead() {
	const raw = getCookie(CATALOGUE_LEAD_COOKIE)
	if (!raw) return null
	try {
		return JSON.parse(raw)
	} catch {
		return null
	}
}

let pendingCatalogueDownload = null
let catalogueLeadReturnProductId = null

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

document
	.getElementById('catalogue-lead-modal')
	?.addEventListener('hidden.bs.modal', () => {
		if (catalogueLeadReturnProductId) {
			const id = catalogueLeadReturnProductId
			catalogueLeadReturnProductId = null
			openProductDetail(id)
		}
	})

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
	await dispatchEmails(adminParams, clientParams)
}

// ── PDF CATALOGUE MODAL ───────────────────────────────────────────────────────
function openPdfModal(productName, productLink) {
	;['pdf-name', 'pdf-company', 'pdf-phone', 'pdf-email', 'pdf-city'].forEach(
		(id) => {
			const el = document.getElementById(id)
			if (el) el.value = ''
		},
	)
	const pi = document.getElementById('pdf-interest')
	if (pi) pi.value = ''
	document.getElementById('pdf-error').style.display = 'none'

	const modalEl = document.getElementById('pdf-modal')
	const bsModal = bootstrap.Modal.getOrCreateInstance(modalEl)
	bsModal.show()
}

function closePdfModal() {
	const modalEl = document.getElementById('pdf-modal')
	const bsModal = bootstrap.Modal.getInstance(modalEl)
	if (bsModal) bsModal.hide()
}

function submitPdfLead() {
	const name = document.getElementById('pdf-name').value.trim()
	const phone = document.getElementById('pdf-phone').value.trim()
	const email = document.getElementById('pdf-email').value.trim()
	if (!name || !phone || !email) {
		document.getElementById('pdf-error').style.display = 'block'
		return
	}
	document.getElementById('pdf-error').style.display = 'none'
	closePdfModal()
	generatePDF({
		name,
		phone,
		email,
		company: document.getElementById('pdf-company').value.trim() || '—',
		city: document.getElementById('pdf-city').value.trim() || '—',
		interest: document.getElementById('pdf-interest').value || 'All Products',
	})
}

function generatePDF(lead) {
	const w = window.open('', '_blank', 'width=900,height=700')
	const rows = products
		.map(
			(p, i) =>
				`<tr><td>${i + 1}</td><td>${escHtml(p.name)}</td><td>${escHtml(p.sku || '—')}</td><td>${escHtml((p.short_description || '').substring(0, 80))}</td></tr>`,
		)
		.join('')
	w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"/>
  <title>L Tork Controls – Product Catalogue</title>
  <style>*{box-sizing:border-box;margin:0;padding:0}
  body{font-family:Arial,sans-serif;color:#0a1d37;padding:2.5rem;font-size:13px;background:#f4f7fc}
  header{display:flex;align-items:center;justify-content:space-between;border-bottom:3px solid #0e2f76;padding-bottom:1.2rem;margin-bottom:1.5rem}
  .logo{font-size:1.8rem;font-weight:900;color:#0e2f76}.logo span{color:#508cfa}
  h1{font-size:1.3rem;font-weight:700;margin-bottom:.3rem}
  .sub{font-size:.8rem;color:#5c6f8f;margin-bottom:1.5rem}
  table{width:100%;border-collapse:collapse;margin-bottom:2rem;background:#ffffff;border-radius:4px;overflow:hidden}
  th{background:#0e2f76;color:#f4f7fc;padding:.6rem .8rem;text-align:left;font-size:.75rem;text-transform:uppercase}
  td{padding:.6rem .8rem;border-bottom:1px solid #e1eaf8;font-size:.8rem;color:#0a1d37}
  tr:nth-child(even)td{background:#f8fafd}
  footer{margin-top:2rem;padding-top:1rem;border-top:2px solid #0e2f76;display:flex;justify-content:space-between;font-size:.75rem;color:#5c6f8f}
  @media print{body{padding:1.5rem;background:#ffffff}}</style></head><body>
  <header>
    <div class="logo">L Tork <span>Controls</span></div>
    <div style="text-align:right;font-size:.8rem;color:#5c6f8f">
      <div>SIDCO Industrial Estate, Arakkonam, Tamil Nadu - 631005</div>
      <div>+91 80152 61574 &nbsp;|&nbsp; ltorkcontrols@gmail.com</div>
    </div>
  </header>
  <h1>Product Catalogue</h1>
  <p class="sub">Prepared for: <strong>${escHtml(lead.name)}</strong>${lead.company !== '—' ? ' | ' + escHtml(lead.company) : ''} | Generated: ${new Date().toLocaleDateString('en-IN')}</p>
  <table><thead><tr><th>#</th><th>Product</th><th>SKU</th><th>Description</th></tr></thead><tbody>${rows}</tbody></table>
  <footer><div>&copy; 2024 L Tork Controls</div><div>ltorkcontrols@gmail.com</div></footer>
  </body></html>`)
	w.document.close()
	setTimeout(() => w.print(), 400)
}

// ── HOME PAGE INIT ────────────────────────────────────────────────────────────
;(function initHomePage() {
	initPage('home')
	loadLandingProducts()
})()
