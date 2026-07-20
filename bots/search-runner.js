const { chromium } = require('playwright')
const keywords = require('./keywords')

const SITE_DOMAIN = 'ltorkcontrols.com'
const BROWSE_PAGES = ['/', '/about', '/products', '/services', '/contact']
const MIN_BROWSE_SEC = 25
const MAX_BROWSE_SEC = 55
const DELAY_BETWEEN_KEYWORDS_SEC = 10
const HEADLESS = process.argv.includes('--headless')

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1) + min)
}

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

async function humanScroll(page) {
  await page.evaluate(() => {
    window.scrollBy({ top: Math.random() * 300 + 100, behavior: 'smooth' })
  })
  await sleep(randomBetween(800, 2000))
  await page.evaluate(() => {
    window.scrollBy({ top: -(Math.random() * 200 + 50), behavior: 'smooth' })
  })
}

async function searchAndVisit(context, keyword, index, total) {
  const page = await context.newPage()
  const log = (msg) => console.log(`[${index + 1}/${total}] ${msg}`)

  try {
    log(`Searching: "${keyword}"`)
    await page.goto('https://www.google.com', { waitUntil: 'domcontentloaded', timeout: 20000 })
    await sleep(randomBetween(1000, 2500))

    const searchBox = await page.$('textarea[name="q"], input[name="q"]')
    if (!searchBox) {
      log('ERROR: Could not find search box')
      return false
    }

    await searchBox.click()
    await sleep(randomBetween(300, 700))
    await searchBox.fill(keyword)
    await sleep(randomBetween(400, 800))
    await page.keyboard.press('Enter')
    await page.waitForLoadState('domcontentloaded', { timeout: 15000 })
    await sleep(randomBetween(2000, 4000))

    const link = await page.$(`a[href*="${SITE_DOMAIN}"]`)
    if (!link) {
      log(`"${keyword}" - Site not found in search results, scrolling...`)
      await page.evaluate(() => window.scrollBy(0, 500))
      await sleep(1500)
      const retryLink = await page.$(`a[href*="${SITE_DOMAIN}"]`)
      if (!retryLink) {
        log(`"${keyword}" - Still not found, skipping`)
        await page.close()
        return false
      }
      await retryLink.click()
    } else {
      log(`Found site, clicking...`)
      await link.click()
    }

    await page.waitForLoadState('domcontentloaded', { timeout: 20000 })
    log(`Landed on: ${page.url()}`)

    const browseCount = randomBetween(2, BROWSE_PAGES.length)
    const pagesToVisit = shuffle(BROWSE_PAGES).slice(0, browseCount)

    for (const path of pagesToVisit) {
      const browseTime = randomBetween(MIN_BROWSE_SEC * 1000, MAX_BROWSE_SEC * 1000) / pagesToVisit.length
      log(`Browsing ${path} for ~${Math.round(browseTime / 1000)}s`)

      if (path !== '/') {
        await page.goto(`https://${SITE_DOMAIN}${path}`, {
          waitUntil: 'domcontentloaded',
          timeout: 20000,
        })
      }

      const scrollCount = randomBetween(3, 6)
      for (let i = 0; i < scrollCount; i++) {
        await humanScroll(page)
        await sleep(randomBetween(1500, 3500))
      }

      await sleep(Math.min(browseTime, 5000))
    }

    log(`Done with "${keyword}"`)
    await page.close()
    return true
  } catch (err) {
    log(`ERROR: ${err.message}`)
    try { await page.close() } catch {}
    return false
  }
}

async function run() {
  console.log('=== L Tork Controls — Search Bot ===')
  console.log(`Keywords: ${keywords.length}`)
  console.log(`Mode: ${HEADLESS ? 'headless' : 'headed'}`)
  console.log(`Target: ${SITE_DOMAIN}`)
  console.log('')

  const browser = await chromium.launch({
    headless: HEADLESS,
    args: ['--disable-blink-features=AutomationControlled'],
  })

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    viewport: { width: 1366, height: 768 },
    locale: 'en-IN',
    timezoneId: 'Asia/Kolkata',
  })

  const shuffled = shuffle(keywords)
  let successCount = 0
  let failCount = 0

  for (let i = 0; i < shuffled.length; i++) {
    const ok = await searchAndVisit(context, shuffled[i], i, shuffled.length)
    if (ok) successCount++
    else failCount++

    if (i < shuffled.length - 1) {
      const delay = randomBetween(DELAY_BETWEEN_KEYWORDS_SEC * 1000, DELAY_BETWEEN_KEYWORDS_SEC * 2000)
      console.log(`Waiting ${Math.round(delay / 1000)}s before next search...\n`)
      await sleep(delay)
    }
  }

  await browser.close()

  console.log('\n=== Summary ===')
  console.log(`Total: ${shuffled.length}`)
  console.log(`Success: ${successCount}`)
  console.log(`Failed: ${failCount}`)
}

run().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
