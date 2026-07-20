const SITE_URL = 'https://www.ltorkcontrols.com'

const PAGES = [
  { path: '/',          priority: 1.0 },
  { path: '/about',     priority: 0.8 },
  { path: '/products',  priority: 0.9 },
  { path: '/services',  priority: 0.8 },
  { path: '/contact',   priority: 0.8 },
  { path: '/privacy',   priority: 0.3 },
  { path: '/refund',    priority: 0.3 },
  { path: '/shipping',  priority: 0.3 },
  { path: '/terms',     priority: 0.3 },
]

async function crawlPage(page) {
  const url = `${SITE_URL}${page.path}`
  const start = Date.now()
  try {
    const res = await fetch(url, {
      method: 'GET',
      cache: 'no-store',
      signal: AbortSignal.timeout(10000),
    })
    const html = await res.text()
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
    return {
      path: page.path,
      status: res.ok ? 'ok' : `HTTP ${res.status}`,
      ms: Date.now() - start,
      title: titleMatch ? titleMatch[1].trim().substring(0, 80) : null,
    }
  } catch (err) {
    return {
      path: page.path,
      status: 'error',
      ms: Date.now() - start,
      error: err.name === 'TimeoutError' ? 'timeout' : (err.message || '').substring(0, 60),
    }
  }
}

module.exports = async function handler(req, res) {
  try {
    if (req.query.status === 'health') {
      return res.status(200).json({ status: 'ok', service: 'crawl' })
    }
    const results = []
    for (const page of PAGES) {
      results.push(await crawlPage(page))
    }
    const ok = results.filter((r) => r.status === 'ok').length
    return res.status(200).json({ service: 'crawl', ok, total: results.length, ts: new Date().toISOString() })
  } catch (err) {
    return res.status(200).json({ service: 'crawl', error: (err.message || '').substring(0, 100) })
  }
}
