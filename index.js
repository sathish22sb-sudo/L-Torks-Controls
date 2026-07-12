// ── EMAILJS CONFIGURATION ──────────────────────────────────────────────────
// REPLACE "YOUR_EMAILJS_PUBLIC_KEY" with your actual key from EmailJS -> Account -> API Keys
const EMAILJS_PUBLIC_KEY = 'fZQUFQff4QwX2i_ky'
const EMAILJS_SERVICE_ID = 'service_xz7b2qp'
const EMAILJS_ADMIN_TEMPLATE_ID = 'template_fqdvotp'
const EMAILJS_CLIENT_TEMPLATE_ID = 'template_f8v0l0d' // Create a second template in EmailJS and paste its ID here

// Initialize EmailJS safely
;(function initEmailJS() {
	if (
		typeof emailjs !== 'undefined' &&
		EMAILJS_PUBLIC_KEY &&
		EMAILJS_PUBLIC_KEY !== 'YOUR_EMAILJS_PUBLIC_KEY'
	) {
		emailjs.init(EMAILJS_PUBLIC_KEY)
		// console.log("EmailJS successfully initialized with public key:", EMAILJS_PUBLIC_KEY);
	} else if (typeof emailjs === 'undefined') {
		console.error(
			'EmailJS SDK script library is not loaded. Ensure the CDN script tag is in the <head> of your index.html.',
		)
	} else {
		console.warn(
			'EmailJS loaded, but is waiting for you to populate your active Public Key in voltex.js.',
		)
	}
})()

// ── STATE ─────────────────────────────────────────────────────────────────────
let isLoggedIn = false
let authUser = null
let products = []
let enquiries = []
let editingProductId = null
const productDetailCache = {}

// Public See More Products Toggle
let showAllProducts = false

// Dashboard Table Pagination, Searching, Filtering and Page Limits
let productSearchQuery = ''
let productPageSize = 5
let productCurrentPage = 1

let enquirySearchQuery = ''
let enquiryPageSize = 5
let enquiryCurrentPage = 1

// ── SEO: Dynamic Metadata + Routing Config ───────────────────────────────────
const SITE_URL = 'https://www.l-torks-controls.online'
const DEFAULT_TITLE = 'L Tork Controls | Electrical Actuators, Limit Switches & Industrial Automation in India'
const DEFAULT_DESC = 'L Tork Controls — trusted manufacturer of electrical actuators, limit switches, control panels and industrial automation solutions since 2000. Based in Arakkonam, Tamil Nadu.'

const SEO_META = {
	home: {
		title: DEFAULT_TITLE,
		description: DEFAULT_DESC,
		path: '/',
		canonical: SITE_URL + '/',
	},
	login: {
		title: 'Admin Login | L Tork Controls',
		description: 'Secure admin dashboard login for L Tork Controls personnel.',
		path: '/login',
		canonical: SITE_URL + '/login',
	},
	dashboard: {
		title: 'Dashboard | L Tork Controls',
		description: 'Admin dashboard for managing products and customer enquiries at L Tork Controls.',
		path: '/dashboard',
		canonical: SITE_URL + '/dashboard',
	},
	privacy: {
		title: 'Privacy Policy | L Tork Controls',
		description: 'L Tork Controls privacy policy — how we handle client data, technical schematics and contact information.',
		path: '/privacy',
		canonical: SITE_URL + '/privacy',
	},
	refund: {
		title: 'Refund Policy | L Tork Controls',
		description: 'L Tork Controls refund and returns policy for industrial electrical components and custom hardware.',
		path: '/refund',
		canonical: SITE_URL + '/refund',
	},
	shipping: {
		title: 'Shipping Terms | L Tork Controls',
		description: 'Shipping and delivery terms for L Tork Controls products across India.',
		path: '/shipping',
		canonical: SITE_URL + '/shipping',
	},
	terms: {
		title: 'Terms & Conditions | L Tork Controls',
		description: 'Terms and conditions for engaging L Tork Controls design, manufacturing and procurement services.',
		path: '/terms',
		canonical: SITE_URL + '/terms',
	},
}

// Section routes: show 'home' page then scroll to the section
const SECTION_ROUTES = {
	about: { page: 'home', section: 'about', title: 'About Us | L Tork Controls', description: 'L Tork Controls — 25+ years of excellence in industrial automation. Trusted manufacturer of electrical actuators and limit switches.', path: '/about', canonical: SITE_URL + '/about' },
	products: { page: 'home', section: 'products', title: 'Products | L Tork Controls', description: 'Explore our range of electrical actuators, limit switches, control panels and industrial automation components.', path: '/products', canonical: SITE_URL + '/products' },
	services: { page: 'home', section: 'services', title: 'Services | L Tork Controls', description: 'End-to-end industrial automation solutions — electrical actuator site services, GeM tender support.', path: '/services', canonical: SITE_URL + '/services' },
	contact: { page: 'home', section: 'contact', title: 'Contact Us | L Tork Controls', description: 'Get in touch with L Tork Controls for product enquiries, technical support and custom orders.', path: '/contact', canonical: SITE_URL + '/contact' },
}

// ── SEO: Update <title>, <meta description>, canonical, OG tags ─────────────
function updateSEOMeta(pageId, sectionKey) {
	let meta
	if (sectionKey && SECTION_ROUTES[sectionKey]) {
		meta = SECTION_ROUTES[sectionKey]
	} else {
		meta = SEO_META[pageId] || SEO_META.home
	}

	document.title = meta.title

	setMetaTag('description', meta.description)
	setMetaTag('og:title', meta.title)
	setMetaTag('og:description', meta.description)
	setMetaTag('og:url', meta.canonical)

	const canonicalEl = document.getElementById('dynamic-canonical')
	if (canonicalEl) canonicalEl.href = meta.canonical
}

