import crypto from 'crypto'

const SITE_URL = 'https://www.ltorkcontrols.com'

const PAGES = [
  { path: '/',          type: 'URL_UPDATED' },
  { path: '/about',     type: 'URL_UPDATED' },
  { path: '/products',  type: 'URL_UPDATED' },
  { path: '/services',  type: 'URL_UPDATED' },
  { path: '/contact',   type: 'URL_UPDATED' },
  { path: '/privacy',   type: 'URL_UPDATED' },
  { path: '/refund',    type: 'URL_UPDATED' },
  { path: '/shipping',  type: 'URL_UPDATED' },
  { path: '/terms',     type: 'URL_UPDATED' },
]

function createJWT(serviceAccount) {
  const now = Math.floor(Date.now() / 1000)
  const header = { alg: 'RS256', typ: 'JWT' }
  const payload = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/indexing',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  }

  const encode = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url')
  const signingInput = `${encode(header)}.${encode(payload)}`

  const sign = crypto.createSign('RSA-SHA256')
  sign.update(signingInput)
  sign.end()
  const signature = sign.sign(serviceAccount.private_key, 'base64url')

  return `${signingInput}.${signature}`
}

async function getAccessToken(jwt) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Token error: ${res.status} ${err}`)
  }

  const data = await res.json()
  return data.access_token
}

async function publishUrl(accessToken, url, type) {
  const res = await fetch('https://indexing.googleapis.com/v3/urlNotifications:publish', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ url, type }),
  })

  const data = await res.json()
  return {
    url,
    status: res.ok ? 'success' : 'error',
    statusCode: res.status,
    notificationType: data.latestUpdate?.type || null,
    error: res.ok ? null : (data.error?.message || 'Unknown error'),
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

export default async function handler(req, res) {
  if (req.method === 'GET' && req.query.status === 'health') {
    return res.status(200).json({ status: 'ok', service: 'ping', timestamp: new Date().toISOString() })
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const keyJson = process.env.GOOGLE_SERVICE_ACCOUNT_KEY
  if (!keyJson) {
    return res.status(500).json({
      error: 'GOOGLE_SERVICE_ACCOUNT_KEY environment variable not set',
      hint: 'Add the service account JSON as a Vercel env variable',
    })
  }

  let serviceAccount
  try {
    serviceAccount = JSON.parse(keyJson)
  } catch {
    return res.status(500).json({ error: 'Invalid GOOGLE_SERVICE_ACCOUNT_KEY JSON' })
  }

  try {
    const jwt = createJWT(serviceAccount)
    const accessToken = await getAccessToken(jwt)

    const results = []
    for (const page of PAGES) {
      const url = `${SITE_URL}${page.path}`
      const result = await publishUrl(accessToken, url, page.type)
      results.push(result)
      if (PAGES.indexOf(page) < PAGES.length - 1) {
        await sleep(200)
      }
    }

    const successCount = results.filter((r) => r.status === 'success').length
    const errorCount = results.filter((r) => r.status === 'error').length

    return res.status(200).json({
      service: 'google-indexing-ping',
      timestamp: new Date().toISOString(),
      total: results.length,
      success: successCount,
      errors: errorCount,
      results,
    })
  } catch (err) {
    return res.status(500).json({
      service: 'google-indexing-ping',
      error: err.message,
      timestamp: new Date().toISOString(),
    })
  }
}
