const ENDPOINTS = [
  { name: 'Stage API', url: 'https://stage.api.ltorkcontrols.com/health', key: 'stage' },
  { name: 'Live API', url: 'https://api.ltorkcontrols.com/health', key: 'live' },
]

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

async function pingEndpoint(endpoint) {
  const start = Date.now()
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 10000)

    const res = await fetch(endpoint.url, {
      method: 'GET',
      signal: controller.signal,
      cache: 'no-store',
    })
    clearTimeout(timer)

    const elapsed = Date.now() - start
    const body = await res.json().catch(() => null)
    const online = res.ok && body && body.status === 'ok'

    return {
      name: endpoint.name,
      key: endpoint.key,
      url: endpoint.url,
      online,
      statusCode: res.status,
      responseTime: elapsed,
      timestamp: new Date().toISOString(),
      error: online ? null : `Status: ${res.status}`,
    }
  } catch (err) {
    const elapsed = Date.now() - start
    let errorMsg = 'Network error'
    if (err.name === 'AbortError') errorMsg = 'Timeout (>10s)'
    else if (err.message) errorMsg = err.message

    return {
      name: endpoint.name,
      key: endpoint.key,
      url: endpoint.url,
      online: false,
      statusCode: 0,
      responseTime: elapsed,
      timestamp: new Date().toISOString(),
      error: errorMsg,
    }
  }
}

export default async function handler(req, res) {
  if (req.method === 'GET' && req.query.status === 'health') {
    return res.status(200).json({ status: 'ok', service: 'keepalive', timestamp: new Date().toISOString() })
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const results = []
  for (const ep of ENDPOINTS) {
    const result = await pingEndpoint(ep)
    results.push(result)
    if (ENDPOINTS.indexOf(ep) < ENDPOINTS.length - 1) {
      await sleep(1000)
    }
  }

  return res.status(200).json({
    service: 'keepalive',
    timestamp: new Date().toISOString(),
    results,
  })
}