function setMetaTag(name, content) {
	let el = document.querySelector(`meta[name="${name}"], meta[property="${name}"]`)
	if (!el) return
	el.setAttribute('content', content)
}

// Auto-restore session via the httpOnly auth cookie — ask the backend who we are,
// since the token itself is never readable from JS.
async function restoreSession() {
	try {
		authUser = await api.get('/auth/me')
		isLoggedIn = true
	} catch {
		isLoggedIn = false
		authUser = null
	}
}

// ── NAVIGATION ────────────────────────────────────────────────────────────────
function showPage(name, pushToHistory = true) {
	if (name === 'dashboard' && !isLoggedIn) name = 'login'
	document
		.querySelectorAll('.page')
		.forEach((p) => p.classList.remove('active'))
	const pg = document.getElementById('page-' + name)
	if (pg) pg.classList.add('active')
	window.scrollTo(0, 0)

	// SEO: update metadata and URL
	const meta = SEO_META[name] || SEO_META.home
	updateSEOMeta(name)
	if (pushToHistory && meta.path) {
		history.pushState({ page: name }, '', meta.path)
	}

	if (name === 'dashboard') {
		const emailEl = document.getElementById('dash-user-email')
		if (emailEl) emailEl.textContent = authUser?.email || ''
		loadDashboard()
	}
}

function goSection(id, pushToHistory = true) {
	const route = SECTION_ROUTES[id]
	if (route) {
		showPage(route.page, false)
		updateSEOMeta(route.page, id)
		if (pushToHistory) {
			history.pushState({ page: route.page, section: id }, '', route.path)
		}
	} else {
		showPage('home', pushToHistory)
	}
	setTimeout(
		() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }),
		60,
	)
}

// ── SPA: popstate (browser back/forward) handler ─────────────────────────────
window.addEventListener('popstate', (e) => {
	if (!e.state) return
	if (e.state.section) {
		goSection(e.state.section, false)
	} else if (e.state.page) {
		showPage(e.state.page, false)
	}
})

function showDashTab(tab) {
	document
		.querySelectorAll('.dash-tab')
		.forEach((t) => t.classList.remove('active'))
	document
		.querySelectorAll('.dash-nav-item')
		.forEach((n) => n.classList.remove('active'))
	document.getElementById('dtab-' + tab)?.classList.add('active')
	document.getElementById('dtab-btn-' + tab)?.classList.add('active')
	if (tab === 'enquiries') loadAdminEnquiries()
}

function openDashboard() {
	isLoggedIn ? showPage('dashboard') : showPage('login')
}

// ── MOBILE MENU ACTIONS ──
function toggleMobileMenu() {
	const links = document.getElementById('nav-links-menu')
	const btn = document.getElementById('nav-toggle-btn')
	if (links) {
		links.classList.toggle('open')
		if (links.classList.contains('open')) {
			btn.innerHTML = '<i class="fa-solid fa-xmark"></i>'
		} else {
			btn.innerHTML = '<i class="fa-solid fa-bars"></i>'
		}
	}
}

// Close navigation menu
function closeMobileMenu() {
	const links = document.getElementById('nav-links-menu')
	const btn = document.getElementById('nav-toggle-btn')
	if (links && links.classList.contains('open')) {
		links.classList.remove('open')
		btn.innerHTML = '<i class="fa-solid fa-bars"></i>'
	}
}

// ── AUTH ──────────────────────────────────────────────────────────────────────
async function doLogin() {
	const email = document.getElementById('login-email').value.trim()
	const password = document.getElementById('login-password').value
	const errEl = document.getElementById('login-error')

	try {
		const result = await api.post('/auth/login', { email, password })
		isLoggedIn = true
		authUser = result.user
		errEl.style.display = 'none'
		showPage('dashboard')
	} catch (e) {
		errEl.style.display = 'block'
		errEl.textContent = '❌ ' + (e.message || 'Invalid credentials')
		document.getElementById('login-password').value = ''
	}
}

// ── LOGOUT ──
async function doLogout() {
	try {
		await api.post('/auth/logout')
	} catch {
		// clear local state regardless of network failure
	}
	isLoggedIn = false
	authUser = null
	showPage('home')
}

function togglePw() {
	const inp = document.getElementById('login-password')
	inp.type = inp.type === 'password' ? 'text' : 'password'
}

// ── LANDING PAGE PRODUCTS ────────────────────────────────────────────────────
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

	// Slice list based on expansion state
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

	// Dynamically render "See More / See Less" controls
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
		// 1. Submit enquiry record to database API
		await enquiryService.submit({
			full_name,
			company: company === '—' ? null : company,
			phone,
			email,
			enquiry_type,
			message,
		})

		// 2. Dispatch Emails via EmailJS (if initialized with user public key)
		if (
			typeof emailjs !== 'undefined' &&
			EMAILJS_PUBLIC_KEY &&
			EMAILJS_PUBLIC_KEY !== 'YOUR_EMAILJS_PUBLIC_KEY'
		) {
			console.log('Database entry complete. Dispatching EmailJS triggers...')

			// Template parameters for admin notification email (template_fqdvotp)
			const adminParams = {
				to_email: 'infoltorkcontrols@gmail.com',
				from_name: full_name,
				from_email: email,
				company: company,
				phone: phone,
				enquiry_type: enquiry_type,
				message: message,
			}

			// Template parameters for customer confirmation auto-reply email
			const clientParams = {
				client_name: full_name,
				client_email: email,
				enquiry_type: enquiry_type,
				message: message,
			}

			const emailSends = []

			// Send to Admin
			if (EMAILJS_ADMIN_TEMPLATE_ID) {
				emailSends.push(
					emailjs
						.send(EMAILJS_SERVICE_ID, EMAILJS_ADMIN_TEMPLATE_ID, adminParams)
						.then((res) =>
							console.log(
								'Admin notification triggered:',
								res.status,
								res.text,
							),
						)
						.catch((err) =>
							console.error('Admin EmailJS trigger failed:', err),
						),
				)
			}

			// Send confirmation auto-reply to client
			if (
				EMAILJS_CLIENT_TEMPLATE_ID &&
				EMAILJS_CLIENT_TEMPLATE_ID !== 'YOUR_CLIENT_TEMPLATE_ID'
			) {
				emailSends.push(
					emailjs
						.send(EMAILJS_SERVICE_ID, EMAILJS_CLIENT_TEMPLATE_ID, clientParams)
						.then((res) =>
							console.log('Client auto-reply triggered:', res.status, res.text),
						)
						.catch((err) =>
							console.error('Client EmailJS auto-reply failed:', err),
						),
				)
			}

			if (emailSends.length > 0) {
				await Promise.all(emailSends)
			}
		} else {
			console.warn(
				'EmailJS call bypassed. Populate your Public Key at the top of voltex.js to enable email dispatches.',
			)
		}

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

