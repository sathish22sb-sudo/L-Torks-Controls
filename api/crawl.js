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

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

async function crawlPage(page) {
  const url = `${SITE_URL}${page.path}`
  const start = Date.now()

  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 15000)

    const res = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; LTorkCrawlBot/1.0)',
        'Accept': 'text/html',
      },
      cache: 'no-store',
    })
    clearTimeout(timer)

    const elapsed = Date.now() - start
    const html = await res.text()

    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
    const descMatch = html.match(/<meta\s+name="description"\s+content="([^"]+)"/i)
    const canonicalMatch = html.match(/<link\s+rel="canonical"\s+href="([^"]+)"/i)
    const keywordsMatch = html.match(/<meta\s+name="keywords"\s+content="([^"]+)"/i)

    return {
      url,
      path: page.path,
      priority: page.priority,
      status: res.ok ? 'success' : 'error',
      statusCode: res.status,
      responseTime: elapsed,
      size: html.length,
      title: titleMatch ? titleMatch[1].trim() : null,
      description: descMatch ? descMatch[1].trim().substring(0, 120) : null,
      canonical: canonicalMatch ? canonicalMatch[1] : null,
      hasKeywords: !!keywordsMatch,
      timestamp: new Date().toISOString(),
    }
  } catch (err) {
    const elapsed = Date.now() - start
    let errorMsg = 'Network error'
    if (err.name === 'AbortError') errorMsg = 'Timeout (>15s)'
    else if (err.message) errorMsg = err.message

    return {
      url,
      path: page.path,
      priority: page.priority,
      status: 'error',
      statusCode: 0,
      responseTime: elapsed,
      error: errorMsg,
      timestamp: new Date().toISOString(),
    }
  }
}

export default async function handler(req, res) {
  if (req.method === 'GET' && req.query.status === 'health') {
    return res.status(200).json({ status: 'ok', service: 'crawl', timestamp: new Date().toISOString() })
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const results = []
  for (const page of PAGES) {
    const result = await crawlPage(page)
    results.push(result)
    if (PAGES.indexOf(page) < PAGES.length - 1) {
      await sleep(1500)
    }
  }

  const successCount = results.filter((r) => r.status === 'success').length
  const errorCount = results.filter((r) => r.status === 'error').length
  const avgResponseTime = Math.round(
    results.filter((r) => r.responseTime > 0).reduce((a, b) => a + b.responseTime, 0) /
    results.filter((r) => r.responseTime > 0).length
  )

  return res.status(200).json({
    service: 'page-crawl',
    timestamp: new Date().toISOString(),
    total: results.length,
    success: successCount,
    errors: errorCount,
    avgResponseTime,
    results,
  })
}
