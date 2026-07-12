// ── DASHBOARD STATE ─────────────────────────────────────────────────────────
let products = []
let enquiries = []
let editingProductId = null

let productSearchQuery = ''
let productPageSize = 5
let productCurrentPage = 1

let enquirySearchQuery = ''
let enquiryPageSize = 5
let enquiryCurrentPage = 1

// ── DASHBOARD AUTH GUARD ────────────────────────────────────────────────────
async function initDashboard() {
	await restoreSession()
	if (!AppState.isLoggedIn) {
		window.location.href = '/login'
		return
	}
	const emailEl = document.getElementById('dash-user-email')
	if (emailEl) emailEl.textContent = AppState.authUser?.email || ''
	loadDashboard()
}

// ── DASHBOARD TAB / SECTION SWITCHER ────────────────────────────────────────
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

// ── DASHBOARD INIT ──────────────────────────────────────────────────────────
async function loadDashboard() {
	await Promise.all([loadAdminProducts(), loadAdminEnquiries()])
	renderOverview()
}

// ── OVERVIEW / STATS ────────────────────────────────────────────────────────
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

// ── ADMIN PRODUCTS SEARCH AND PAGINATION CONTROLLERS ────────────────────────
function handleProductSearch(val) {
	productSearchQuery = val.toLowerCase().trim()
	productCurrentPage = 1
	renderProductsTable()
}

function handleProductLimitChange(val) {
	productPageSize = parseInt(val, 10)
	productCurrentPage = 1
	renderProductsTable()
}

function changeProductPage(page) {
	productCurrentPage = page
	renderProductsTable()
}

// ── ADMIN PRODUCTS ──────────────────────────────────────────────────────────
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

	const infoEl = document.getElementById('prod-pagination-info')
	if (infoEl) {
		infoEl.textContent = `Showing ${totalEntries ? startIndex + 1 : 0} to ${endIndex} of ${totalEntries} entries`
	}

	const controlsEl = document.getElementById('prod-pagination-controls')
	if (controlsEl) {
		controlsEl.innerHTML = buildTruncatedPaginationHTML(
			productCurrentPage,
			totalPages,
			'changeProductPage',
		)
	}
}

// ── PRODUCT MODAL ───────────────────────────────────────────────────────────
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

// ── SPECIFICATIONS EDITOR ───────────────────────────────────────────────────
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

// ── SAVE PRODUCT ────────────────────────────────────────────────────────────
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

// ── DELETE PRODUCT ──────────────────────────────────────────────────────────
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

// ── ADMIN ENQUIRIES SEARCH AND PAGINATION CONTROLLERS ───────────────────────
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

// ── ADMIN ENQUIRIES ─────────────────────────────────────────────────────────
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

	const infoEl = document.getElementById('enq-pagination-info')
	if (infoEl) {
		infoEl.textContent = `Showing ${totalEntries ? startIndex + 1 : 0} to ${endIndex} of ${totalEntries} entries`
	}

	const controlsEl = document.getElementById('enq-pagination-controls')
	if (controlsEl) {
		controlsEl.innerHTML = buildTruncatedPaginationHTML(
			enquiryCurrentPage,
			totalPages,
			'changeEnquiryPage',
		)
	}
}

// ── CUSTOM ENQUIRY DETAIL MODAL ─────────────────────────────────────────────
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

// ── UPDATE ENQUIRY STATUS ───────────────────────────────────────────────────
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

// ── DELETE ENQUIRY ──────────────────────────────────────────────────────────
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

// ── MOBILE VIEW PRODUCT FILTER MODAL ────────────────────────────────────────
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

// ── MOBILE VIEW ENQUIRIES FILTER MODAL ──────────────────────────────────────
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

// ── DASHBOARD BOOTSTRAP ─────────────────────────────────────────────────────
;(function () {
	if (window.location.pathname.startsWith('/dashboard')) {
		renderNav('dashboard')
		initDashboard()
	}
})()