// ── DASHBOARD INIT ────────────────────────────────────────────────────────────
async function loadDashboard() {
	await Promise.all([loadAdminProducts(), loadAdminEnquiries()])
	renderOverview()
}

// ── ADMIN PRODUCTS SEARCH AND PAGINATION CONTROLLERS ─────────────────────────
function handleProductSearch(val) {
	productSearchQuery = val.toLowerCase().trim()
	productCurrentPage = 1
	renderProductsTable()
}

// Change limit of displayed rows
function handleProductLimitChange(val) {
	productPageSize = parseInt(val, 10)
	productCurrentPage = 1
	renderProductsTable()
}

function changeProductPage(page) {
	productCurrentPage = page
	renderProductsTable()
}

// ── ADMIN PRODUCTS ────────────────────────────────────────────────────────────
async function loadAdminProducts() {
	try {
		products = await productService.getAll()
		renderProductsTable()
	} catch (e) {
		console.error('Admin products error:', e)
	}
}

function renderProductsTable() {
	let filtered = products
	if (productSearchQuery) {
		filtered = products.filter(
			(p) =>
				(p.name || '').toLowerCase().includes(productSearchQuery) ||
				(p.sku || '').toLowerCase().includes(productSearchQuery) ||
				(p.short_description || '').toLowerCase().includes(productSearchQuery),
		)
	}

	const totalEntries = filtered.length
	const totalPages = Math.ceil(totalEntries / productPageSize) || 1
	if (productCurrentPage > totalPages) productCurrentPage = totalPages

	const startIndex = (productCurrentPage - 1) * productPageSize
	const endIndex = Math.min(startIndex + productPageSize, totalEntries)
	const paginated = filtered.slice(startIndex, endIndex)

	const lbl = document.getElementById('prod-count-lbl')
	if (lbl) {
		lbl.textContent = productSearchQuery
			? `${totalEntries} found (${products.length} total)`
			: `${products.length} products`
	}

	const tbody = document.getElementById('products-tbody')
	if (!tbody) return

	if (!paginated.length) {
		tbody.innerHTML =
			'<tr><td colspan="6" style="color:var(--muted);text-align:center;padding:2rem">No products found matching filters.</td></tr>'
		document.getElementById('prod-pagination-info').textContent =
			'Showing 0 to 0 of 0 entries'
		document.getElementById('prod-pagination-controls').innerHTML = ''
		return
	}

	tbody.innerHTML = paginated
		.map((p, idx) => {
			const globalIndex = startIndex + idx + 1
			const imgUrl = p.main_image?.blob_url
			const altText = escHtml(p.name || 'Product image')
			const imgCell = imgUrl
				? `<img src="${imgUrl}" width="52" height="40" alt="${altText}" style="width:52px;height:40px;object-fit:cover;border-radius:4px" loading="lazy" onerror="this.style.display='none'"/>`
				: `<span style="font-size:1.5rem">\u{1F4E6}</span>`

			return `
      <tr>
        <td>${globalIndex}</td>
        <td>${imgCell}</td>
        <td>
          <strong style="color:var(--offwhite)">${escHtml(p.name)}</strong>
          ${p.sku ? `<br><span style="font-size:.73rem;color:var(--muted)">${escHtml(p.sku)}</span>` : ''}
        </td>
        <td style="font-size:.8rem;color:var(--muted);max-width:160px">${escHtml((p.short_description || '').substring(0, 70))}</td>
        <td><span class="badge ${productStatusBadge(p.status)}">${p.status}</span></td>
        <td style="white-space:nowrap">
          <button class="btn-sm btn-info" onclick="openEditProduct(${p.id})">Edit</button>
          <button class="btn-sm btn-danger" onclick="deleteProduct(${p.id})">Delete</button>
        </td>
      </tr>`
		})
		.join('')

	// Pagination Text Status
	const infoEl = document.getElementById('prod-pagination-info')
	if (infoEl) {
		infoEl.textContent = `Showing ${totalEntries ? startIndex + 1 : 0} to ${endIndex} of ${totalEntries} entries`
	}

	// Generate Truncated Pagination Controls with requested Font Awesome Icons
	const controlsEl = document.getElementById('prod-pagination-controls')
	if (controlsEl) {
		controlsEl.innerHTML = buildTruncatedPaginationHTML(
			productCurrentPage,
			totalPages,
			'changeProductPage',
		)
	}
}

// ── PRODUCT MODAL ─────────────────────────────────────────────────────────────
function openAddProduct() {
	editingProductId = null
	document.getElementById('modal-title').textContent = 'Add New Product'
	document.getElementById('save-product-btn').textContent = 'Save Product'
	document.getElementById('product-form').reset()
	document.getElementById('p-status').value = 'draft'
	setSpecsEditor([])

	const modalEl = document.getElementById('modal-overlay')
	const bsModal = bootstrap.Modal.getOrCreateInstance(modalEl)
	bsModal.show()
}

