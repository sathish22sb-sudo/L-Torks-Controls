const _request = async (method, path, body = null, isFormData = false) => {
  const headers = {
    'x-tenant-id': CONFIG.TENANT_ID,
  }

  if (!isFormData) headers['Content-Type'] = 'application/json'

  // Auth token lives in an httpOnly cookie set by the backend — never touched by JS.
  // 'include' makes the browser send/accept it even though frontend and backend are on different domains.
  const options = { method, headers, credentials: 'include', cache: 'no-store' }
  if (body) options.body = isFormData ? body : JSON.stringify(body)

  const res = await fetch(
    `${CONFIG.BASE_URL}/api/${CONFIG.API_VERSION}${path}`,
    options
  )

  const data = await res.json()
  if (!res.ok) {
    const message = data.error?.errorMessage || 'Request failed'
    const err = new Error(message)
    err.status = res.status
    err.data = data
    throw err
  }

  return data.data
}

const api = {
  get: (path) => _request('GET', path),
  post: (path, body) => _request('POST', path, body),
  put: (path, body) => _request('PUT', path, body),
  patch: (path, body) => _request('PATCH', path, body),
  del: (path) => _request('DELETE', path),
  postForm: (path, formData) => _request('POST', path, formData, true),
  putForm: (path, formData) => _request('PUT', path, formData, true),
}
