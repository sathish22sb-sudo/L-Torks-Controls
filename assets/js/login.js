async function doLogin() {
	const email = document.getElementById('login-email').value.trim()
	const password = document.getElementById('login-password').value
	const errEl = document.getElementById('login-error')

	try {
		const result = await api.post('/auth/login', { email, password })
		AppState.isLoggedIn = true
		AppState.authUser = result.user
		errEl.style.display = 'none'
		window.location.href = '/dashboard'
	} catch (e) {
		errEl.style.display = 'block'
		errEl.textContent = '❌ ' + (e.message || 'Invalid credentials')
		document.getElementById('login-password').value = ''
	}
}

function togglePw() {
	const inp = document.getElementById('login-password')
	inp.type = inp.type === 'password' ? 'text' : 'password'
}