async function openEditProduct(id) {
	try {
		const p = await productService.getById(id)
		editingProductId = id
		document.getElementById('modal-title').textContent = 'Edit Product'
		document.getElementById('save-product-btn').textContent = 'Update Product'
		document.getElementById('p-name').value = p.name || ''
		document.getElementById('p-sku').value = p.sku || ''
		document.getElementById('p-short-desc').value = p.short_description || ''
		document.getElementById('p-detailed-desc').value =
			p.detailed_description || ''
		document.getElementById('p-status').value = p.status || 'draft'
		const activeSpecs = (p.specifications || []).filter((s) => !s.is_deleted)
		setSpecsEditor(activeSpecs)

		const modalEl = document.getElementById('modal-overlay')
		const bsModal = bootstrap.Modal.getOrCreateInstance(modalEl)
		bsModal.show()
	} catch (e) {
		showCustomAlert('Failed to load product: ' + e.message, 'error')
	}
}

function closeModal() {
	const modalEl = document.getElementById('modal-overlay')
	const bsModal = bootstrap.Modal.getInstance(modalEl)
	if (bsModal) bsModal.hide()
}

// Specifications dynamic editor
function setSpecsEditor(specs) {
	const c = document.getElementById('specs-container')
	c.innerHTML = ''
	specs.forEach((s, i) =>
		c.insertAdjacentHTML(
			'beforeend',
			buildSpecRow(i, s.spec_key, s.spec_value),
		),
	)
}

function buildSpecRow(i, key, value) {
	return `<div class="spec-row d-flex gap-2 align-items-center mb-2" id="spec-row-${i}">
    <input type="text" placeholder="Key (e.g. Current)" value="${escHtml(key || '')}" class="spec-key"
      style="flex:1;background:var(--steel);border:1px solid var(--mid);border-radius:4px;padding:.4rem .6rem;color:var(--offwhite);font-size:.82rem"/>
    <input type="text" placeholder="Value (e.g. 63A)" value="${escHtml(value || '')}" class="spec-value"
      style="flex:1;background:var(--steel);border:1px solid var(--mid);border-radius:4px;padding:.4rem .6rem;color:var(--offwhite);font-size:.82rem"/>
    <button type="button" onclick="this.closest('.spec-row').remove()"
      style="background:rgba(220,38,38,.1);color:var(--red);border:none;border-radius:4px;padding:.4rem .7rem;cursor:pointer;font-size:.85rem;flex-shrink:0">✕</button>
  </div>`
}

function addSpec() {
	const c = document.getElementById('specs-container')
	const i = c.querySelectorAll('.spec-row').length
	c.insertAdjacentHTML('beforeend', buildSpecRow(i, '', ''))
}

function collectSpecs() {
	return [...document.querySelectorAll('#specs-container .spec-row')]
		.map((row) => ({
			spec_key: row.querySelector('.spec-key').value.trim(),
			spec_value: row.querySelector('.spec-value').value.trim(),
		}))
		.filter((s) => s.spec_key && s.spec_value)
}

async function saveProduct() {
	const name = document.getElementById('p-name').value.trim()
	if (!name) {
		showCustomAlert('Product name is required.', 'error')
		return
	}

	const form = new FormData()
	form.append('name', name)
	form.append('sku', document.getElementById('p-sku').value.trim())
	form.append(
		'short_description',
		document.getElementById('p-short-desc').value.trim(),
	)
	form.append(
		'detailed_description',
		document.getElementById('p-detailed-desc').value.trim(),
	)
	form.append('status', document.getElementById('p-status').value)
	form.append('specifications', JSON.stringify(collectSpecs()))

	const imgFile = document.getElementById('p-image-file')?.files?.[0]
	const catFile = document.getElementById('p-catalogue-file')?.files?.[0]
	if (imgFile) form.append('image', imgFile)
	if (catFile) form.append('catalogue', catFile)

	const btn = document.getElementById('save-product-btn')
	btn.disabled = true
	btn.textContent = editingProductId ? 'Updating...' : 'Saving...'

	try {
		if (editingProductId) {
			await productService.update(editingProductId, form)
		} else {
			await productService.create(form)
		}
		closeModal()
		await loadAdminProducts()
		renderOverview()
		showCustomAlert(
			editingProductId
				? 'Product updated successfully.'
				: 'Product created successfully.',
			'success',
		)
	} catch (e) {
		showCustomAlert('Failed to save product: ' + e.message, 'error')
		btn.disabled = false
		btn.textContent = editingProductId ? 'Update Product' : 'Save Product'
	}
}

async function deleteProduct(id) {
	const confirmed = await showCustomConfirm(
		'Delete this product? This cannot be undone.',
	)
	if (!confirmed) return
	try {
		await productService.delete(id)
		await loadAdminProducts()
		renderOverview()
		showCustomAlert('Product deleted successfully.', 'success')
	} catch (e) {
		showCustomAlert('Failed to delete product: ' + e.message, 'error')
	}
}

// ── ADMIN ENQUIRIES SEARCH AND PAGINATION CONTROLLERS ────────────────────────
function handleEnquirySearch(val) {
	enquirySearchQuery = val.toLowerCase().trim()
	enquiryCurrentPage = 1
	renderEnquiriesTable()
}

function handleEnquiryLimitChange(val) {
	enquiryPageSize = parseInt(val, 10)
	enquiryCurrentPage = 1
	renderEnquiriesTable()
}

function changeEnquiryPage(page) {
	enquiryCurrentPage = page
	renderEnquiriesTable()
}

