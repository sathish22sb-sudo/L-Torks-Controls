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
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 10000)

    const res = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      cache: 'no-store',
    })
    clearTimeout(timer)

    const elapsed = Date.now() - start
    const html = await res.text()

    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
    const descMatch = html.match(/<meta\s+name="description"\s+content="([^"]+)"/i)
    const canonicalMatch = html.match(/<link\s+rel="canonical"\s+href="([^"]+)"/i)

    return {
      path: page.path,
      status: res.ok ? 'ok' : `HTTP ${res.status}`,
      ms: elapsed,
      title: titleMatch ? titleMatch[1].trim().substring(0, 80) : null,
      desc: descMatch ? 'yes' : 'no',
      canonical: canonicalMatch ? 'yes' : 'no',
    }
  } catch (err) {
    return {
      path: page.path,
      status: 'error',
      ms: Date.now() - start,
      error: err.name === 'AbortError' ? 'timeout' : err.message?.substring(0, 60),
    }
  }
}

export default async function handler(req, res) {
  try {
    const results = []

    for (const page of PAGES) {
      const result = await crawlPage(page)
      results.push(result)
    }

    const ok = results.filter((r) => r.status === 'ok').length

    return res.status(200).json({
      service: 'crawl',
      ok,
      total: results.length,
      ts: new Date().toISOString(),
    })
  } catch (err) {
    return res.status(200).json({
      service: 'crawl',
      error: err.message?.substring(0, 100),
      ts: new Date().toISOString(),
    })
  }
}
