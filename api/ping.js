const crypto = require('crypto')

const SITE_URL = 'https://www.ltorkcontrols.com'

const PAGES = [
  '/', '/about', '/products', '/services', '/contact',
  '/privacy', '/refund', '/shipping', '/terms',
]

function createJWT(sa) {
  const now = Math.floor(Date.now() / 1000)
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url')
  const payload = Buffer.from(JSON.stringify({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/indexing',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  })).toString('base64url')

  const input = `${header}.${payload}`
  const sig = crypto.createSign('RSA-SHA256').update(input).end().sign(sa.private_key, 'base64url')
  return `${input}.${sig}`
}

async function getToken(jwt) {
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt }),
  })
  if (!r.ok) throw new Error(`token ${r.status}`)
  return (await r.json()).access_token
}

async function notify(token, url) {
  const r = await fetch('https://indexing.googleapis.com/v3/urlNotifications:publish', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, type: 'URL_UPDATED' }),
  })
  return { url, ok: r.ok, status: r.status }
}

export default async function handler(req, res) {
  try {
    const keyJson = process.env.GOOGLE_SERVICE_ACCOUNT_KEY
    if (!keyJson) {
      return res.status(200).json({ service: 'ping', error: 'env_not_set', ts: new Date().toISOString() })
    }

    const sa = JSON.parse(keyJson)
    const jwt = createJWT(sa)
    const token = await getToken(jwt)

    let ok = 0, fail = 0
    for (const path of PAGES) {
      const r = await notify(token, `${SITE_URL}${path}`)
      if (r.ok) ok++
      else fail++
    }

    return res.status(200).json({ service: 'ping', ok, fail, ts: new Date().toISOString() })
  } catch (err) {
    return res.status(200).json({ service: 'ping', error: err.message?.substring(0, 100), ts: new Date().toISOString() })
  }
}