// ── ADMIN ENQUIRIES ────────────────────────────────────────────────────────────
async function loadAdminEnquiries() {
	try {
		const filters = {}
		const status = document.getElementById('filter-status')?.value
		const type = document.getElementById('filter-type')?.value
		if (status) filters.status = status
		if (type) filters.enquiry_type = type
		enquiries = await enquiryService.getAll(filters)
		renderEnquiriesTable()
	} catch (e) {
		console.error('Enquiries load error:', e)
	}
}

function renderEnquiriesTable() {
	let filtered = enquiries
	if (enquirySearchQuery) {
		filtered = enquiries.filter(
			(e) =>
				(e.full_name || '').toLowerCase().includes(enquirySearchQuery) ||
				(e.company || '').toLowerCase().includes(enquirySearchQuery) ||
				(e.email || '').toLowerCase().includes(enquirySearchQuery) ||
				(e.phone || '').toLowerCase().includes(enquirySearchQuery) ||
				(e.message || '').toLowerCase().includes(enquirySearchQuery) ||
				(e.enquiry_type || '').toLowerCase().includes(enquirySearchQuery),
		)
	}

	const totalEntries = filtered.length
	const totalPages = Math.ceil(totalEntries / enquiryPageSize) || 1
	if (enquiryCurrentPage > totalPages) enquiryCurrentPage = totalPages

	const startIndex = (enquiryCurrentPage - 1) * enquiryPageSize
	const endIndex = Math.min(startIndex + enquiryPageSize, totalEntries)
	const paginated = filtered.slice(startIndex, endIndex)

	const lbl = document.getElementById('enq-count-lbl')
	if (lbl) {
		lbl.textContent = enquirySearchQuery
			? `${totalEntries} found (${enquiries.length} total)`
			: `${enquiries.length} total`
	}

	const tbody = document.getElementById('enquiries-tbody')
	if (!tbody) return

	if (!paginated.length) {
		tbody.innerHTML =
			'<tr><td colspan="10" style="color:var(--muted);text-align:center;padding:2rem">No enquiries found matching criteria.</td></tr>'
		document.getElementById('enq-pagination-info').textContent =
			'Showing 0 to 0 of 0 entries'
		document.getElementById('enq-pagination-controls').innerHTML = ''
		return
	}

	// Row is configured to trigger openEnquiryDetail modal, safely excluding buttons and selectors
	tbody.innerHTML = paginated
		.map((e, idx) => {
			const globalIndex = startIndex + idx + 1
			return `
      <tr style="cursor:pointer" onclick="event.target.tagName !== 'SELECT' && event.target.tagName !== 'BUTTON' && openEnquiryDetail(${e.id})">
        <td>${globalIndex}</td>
        <td><strong style="color:var(--offwhite)">${escHtml(e.full_name)}</strong></td>
        <td style="font-size:.8rem">${escHtml(e.company || '—')}</td>
        <td style="font-size:.8rem">${escHtml(e.phone)}</td>
        <td style="font-size:.78rem">${escHtml(e.email)}</td>
        <td><span class="badge badge-blue" style="font-size:.7rem;white-space:nowrap">${escHtml(e.enquiry_type)}</span></td>
        <td style="max-width:150px;font-size:.78rem;color:var(--muted)">${escHtml((e.message || '').substring(0, 60))}${e.message?.length > 60 ? '…' : ''}</td>
        <td>
          <select onchange="updateEnquiryStatus(${e.id}, this.value)" onclick="event.stopPropagation()"
            style="background:var(--steel);border:1px solid var(--mid);border-radius:4px;padding:.25rem .4rem;color:var(--offwhite);font-size:.73rem;cursor:pointer">
            <option value="new" ${e.status === 'new' ? 'selected' : ''}>new</option>
            <option value="in_progress" ${e.status === 'in_progress' ? 'selected' : ''}>in_progress</option>
            <option value="resolved" ${e.status === 'resolved' ? 'selected' : ''}>resolved</option>
            <option value="ignored" ${e.status === 'ignored' ? 'selected' : ''}>ignored</option>
          </select>
        </td>
        <td style="font-size:.73rem;color:var(--muted);white-space:nowrap">${formatDate(e.created_at)}</td>
        <td><button class="btn-sm btn-danger" onclick="event.stopPropagation(); deleteEnquiry(${e.id})">Del</button></td>
      </tr>`
		})
		.join('')

	// Pagination Text Status
	const infoEl = document.getElementById('enq-pagination-info')
	if (infoEl) {
		infoEl.textContent = `Showing ${totalEntries ? startIndex + 1 : 0} to ${endIndex} of ${totalEntries} entries`
	}

	// Generate Truncated Pagination Controls with requested Font Awesome Icons
	const controlsEl = document.getElementById('enq-pagination-controls')
	if (controlsEl) {
		controlsEl.innerHTML = buildTruncatedPaginationHTML(
			enquiryCurrentPage,
			totalPages,
			'changeEnquiryPage',
		)
	}
}

