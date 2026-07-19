// ── EMAILJS CONFIGURATION ──────────────────────────────────────────────────
const EMAILJS_PUBLIC_KEY = 'fZQUFQff4QwX2i_ky'
const EMAILJS_SERVICE_ID = 'service_xz7b2qp'
const EMAILJS_ADMIN_TEMPLATE_ID = 'template_fqdvotp'
const EMAILJS_CLIENT_TEMPLATE_ID = 'template_f8v0l0d'

;(function initEmailJS() {
	if (
		typeof emailjs !== 'undefined' &&
		EMAILJS_PUBLIC_KEY &&
		EMAILJS_PUBLIC_KEY !== 'YOUR_EMAILJS_PUBLIC_KEY'
	) {
		emailjs.init(EMAILJS_PUBLIC_KEY)
	} else if (typeof emailjs === 'undefined') {
		console.error(
			'EmailJS SDK script library is not loaded. Ensure the CDN script tag is in the <head> of the HTML file.',
		)
	} else {
		console.warn(
			'EmailJS loaded, but is waiting for you to populate your active Public Key in config.js.',
		)
	}
})()

// ── GLOBAL STATE ───────────────────────────────────────────────────────────
const AppState = {
	isLoggedIn: false,
	authUser: null,
}

// ── AUTH ──────────────────────────────────────────────────────────────────────
async function restoreSession() {
	try {
		AppState.authUser = await api.get('/auth/me')
		AppState.isLoggedIn = true
	} catch {
		AppState.isLoggedIn = false
		AppState.authUser = null
	}
}

async function doLogout() {
	try {
		await api.post('/auth/logout')
	} catch {
		// clear local state regardless of network failure
	}
	AppState.isLoggedIn = false
	AppState.authUser = null
	window.location.href = '/'
}

// ── NAVIGATION ────────────────────────────────────────────────────────────────
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

function closeMobileMenu() {
	const links = document.getElementById('nav-links-menu')
	const btn = document.getElementById('nav-toggle-btn')
	if (links && links.classList.contains('open')) {
		links.classList.remove('open')
		btn.innerHTML = '<i class="fa-solid fa-bars"></i>'
	}
}

function openDashboard() {
	window.location.href = AppState.isLoggedIn ? '/dashboard' : '/login'
}

// ── COMPONENTS: NAVIGATION BAR ──────────────────────────────────────────────
function renderNav(activePage) {
	const currentPath = activePage || window.location.pathname.replace(/^\/+|\/+$/g, '') || ''
	const isHome = currentPath === '' || currentPath === 'index.html'
	const isActive = (page) => {
		if (page === 'home' && isHome) return ' active-link'
		if (page !== 'home' && currentPath.startsWith(page)) return ' active-link'
		return ''
	}

	const navHTML = `
	<a class="nav-logo" href="/" onclick="closeMobileMenu()">
		<img src="/assets/images/logo.png" alt="L Tork Controls Logo" class="brand-logo-img" width="450" height="300"
			onerror="this.style.display='none';this.nextElementSibling.style.display='inline'"/>
		<span style="display:none">L TORK <span>CONTROLS</span></span>
	</a>
	<button class="nav-toggle" id="nav-toggle-btn" onclick="toggleMobileMenu()" aria-label="Toggle Navigation">
		<i class="fa-solid fa-bars"></i>
	</button>
	<ul class="nav-links" id="nav-links-menu">
		<li><a href="/" class="${isActive('home')}">Home</a></li>
		<li><a href="/about" class="${isActive('about')}">About</a></li>
		<li><a href="/products" class="${isActive('products')}">Products</a></li>
		<li><a href="/#services" class="${isActive('home')}">Services</a></li>
		<li><a href="/contact" class="${isActive('contact')}">Contact</a></li>
	</ul>`

	const navEl = document.getElementById('main-nav')
	if (navEl) navEl.innerHTML = navHTML
}

