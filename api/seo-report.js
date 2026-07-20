const SITE_URL = 'https://www.ltorkcontrols.com'

const PAGES = [
  { path: '/', name: 'Homepage' },
  { path: '/about', name: 'About' },
  { path: '/products', name: 'Products' },
  { path: '/services', name: 'Services' },
  { path: '/contact', name: 'Contact' },
  { path: '/privacy', name: 'Privacy' },
  { path: '/refund', name: 'Refund' },
  { path: '/shipping', name: 'Shipping' },
  { path: '/terms', name: 'Terms' },
]

function extract(html, pattern) {
  const m = html.match(pattern)
  return m ? m[1].trim() : null
}

export default async function handler(req, res) {
  try {
    if (req.query.status === 'health') {
      return res.status(200).json({ status: 'ok', service: 'seo-report' })
    }

    const results = []
    for (const page of PAGES) {
      const url = SITE_URL + page.path
      try {
        const r = await fetch(url, {
          headers: { Accept: 'text/html' },
          cache: 'no-store',
          signal: AbortSignal.timeout(10000),
        })
        const html = await r.text()
        const issues = []
        if (!extract(html, /<title[^>]*>([^<]+)<\/title>/i)) issues.push('no_title')
        if (!extract(html, /<meta\s+name="description"/i)) issues.push('no_desc')
        if (!extract(html, /<link\s+rel="canonical"/i)) issues.push('no_canonical')
        if (!extract(html, /<meta\s+name="keywords"/i)) issues.push('no_keywords')
        if (!extract(html, /<meta\s+property="og:title"/i)) issues.push('no_og')
        if (!extract(html, /<script type="application\/ld\+json"/i)) issues.push('no_schema')

        results.push({ name: page.name, path: page.path, score: Math.max(0, 100 - issues.length * 16), issues })
      } catch (e) {
        results.push({ name: page.name, path: page.path, score: 0, issues: [(e.message || '').substring(0, 50)] })
      }
    }

    const totalScore = Math.round(results.reduce((a, b) => a + b.score, 0) / results.length)
    return res.status(200).json({ service: 'seo-report', score: totalScore, pages: results.length, ts: new Date().toISOString() })
  } catch (err) {
    return res.status(200).json({ service: 'seo-report', error: (err.message || '').substring(0, 100) })
  }
}