// ── CUSTOM ENQUIRY DETAIL MODAL VIEW ──────────────────────────────────────────
function openEnquiryDetail(id) {
	const enq = enquiries.find((e) => e.id === id)
	if (!enq) return

	const modalEl = document.getElementById('enquiry-detail-modal-overlay')
	const bodyEl = document.getElementById('enquiry-detail-modal')

	bodyEl.innerHTML = `
    <div class="table-responsive">
      <table class="table table-bordered align-middle" style="color: var(--offwhite); border-color: var(--mid); font-size: 0.9rem;">
        <tbody>
          <tr>
            <th style="width: 35%; background: var(--black); color: var(--white); font-family: 'Barlow Condensed', sans-serif; text-transform: uppercase;">Full Name</th>
            <td>${escHtml(enq.full_name)}</td>
          </tr>
          <tr>
            <th style="background: var(--black); color: var(--white); font-family: 'Barlow Condensed', sans-serif; text-transform: uppercase;">Company</th>
            <td>${escHtml(enq.company || '—')}</td>
          </tr>
          <tr>
            <th style="background: var(--black); color: var(--white); font-family: 'Barlow Condensed', sans-serif; text-transform: uppercase;">Phone Number</th>
            <td><a href="tel:${escHtml(enq.phone)}" style="color: var(--yellow); text-decoration: none; font-weight: 600;">${escHtml(enq.phone)}</a></td>
          </tr>
          <tr>
            <th style="background: var(--black); color: var(--white); font-family: 'Barlow Condensed', sans-serif; text-transform: uppercase;">Email Address</th>
            <td><a href="mailto:${escHtml(enq.email)}" style="color: var(--yellow); text-decoration: none; font-weight: 600;">${escHtml(enq.email)}</a></td>
          </tr>
          <tr>
            <th style="background: var(--black); color: var(--white); font-family: 'Barlow Condensed', sans-serif; text-transform: uppercase;">Enquiry Type</th>
            <td><span class="badge badge-blue">${escHtml(enq.enquiry_type)}</span></td>
          </tr>
          <tr>
            <th style="background: var(--black); color: var(--white); font-family: 'Barlow Condensed', sans-serif; text-transform: uppercase;">Status</th>
            <td><span class="badge ${statusBadge(enq.status)}">${escHtml(enq.status)}</span></td>
          </tr>
          <tr>
            <th style="background: var(--black); color: var(--white); font-family: 'Barlow Condensed', sans-serif; text-transform: uppercase;">Submitted On</th>
            <td>${formatDate(enq.created_at)}</td>
          </tr>
          <tr>
            <th colspan="2" style="background: var(--black); color: var(--white); font-family: 'Barlow Condensed', sans-serif; text-transform: uppercase; text-align: center;">Message / Part Numbers</th>
          </tr>
          <tr>
            <td colspan="2" style="white-space: pre-wrap; background: var(--steel); line-height: 1.6; padding: 1.2rem; color: var(--muted); border: 1px solid var(--mid);">${escHtml(enq.message || '')}</td>
          </tr>
        </tbody>
      </table>
    </div>
  `

	const bsModal = bootstrap.Modal.getOrCreateInstance(modalEl)
	bsModal.show()
}

// ── MOBILE VIEW PRODUCT FILTER MODAL CONTROLLER ──
function openProductMobileFilters() {
	document.getElementById('prod-search-input-mob').value =
		document.getElementById('prod-search-input').value
	document.getElementById('prod-limit-select-mob').value =
		document.getElementById('prod-limit-select').value

	const modalEl = document.getElementById('product-filter-modal')
	const bsModal = bootstrap.Modal.getOrCreateInstance(modalEl)
	bsModal.show()
}

function applyProductMobileFilters() {
	const searchVal = document.getElementById('prod-search-input-mob').value
	const limitVal = document.getElementById('prod-limit-select-mob').value

	document.getElementById('prod-search-input').value = searchVal
	document.getElementById('prod-limit-select').value = limitVal

	productSearchQuery = searchVal.toLowerCase().trim()
	productPageSize = parseInt(limitVal, 10)
	productCurrentPage = 1
	renderProductsTable()

	const modalEl = document.getElementById('product-filter-modal')
	const bsModal = bootstrap.Modal.getInstance(modalEl)
	if (bsModal) bsModal.hide()
}

// ── MOBILE VIEW ENQUIRIES FILTER MODAL CONTROLLER ──
function openEnquiryMobileFilters() {
	document.getElementById('enq-search-input-mob').value =
		document.getElementById('enq-search-input').value
	document.getElementById('enq-limit-select-mob').value =
		document.getElementById('enq-limit-select').value
	document.getElementById('filter-status-mob').value =
		document.getElementById('filter-status').value
	document.getElementById('filter-type-mob').value =
		document.getElementById('filter-type').value

	const modalEl = document.getElementById('enquiry-filter-modal')
	const bsModal = bootstrap.Modal.getOrCreateInstance(modalEl)
	bsModal.show()
}

function applyEnquiryMobileFilters() {
	const searchVal = document.getElementById('enq-search-input-mob').value
	const limitVal = document.getElementById('enq-limit-select-mob').value
	const statusVal = document.getElementById('filter-status-mob').value
	const typeVal = document.getElementById('filter-type-mob').value

	document.getElementById('enq-search-input').value = searchVal
	document.getElementById('enq-limit-select').value = limitVal
	document.getElementById('filter-status').value = statusVal
	document.getElementById('filter-type').value = typeVal

	enquirySearchQuery = searchVal.toLowerCase().trim()
	enquiryPageSize = parseInt(limitVal, 10)
	enquiryCurrentPage = 1

	loadAdminEnquiries()

	const modalEl = document.getElementById('enquiry-filter-modal')
	const bsModal = bootstrap.Modal.getInstance(modalEl)
	if (bsModal) bsModal.hide()
}

async function updateEnquiryStatus(id, status) {
	try {
		await enquiryService.updateStatus(id, status)
		const enq = enquiries.find((e) => e.id === id)
		if (enq) enq.status = status
		renderOverview()
		showCustomAlert('Enquiry status updated.', 'success')
	} catch (e) {
		showCustomAlert('Failed to update status: ' + e.message, 'error')
		loadAdminEnquiries()
	}
}

async function deleteEnquiry(id) {
	const confirmed = await showCustomConfirm('Delete this enquiry?')
	if (!confirmed) return
	try {
		await enquiryService.delete(id)
		enquiries = enquiries.filter((e) => e.id !== id)
		renderEnquiriesTable()
		renderOverview()
		showCustomAlert('Enquiry removed.', 'success')
	} catch (e) {
		showCustomAlert('Failed to delete enquiry: ' + e.message, 'error')
	}
}