// ── COMPONENTS: FOOTER ──────────────────────────────────────────────────────
function renderFooter() {
	const footerHTML = `
	<div class="footer-top">
		<div class="footer-brand">
			<div class="footer-logo">
				<img src="/assets/images/logo.png" alt="L Tork Controls Logo" class="brand-logo-img" width="450" height="300"
					onerror="this.style.display='none';this.nextElementSibling.style.display='inline'"/>
				<span style="display:none">L Tork <span>Controls</span></span>
			</div>
			<p>25+ years of excellence in electrical actuators, limit switches, and industrial automation solutions.</p>
		</div>
		<div class="footer-col">
			<h3>Company</h3>
			<ul>
				<li><a href="/">Home</a></li>
				<li><a href="/about">About Us</a></li>
				<li><a href="/products">Products</a></li>
				<li><a href="/contact">Contact</a></li>
				<li><a href="/dashboard">Dashboard</a></li>
			</ul>
		</div>
		<div class="footer-col">
			<h3>Contact</h3>
			<ul>
				<li><a href="https://maps.google.com/?q=L+TORK+CONTROLS+INDUSTRIAL+ESTATE,+96E,+SIDCO+Industrial+Estate,+Winterpet,+Arakkonam,+Tamil+Nadu+631005" target="_blank" rel="noopener noreferrer" style="font-size:0.8rem;line-height:1.4">L Tork Controls INDUSTRIAL ESTATE, 96E, SIDCO Industrial Estate, Arakkonam, Ranipet Dist 631005</a></li>
				<li><a href="mailto:infoltorkcontrols@gmail.com">infoltorkcontrols@gmail.com</a></li>
				<li><a href="tel:+918015261574">+91 80152 61574</a></li>
			</ul>
		</div>
	</div>
	<div class="footer-bottom">
		<p>&copy; ${new Date().getFullYear()} L Tork Controls. All Rights Reserved. | Designed by <strong>Vici Studio</strong></p>
	</div>`

	const footerEl = document.getElementById('main-footer')
	if (footerEl) footerEl.innerHTML = footerHTML
}

