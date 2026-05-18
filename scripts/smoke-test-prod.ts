/**
 * Smoke test prod — frappe les endpoints critiques de https://erp.yelha.net
 * et vérifie qu'ils répondent correctement. Ne crée AUCUNE donnée.
 *
 * Usage : npx tsx scripts/smoke-test-prod.ts
 *         BASE_URL=https://staging.yelha.net npx tsx scripts/smoke-test-prod.ts
 */

const BASE_URL = process.env.BASE_URL ?? 'https://erp.yelha.net'

interface Check { name: string; ok: boolean; detail: string }

const checks: Check[] = []

function record(name: string, ok: boolean, detail: string) {
  checks.push({ name, ok, detail })
  const icon = ok ? '✓' : '✗'
  // eslint-disable-next-line no-console
  console.log(`${icon} ${name.padEnd(40)} ${detail}`)
}

async function main() {
  // eslint-disable-next-line no-console
  console.log(`\n🔬 Smoke test : ${BASE_URL}\n`)

  // 1. Health endpoint — la source de vérité pour les env vars
  try {
    const r = await fetch(`${BASE_URL}/api/health`, { cache: 'no-store' })
    const body = await r.json() as { status?: string; checks?: Record<string, { ok: boolean; detail?: string }> }
    record('GET /api/health',
      r.status === 200 || r.status === 503,
      `HTTP ${r.status} — status=${body.status}`)
    if (body.checks) {
      for (const [k, v] of Object.entries(body.checks)) {
        record(`  ${k}`, v.ok, v.detail ?? 'OK')
      }
    }
  } catch (e) {
    record('GET /api/health', false, e instanceof Error ? e.message : 'fetch failed')
  }

  // 2. Page publique = doit retourner 200 + HTML
  try {
    const r = await fetch(`${BASE_URL}/`, { cache: 'no-store' })
    const isHtml = r.headers.get('content-type')?.includes('text/html')
    record('GET / (landing)', r.status === 200 && !!isHtml, `HTTP ${r.status}, html=${isHtml}`)
  } catch (e) {
    record('GET / (landing)', false, e instanceof Error ? e.message : 'fetch failed')
  }

  // 3. Pricing page
  try {
    const r = await fetch(`${BASE_URL}/pricing`, { cache: 'no-store' })
    record('GET /pricing', r.status === 200, `HTTP ${r.status}`)
  } catch (e) {
    record('GET /pricing', false, e instanceof Error ? e.message : 'fetch failed')
  }

  // 4. robots.txt
  try {
    const r = await fetch(`${BASE_URL}/robots.txt`, { cache: 'no-store' })
    record('GET /robots.txt', r.status === 200, `HTTP ${r.status}`)
  } catch (e) {
    record('GET /robots.txt', false, e instanceof Error ? e.message : 'fetch failed')
  }

  // 5. sitemap.xml
  try {
    const r = await fetch(`${BASE_URL}/sitemap.xml`, { cache: 'no-store' })
    record('GET /sitemap.xml', r.status === 200, `HTTP ${r.status}`)
  } catch (e) {
    record('GET /sitemap.xml', false, e instanceof Error ? e.message : 'fetch failed')
  }

  // 6. favicon.svg
  try {
    const r = await fetch(`${BASE_URL}/favicon.svg`, { cache: 'no-store' })
    record('GET /favicon.svg', r.status === 200, `HTTP ${r.status}`)
  } catch (e) {
    record('GET /favicon.svg', false, e instanceof Error ? e.message : 'fetch failed')
  }

  // 7. Endpoint protégé doit retourner 401 (preuve que middleware tourne)
  try {
    const r = await fetch(`${BASE_URL}/api/billing/subscription`, { cache: 'no-store' })
    record('GET /api/billing/subscription (no auth)', r.status === 401, `HTTP ${r.status} (attendu 401)`)
  } catch (e) {
    record('GET /api/billing/subscription (no auth)', false, e instanceof Error ? e.message : 'fetch failed')
  }

  // 8. Webhook Chargily sans signature doit retourner 400 (pas 500)
  try {
    const r = await fetch(`${BASE_URL}/api/webhooks/chargily`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ type: 'test', data: {} }),
    })
    record('POST /api/webhooks/chargily (no sig)', r.status === 400, `HTTP ${r.status} (attendu 400)`)
  } catch (e) {
    record('POST /api/webhooks/chargily (no sig)', false, e instanceof Error ? e.message : 'fetch failed')
  }

  // 9. Cron sans secret doit retourner 401
  try {
    const r = await fetch(`${BASE_URL}/api/cron/billing`, { cache: 'no-store' })
    record('GET /api/cron/billing (no secret)', r.status === 401, `HTTP ${r.status} (attendu 401)`)
  } catch (e) {
    record('GET /api/cron/billing (no secret)', false, e instanceof Error ? e.message : 'fetch failed')
  }

  // 10. Headers de sécurité présents
  try {
    const r = await fetch(`${BASE_URL}/`, { cache: 'no-store' })
    const hsts = r.headers.get('strict-transport-security')
    const xfo = r.headers.get('x-frame-options')
    const csp = r.headers.get('content-security-policy')
    record('Security headers', !!(hsts && xfo && csp), `HSTS=${!!hsts} XFO=${!!xfo} CSP=${!!csp}`)
  } catch (e) {
    record('Security headers', false, e instanceof Error ? e.message : 'fetch failed')
  }

  // Récap
  const failed = checks.filter(c => !c.ok)
  // eslint-disable-next-line no-console
  console.log(`\n────────────────────────────────────────`)
  if (failed.length === 0) {
    // eslint-disable-next-line no-console
    console.log(`✓ ${checks.length}/${checks.length} OK — prod looks good`)
  } else {
    // eslint-disable-next-line no-console
    console.log(`✗ ${failed.length}/${checks.length} failed:`)
    for (const f of failed) {
      // eslint-disable-next-line no-console
      console.log(`  - ${f.name}: ${f.detail}`)
    }
    process.exit(1)
  }
}

main().catch(e => {
  // eslint-disable-next-line no-console
  console.error('Smoke test crashed:', e)
  process.exit(1)
})
