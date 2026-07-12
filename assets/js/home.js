// ── HOME PAGE MODULE ─────────────────────────────────────────────────────────
// Depends on: products-page.js (products, loadLandingProducts, openProductDetail, catalogue lead functions, etc.)

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
