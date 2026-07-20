const ENDPOINTS = [
  { name: 'Stage', url: 'https://stage.api.ltorkcontrols.com/health' },
  { name: 'Live', url: 'https://api.ltorkcontrols.com/health' },
]

async function ping(ep) {
  try {
    const r = await fetch(ep.url, { cache: 'no-store', signal: AbortSignal.timeout(8000) })
    const body = await r.json().catch(() => null)
    return { name: ep.name, ok: r.ok && body?.status === 'ok', ms: r.headers.get('x-response-time') || '?' }
  } catch (e) {
    return { name: ep.name, ok: false, error: e.name === 'TimeoutError' ? 'timeout' : e.message?.substring(0, 40) }
  }
}

export default async function handler(req, res) {
  try {
    const results = await Promise.all(ENDPOINTS.map(ping))
    return res.status(200).json({ service: 'keepalive', ts: new Date().toISOString(), results })
  } catch (err) {
    return res.status(200).json({ service: 'keepalive', error: err.message?.substring(0, 100), ts: new Date().toISOString() })
  }
}
