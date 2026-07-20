const SITE_URL = 'https://www.ltorkcontrols.com'

const PAGES = [
  { path: '/',          name: 'Homepage' },
  { path: '/about',     name: 'About' },
  { path: '/products',  name: 'Products' },
  { path: '/services',  name: 'Services' },
  { path: '/contact',   name: 'Contact' },
  { path: '/privacy',   name: 'Privacy Policy' },
  { path: '/refund',    name: 'Refund Policy' },
  { path: '/shipping',  name: 'Shipping Policy' },
  { path: '/terms',     name: 'Terms & Conditions' },
]

function extract(html, pattern) {
  const match = html.match(pattern)
  return match ? match[1].trim() : null
}

function extractAllMeta(html) {
  const title = extract(html, /<title[^>]*>([^<]+)<\/title>/i)
  const description = extract(html, /<meta\s+name="description"\s+content="([^"]+)"/i)
  const canonical = extract(html, /<link\s+rel="canonical"\s+href="([^"]+)"/i)
  const keywords = extract(html, /<meta\s+name="keywords"\s+content="([^"]+)"/i)
  const robots = extract(html, /<meta\s+name="robots"\s+content="([^"]+)"/i)
  const ogTitle = extract(html, /<meta\s+property="og:title"\s+content="([^"]+)"/i)
  const ogDesc = extract(html, /<meta\s+property="og:description"\s+content="([^"]+)"/i)
  const ogImage = extract(html, /<meta\s+property="og:image"\s+content="([^"]+)"/i)
  const ogUrl = extract(html, /<meta\s+property="og:url"\s+content="([^"]+)"/i)
  const twitterCard = extract(html, /<meta\s+name="twitter:card"\s+content="([^"]+)"/i)
  const jsonLd = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/i)
  let schema = null
  if (jsonLd) {
    try { schema = JSON.parse(jsonLd[1]) } catch { schema = 'invalid_json' }
  }

  return {
    title, description, canonical, keywords, robots,
    ogTitle, ogDesc, ogImage, ogUrl,
    twitterCard, hasSchema: !!schema, schemaType: schema?.['@type'] || null,
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const results = []

  for (const page of PAGES) {
    const url = `${SITE_URL}${page.path}`
    try {
      const res2 = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SEOAudit/1.0)', 'Accept': 'text/html' },
        cache: 'no-store',
        signal: AbortSignal.timeout(10000),
      })
      const html = await res2.text()
      const meta = extractAllMeta(html)

      const issues = []
      if (!meta.title) issues.push('Missing title')
      if (meta.title && meta.title.length > 60) issues.push(`Title too long (${meta.title.length} chars)`)
      if (!meta.description) issues.push('Missing description')
      if (meta.description && meta.description.length > 160) issues.push(`Description too long (${meta.description.length} chars)`)
      if (!meta.canonical) issues.push('Missing canonical')
      if (!meta.keywords) issues.push('Missing keywords')
      if (!meta.ogTitle) issues.push('Missing og:title')
      if (!meta.ogDesc) issues.push('Missing og:description')
      if (!meta.ogImage) issues.push('Missing og:image')
      if (!meta.twitterCard) issues.push('Missing twitter:card')
      if (!meta.hasSchema) issues.push('Missing JSON-LD schema')

      results.push({
        name: page.name,
        url,
        path: page.path,
        status: 'success',
        score: Math.max(0, 100 - issues.length * 8),
        issues,
        meta,
      })
    } catch (err) {
      results.push({
        name: page.name,
        url,
        path: page.path,
        status: 'error',
        score: 0,
        issues: [err.message || 'Fetch failed'],
        meta: null,
      })
    }
  }

  const totalScore = Math.round(results.reduce((a, b) => a + b.score, 0) / results.length)

  return res.status(200).json({
    service: 'seo-report',
    timestamp: new Date().toISOString(),
    overallScore: totalScore,
    totalPages: results.length,
    perfectPages: results.filter((r) => r.score === 100).length,
    results,
  })
}