// ── COMPONENTS: CUSTOM ALERT / CONFIRM ──────────────────────────────────────
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
			iconEl.textContent = '\u2714\uFE0F'
			titleEl.textContent = 'Success'
			titleEl.style.color = 'var(--green)'
		} else if (type === 'error') {
			iconEl.textContent = '\u274C'
			titleEl.textContent = 'Error'
			titleEl.style.color = 'var(--red)'
		} else {
			iconEl.textContent = '\u2139\uFE0F'
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
		iconEl.textContent = '\u2753'
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

// ── COMPONENTS: CUSTOM ALERT MODAL HTML (inject on every page) ──────────────
function renderAlertModal() {
	return `
	<div class="modal fade" id="custom-alert-modal" tabindex="-1" aria-hidden="true" style="z-index:2050">
		<div class="modal-dialog modal-dialog-centered" style="max-width:400px">
			<div class="modal-content text-center" style="background:var(--steel);color:var(--offwhite);border:1px solid var(--mid);border-radius:8px;padding:2rem;box-shadow:0 15px 40px rgba(14,47,118,0.15)">
				<div id="custom-alert-icon" style="font-size:3.5rem;margin-bottom:0.8rem;line-height:1"></div>
				<h3 id="custom-alert-title" style="font-family:'Barlow Condensed',sans-serif;font-size:1.6rem;font-weight:800;text-transform:uppercase;color:var(--white);margin-bottom:0.5rem">System Message</h3>
				<p id="custom-alert-message" style="color:var(--muted);font-size:0.95rem;margin-bottom:1.5rem;line-height:1.5"></p>
				<div class="d-flex justify-content-center gap-2" id="custom-alert-actions">
					<button id="custom-alert-cancel-btn" class="btn-ghost" style="margin:0;padding:0.55rem 1.5rem" onclick="closeCustomAlert(false)">Cancel</button>
					<button id="custom-alert-ok-btn" class="btn-primary" style="padding:0.55rem 1.5rem" onclick="closeCustomAlert(true)">OK</button>
				</div>
			</div>
		</div>
	</div>`
}

// ── HELPERS ───────────────────────────────────────────────────────────────────
function formatDate(iso) {
	if (!iso) return '\u2014'
	return new Date(iso).toLocaleDateString('en-IN', {
		day: '2-digit',
		month: 'short',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
	})
}

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

// ── COOKIE HELPERS ──────────────────────────────────────────────────────────
function setCookie(name, value, hours) {
	const expires = new Date(Date.now() + hours * 60 * 60 * 1000).toUTCString()
	document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`
}

function getCookie(name) {
	const match = document.cookie.match('(?:^|;\\s*)' + name + '=([^;]*)')
	return match ? decodeURIComponent(match[1]) : null
}

// ── PAGINATION BUILDER ──────────────────────────────────────────────────────
function buildTruncatedPaginationHTML(currentPage, totalPages, changePageFuncName) {
	let buttonsHtml = ''

	const iconAnglesLeft = '<i class="fa-solid fa-angles-left"></i>'
	const iconAngleLeft = '<i class="fa-solid fa-angle-left"></i>'
	const iconAngleRight = '<i class="fa-solid fa-angle-right"></i>'
	const iconAnglesRight = '<i class="fa-solid fa-angles-right"></i>'

	buttonsHtml += `<button class="btn-sm btn-ghost" style="margin:0; padding:.3rem .6rem;" ${currentPage === 1 ? 'disabled' : ''} onclick="${changePageFuncName}(1)" title="First Page">${iconAnglesLeft}</button>`
	buttonsHtml += `<button class="btn-sm btn-ghost" style="margin:0 .1rem; padding:.3rem .6rem;" ${currentPage === 1 ? 'disabled' : ''} onclick="${changePageFuncName}(${currentPage - 1})" title="Previous Page">${iconAngleLeft}</button>`

	const range = []
	if (totalPages <= 7) {
		for (let i = 1; i <= totalPages; i++) range.push(i)
	} else {
		if (currentPage <= 4) {
			range.push(1, 2, 3, 4, 5, '...', totalPages)
		} else if (currentPage >= totalPages - 3) {
			range.push(1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages)
		} else {
			range.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages)
		}
	}

	range.forEach((item) => {
		if (item === '...') {
			buttonsHtml += `<span style="padding:0 .4rem;color:var(--muted);align-self:center;font-size:0.85rem;user-select:none">...</span>`
		} else {
			buttonsHtml += `<button class="btn-sm ${item === currentPage ? 'btn-primary' : 'btn-ghost'}" style="margin:0 .1rem;padding:.3rem .6rem;" onclick="${changePageFuncName}(${item})">${item}</button>`
		}
	})

	buttonsHtml += `<button class="btn-sm btn-ghost" style="margin:0 .1rem; padding:.3rem .6rem;" ${currentPage === totalPages ? 'disabled' : ''} onclick="${changePageFuncName}(${currentPage + 1})" title="Next Page">${iconAngleRight}</button>`
	buttonsHtml += `<button class="btn-sm btn-ghost" style="margin:0; padding:.3rem .6rem;" ${currentPage === totalPages ? 'disabled' : ''} onclick="${changePageFuncName}(${totalPages})" title="Last Page">${iconAnglesRight}</button>`

	return buttonsHtml
}

// ── EMAILJS DISPATCH HELPER ─────────────────────────────────────────────────
async function dispatchEmails(adminParams, clientParams) {
	if (
		typeof emailjs === 'undefined' ||
		!EMAILJS_PUBLIC_KEY ||
		EMAILJS_PUBLIC_KEY === 'YOUR_EMAILJS_PUBLIC_KEY'
	) {
		console.warn('EmailJS call bypassed. Populate your Public Key in config.js to enable email dispatches.')
		return
	}

	const emailSends = []

	if (EMAILJS_ADMIN_TEMPLATE_ID) {
		emailSends.push(
			emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_ADMIN_TEMPLATE_ID, adminParams)
				.then((res) => console.log('Admin notification triggered:', res.status, res.text))
				.catch((err) => console.error('Admin EmailJS trigger failed:', err)),
		)
	}

	if (EMAILJS_CLIENT_TEMPLATE_ID && EMAILJS_CLIENT_TEMPLATE_ID !== 'YOUR_CLIENT_TEMPLATE_ID') {
		emailSends.push(
			emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_CLIENT_TEMPLATE_ID, clientParams)
				.then((res) => console.log('Client auto-reply triggered:', res.status, res.text))
				.catch((err) => console.error('Client EmailJS auto-reply failed:', err)),
		)
	}

	if (emailSends.length > 0) {
		await Promise.all(emailSends)
	}
}

// ── PAGE INIT HELPER ────────────────────────────────────────────────────────
function initPage(activePage) {
	const alertContainer = document.getElementById('alert-modal-container')
	if (alertContainer) alertContainer.innerHTML = renderAlertModal()
	renderNav(activePage)
	renderFooter()
	restoreSession()
}