// ── OVERVIEW ──────────────────────────────────────────────────────────────────
function renderOverview() {
	const set = (id, val) => {
		const el = document.getElementById(id)
		if (el) el.textContent = val
	}
	set('ov-total', products.length)
	set('ov-active', products.filter((p) => p.status === 'active').length)
	set('ov-enq', enquiries.length)
	set('ov-new-enq', enquiries.filter((e) => e.status === 'new').length)

	const tbody = document.getElementById('recent-enq-body')
	if (!tbody) return
	if (!enquiries.length) {
		tbody.innerHTML =
			'<tr><td colspan="6" style="color:var(--muted);text-align:center;padding:1.5rem">No enquiries yet.</td></tr>'
		return
	}
	tbody.innerHTML = enquiries
		.slice(0, 5)
		.map(
			(e, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${escHtml(e.full_name)}</td>
      <td style="font-size:.8rem">${escHtml(e.company || '—')}</td>
      <td><span class="badge badge-blue" style="font-size:.7rem">${escHtml(e.enquiry_type)}</span></td>
      <td style="font-size:.75rem;color:var(--muted)">${formatDate(e.created_at)}</td>
      <td><span class="badge ${statusBadge(e.status)}">${e.status}</span></td>
    </tr>`,
		)
		.join('')
}

// ── CATALOGUE DOWNLOAD LEAD CAPTURE ───────────────────────────────────────────
// Non-sensitive marketing details only (name/company/phone/email) — fine to live
// in a plain, JS-readable cookie. Distinct from the httpOnly auth cookie.
const CATALOGUE_LEAD_COOKIE = 'ltork_catalogue_lead'
const CATALOGUE_LEAD_HOURS = 1

function setCookie(name, value, hours) {
	const expires = new Date(Date.now() + hours * 60 * 60 * 1000).toUTCString()
	document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`
}

function getCookie(name) {
	const match = document.cookie.match('(?:^|;\\s*)' + name + '=([^;]*)')
	return match ? decodeURIComponent(match[1]) : null
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

let pendingCatalogueDownload = null // { productId, productName, catalogueUrl }
// Bootstrap doesn't z-index-stack two modals shown at once — the second one renders
// behind the first's backdrop. So the detail modal is closed before the lead modal
// opens, and this remembers which product to reopen once the lead modal is dismissed.
let catalogueLeadReturnProductId = null

// Called from the "Download Catalogue" button in the product detail modal
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

// Records the download as an enquiry (so it shows up in the dashboard) and
// fires the same admin/client EmailJS notifications used for regular enquiries.
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

// ── PDF CATALOGUE MODAL ───────────────────────────────────────────────────────
function openPdfModal() {
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

// ── PRODUCT DETAIL MODAL ──────────────────────────────────────────────────────
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

// Close Product Detail Modal
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

	// SEO: Inject Product JSON-LD schema
	injectProductSchema(p)

	// SEO: Update canonical for product detail page
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

// ── SEO: Product JSON-LD Schema Injection ─────────────────────────────────────
function injectProductSchema(product) {
	// Remove any previously injected product schema
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

	// Clean undefined values
	const cleaned = JSON.parse(JSON.stringify(schema))

	const script = document.createElement('script')
	script.id = 'product-schema-jsonld'
	script.type = 'application/ld+json'
	script.textContent = JSON.stringify(cleaned)
	document.head.appendChild(script)
}

function removeProductSchema() {
	document.getElementById('product-schema-jsonld')?.remove()
	// Restore canonical to homepage
	const canonicalEl = document.getElementById('dynamic-canonical')
	if (canonicalEl) canonicalEl.href = SITE_URL + '/'
	setMetaTag('og:url', SITE_URL + '/')
}

// ── ADVANCED SLIDING WINDOW PAGINATION BUILDER ────────────────────────────────
function buildTruncatedPaginationHTML(
	currentPage,
	totalPages,
	changePageFuncName,
) {
	let buttonsHtml = ''

	// Angle icons mapped cleanly
	const iconAnglesLeft = '<i class="fa-solid fa-angles-left"></i>'
	const iconAngleLeft = '<i class="fa-solid fa-angle-left"></i>'
	const iconAngleRight = '<i class="fa-solid fa-angle-right"></i>'
	const iconAnglesRight = '<i class="fa-solid fa-angles-right"></i>'

	// Double Left Arrow (Starting Page)
	buttonsHtml += `<button class="btn-sm btn-ghost" style="margin:0; padding:.3rem .6rem;" ${currentPage === 1 ? 'disabled' : ''} onclick="${changePageFuncName}(1)" title="First Page">${iconAnglesLeft}</button>`

	// Single Left Arrow (Previous Page)
	buttonsHtml += `<button class="btn-sm btn-ghost" style="margin:0 .1rem; padding:.3rem .6rem;" ${currentPage === 1 ? 'disabled' : ''} onclick="${changePageFuncName}(${currentPage - 1})" title="Previous Page">${iconAngleLeft}</button>`

	const range = []
	if (totalPages <= 7) {
		for (let i = 1; i <= totalPages; i++) range.push(i)
	} else {
		if (currentPage <= 4) {
			// Show first 5 pages, ellipsis, and last page
			range.push(1, 2, 3, 4, 5, '...', totalPages)
		} else if (currentPage >= totalPages - 3) {
			// Show first page, ellipsis, and last 5 pages
			range.push(
				1,
				'...',
				totalPages - 4,
				totalPages - 3,
				totalPages - 2,
				totalPages - 1,
				totalPages,
			)
		} else {
			// Show first page, ellipsis, dynamic current range, ellipsis, and last page
			range.push(
				1,
				'...',
				currentPage - 1,
				currentPage,
				currentPage + 1,
				'...',
				totalPages,
			)
		}
	}

	range.forEach((item) => {
		if (item === '...') {
			buttonsHtml += `<span style="padding: 0 .4rem; color: var(--muted); align-self: center; font-size: 0.85rem; user-select: none;">...</span>`
		} else {
			buttonsHtml += `<button class="btn-sm ${item === currentPage ? 'btn-primary' : 'btn-ghost'}" style="margin:0 .1rem; padding:.3rem .6rem;" onclick="${changePageFuncName}(${item})">${item}</button>`
		}
	})

	// Single Right Arrow (Next Page)
	buttonsHtml += `<button class="btn-sm btn-ghost" style="margin:0 .1rem; padding:.3rem .6rem;" ${currentPage === totalPages ? 'disabled' : ''} onclick="${changePageFuncName}(${currentPage + 1})" title="Next Page">${iconAngleRight}</button>`

	// Double Right Arrow (Ending Page)
	buttonsHtml += `<button class="btn-sm btn-ghost" style="margin:0; padding:.3rem .6rem;" ${currentPage === totalPages ? 'disabled' : ''} onclick="${changePageFuncName}(${totalPages})" title="Last Page">${iconAnglesRight}</button>`

	return buttonsHtml
}

// ── CUSTOM MODAL NOTIFICATION/CONFIRM COMPONENTS ──────────────────────────────
let customAlertCallback = null

function showCustomAlert(message, type = 'info') {
	return new Promise((resolve) => {
		const iconEl = document.getElementById('custom-alert-icon')
		const titleEl = document.getElementById('custom-alert-title')
		const msgEl = document.getElementById('custom-alert-message')
		const cancelBtn = document.getElementById('custom-alert-cancel-btn')
		const okBtn = document.getElementById('custom-alert-ok-btn')

		msgEl.textContent = message
		cancelBtn.style.display = 'none'
		okBtn.textContent = 'OK'

		if (type === 'success') {
			iconEl.textContent = '✔️'
			titleEl.textContent = 'Success'
			titleEl.style.color = 'var(--green)'
		} else if (type === 'error') {
			iconEl.textContent = '❌'
			titleEl.textContent = 'Error'
			titleEl.style.color = 'var(--red)'
		} else {
			iconEl.textContent = 'ℹ️'
			titleEl.textContent = 'Information'
			titleEl.style.color = 'var(--yellow)'
		}

		customAlertCallback = (result) => {
			resolve(result)
		}

		const modalEl = document.getElementById('custom-alert-modal')
		const bsModal = bootstrap.Modal.getOrCreateInstance(modalEl)
		bsModal.show()
	})
}

function showCustomConfirm(message) {
	return new Promise((resolve) => {
		const iconEl = document.getElementById('custom-alert-icon')
		const titleEl = document.getElementById('custom-alert-title')
		const msgEl = document.getElementById('custom-alert-message')
		const cancelBtn = document.getElementById('custom-alert-cancel-btn')
		const okBtn = document.getElementById('custom-alert-ok-btn')

		msgEl.textContent = message
		iconEl.textContent = '❓'
		titleEl.textContent = 'Confirm Action'
		titleEl.style.color = 'var(--blue)'

		cancelBtn.style.display = 'inline-block'
		cancelBtn.textContent = 'Cancel'
		okBtn.textContent = 'Confirm'

		customAlertCallback = (result) => {
			resolve(result)
		}

		const modalEl = document.getElementById('custom-alert-modal')
		const bsModal = bootstrap.Modal.getOrCreateInstance(modalEl)
		bsModal.show()
	})
}

function closeCustomAlert(result) {
	const modalEl = document.getElementById('custom-alert-modal')
	const bsModal = bootstrap.Modal.getInstance(modalEl)
	if (bsModal) bsModal.hide()
	if (customAlertCallback) {
		customAlertCallback(result)
		customAlertCallback = null
	}
}

// ── HELPERS ───────────────────────────────────────────────────────────────────
function formatDate(iso) {
	if (!iso) return '—'
	return new Date(iso).toLocaleDateString('en-IN', {
		day: '2-digit',
		month: 'short',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
	})
}

// Map simple status styles
function statusBadge(s) {
	return (
		{
			new: 'badge-yellow',
			in_progress: 'badge-blue',
			resolved: 'badge-green',
			ignored: 'badge-red',
		}[s] || 'badge-yellow'
	)
}

function productStatusBadge(s) {
	return (
		{
			active: 'badge-green',
			draft: 'badge-yellow',
			out_of_stock: 'badge-red',
			archived: 'badge-red',
		}[s] || 'badge-yellow'
	)
}

function escHtml(str) {
	return String(str || '')
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
}

// ── INIT ──────────────────────────────────────────────────────────────────────
;(function init() {
	// SEO: Resolve initial page from URL path (SPA deep-link)
	const initialPath = window.location.pathname.replace(/^\/+|\/+$/g, '')
	const sectionKey = Object.keys(SECTION_ROUTES).find(
		(k) => SECTION_ROUTES[k].path.replace(/^\/+|\/+$/g, '') === initialPath,
	)
	const pageKey = Object.keys(SEO_META).find(
		(k) => SEO_META[k].path.replace(/^\/+|\/+$/g, '') === initialPath,
	)

	if (sectionKey) {
		const route = SECTION_ROUTES[sectionKey]
		// Set page active without pushState
		document.getElementById('page-' + route.page)?.classList.add('active')
		updateSEOMeta(route.page, sectionKey)
		history.replaceState({ page: route.page, section: sectionKey }, '', route.path)
		setTimeout(
			() => document.getElementById(sectionKey)?.scrollIntoView(),
			120,
		)
	} else if (pageKey && pageKey !== 'home') {
		showPage(pageKey, false)
	} else {
		updateSEOMeta('home')
		history.replaceState({ page: 'home' }, '', '/')
	}

	loadLandingProducts()
	restoreSession().then(() => {
		if (
			isLoggedIn &&
			document.getElementById('page-dashboard')?.classList.contains('active')
		) {
			showPage('dashboard', false)
		}
	})
})()
