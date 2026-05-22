/**
 * YelhaSubs Public API — Test E2E complet
 * Simule un développeur externe qui utilise l'API depuis zéro.
 *
 * Usage:
 *   npx tsx scripts/test-sub-api-e2e.ts --allow-prod
 */

import { resolve } from 'path'
import crypto from 'crypto'
import { PrismaClient } from '@prisma/client'

// ── Env loader ────────────────────────────────────────────────────────────────
;(() => {
  const fs = require('fs') as typeof import('fs')
  const filenames = ['.env.vercel.local', '.env.local']
  let dir = process.cwd()
  const visited = new Set<string>()
  while (dir && !visited.has(dir)) {
    visited.add(dir)
    for (const filename of filenames) {
      try {
        const lines = fs.readFileSync(resolve(dir, filename), 'utf8').split('\n')
        for (const line of lines) {
          const m = line.match(/^([^#=\s][^=]*)=(.*)$/)
          if (m) process.env[m[1].trim()] ??= m[2].trim().replace(/^["']|["']$/g, '')
        }
      } catch { /* skip */ }
    }
    const parent = resolve(dir, '..')
    if (parent === dir) break
    dir = parent
  }
})()

if (!process.argv.includes('--allow-prod')) {
  console.error('⛔ Ajoute --allow-prod pour lancer contre la prod.')
  process.exit(1)
}

const BASE = 'https://subs.yelha.net/api/sub-api'
const KEY_PREFIX = 'yelha_sub_'
let passed = 0, failed = 0
const errors: string[] = []

function ok(label: string, cond: boolean, detail = '') {
  if (cond) { console.log(`  ✅ ${label}`); passed++ }
  else       { console.log(`  ❌ ${label}${detail ? ' — ' + detail : ''}`); failed++; errors.push(label) }
}

async function req(method: string, path: string, body?: unknown, apiKey?: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  let data: Record<string, unknown> = {}
  try { data = await res.json() as Record<string, unknown> } catch { /* ignore */ }
  return { status: res.status, data, headers: res.headers }
}

function section(title: string) {
  console.log(`\n${'─'.repeat(62)}\n  ${title}\n${'─'.repeat(62)}`)
}

function generateKey() {
  const random = crypto.randomBytes(32).toString('hex')
  const rawKey = `${KEY_PREFIX}${random}`
  const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex')
  const keyPrefix = rawKey.slice(0, KEY_PREFIX.length + 8)
  return { rawKey, keyHash, keyPrefix }
}

async function main() {
  const prisma = new PrismaClient()
  const CHARGILY_WEBHOOK_SECRET = process.env.CHARGILY_WEBHOOK_SECRET ?? ''

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('  YelhaSubs Sub-API — E2E (rôle : développeur externe)')
  console.log(`  Base URL : ${BASE}`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  // ── 0. Setup : clé API ─────────────────────────────────────────────────────
  section('0. Setup — Création de la clé API de test')

  const user = await prisma.user.findFirst({ where: { email: 'cevekmehdi@gmail.com' } })
  if (!user) { console.error('Utilisateur non trouvé'); await prisma.$disconnect(); process.exit(1) }

  const { rawKey, keyHash, keyPrefix } = generateKey()
  const apiKeyRecord = await prisma.subApiKey.create({
    data: { userId: user.id, name: 'test-e2e-script', keyHash, keyPrefix },
  })
  const KEY = rawKey
  console.log(`  🔑 Clé générée : ${keyPrefix}••••••••`)

  // Activer temporairement l'abonnement YelhaSubs pour le test
  const existingSub = await prisma.yelhaSubscription.findUnique({ where: { userId: user.id } })
  const savedSubState = existingSub
    ? { id: existingSub.id, status: existingSub.status, trialEndsAt: existingSub.trialEndsAt, currentPeriodEnd: existingSub.currentPeriodEnd }
    : null
  const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  if (existingSub) {
    await prisma.yelhaSubscription.update({
      where: { id: existingSub.id },
      data: { status: 'TRIAL', trialEndsAt: futureDate },
    })
    console.log(`  ✅ Abonnement activé temporairement (statut original : ${existingSub.status})`)
  } else {
    await prisma.yelhaSubscription.create({
      data: { userId: user.id, status: 'TRIAL', trialEndsAt: futureDate, currentPeriodEnd: futureDate },
    })
    console.log('  ✅ Abonnement créé temporairement')
  }

  let planId = '', clientId = '', subscriptionId = '', inlineSubId = '', inlineClientId = ''

  try {

    // ── 1. Auth — erreurs ──────────────────────────────────────────────────
    section('1. Authentification — cas d\'erreur')

    const noAuth = await req('GET', '/plans')
    ok('Sans header → 401', noAuth.status === 401)
    ok('Code UNAUTHENTICATED', (noAuth.data as {code?:string}).code === 'UNAUTHENTICATED')

    const badFmt = await req('GET', '/plans', undefined, 'pas_une_vraie_cle')
    ok('Mauvais format → 401', badFmt.status === 401)
    ok('Code INVALID_KEY_FORMAT', (badFmt.data as {code?:string}).code === 'INVALID_KEY_FORMAT')

    const wrongKey = await req('GET', '/plans', undefined, `${KEY_PREFIX}${'a'.repeat(64)}`)
    ok('Clé inexistante → 401', wrongKey.status === 401)
    ok('Code INVALID_KEY', (wrongKey.data as {code?:string}).code === 'INVALID_KEY')

    // ── 2. Rate-limit headers ──────────────────────────────────────────────
    section('2. Headers X-RateLimit')

    const rlRes = await req('GET', '/plans', undefined, KEY)
    ok('X-RateLimit-Limit présent',     rlRes.headers.has('x-ratelimit-limit'))
    ok('X-RateLimit-Remaining présent', rlRes.headers.has('x-ratelimit-remaining'))
    ok('X-RateLimit-Reset présent',     rlRes.headers.has('x-ratelimit-reset'))
    console.log(`  ℹ️  ${rlRes.headers.get('x-ratelimit-remaining')} / ${rlRes.headers.get('x-ratelimit-limit')} req restantes`)

    // ── 3. GET /docs ───────────────────────────────────────────────────────
    section('3. GET /docs')

    // /docs returns text/markdown, not JSON
    const docsRaw = await fetch(`${BASE}/docs`)
    const docsText = await docsRaw.text()
    ok('Status 200', docsRaw.status === 200)
    ok('Contient "YelhaSubs"', docsText.includes('YelhaSubs'))
    ok('Content-Type markdown', docsRaw.headers.get('content-type')?.includes('markdown') ?? false)

    // ── 4. Plans CRUD ──────────────────────────────────────────────────────
    section('4. Plans — CRUD complet')

    // Create
    const r1 = await req('POST', '/plans', {
      name: '[TEST E2E] Plan Mensuel',
      price: 1500,
      description: 'Plan de test créé par script E2E',
      interval: 'MONTHLY',
      trialDays: 7,
      features: ['Feature A', 'Support prioritaire'],
      isActive: true,
    }, KEY)
    ok('POST /plans → 201', r1.status === 201)
    planId = (r1.data as {data?:{id?:string}}).data?.id ?? ''
    ok('id retourné', planId.length > 0)
    console.log(`  ℹ️  Plan créé : ${planId}`)

    // Validation
    const r1b = await req('POST', '/plans', { name: 'Sans prix' }, KEY)
    ok('POST /plans sans price → 422', r1b.status === 422)

    // List
    const r2 = await req('GET', '/plans', undefined, KEY)
    ok('GET /plans → 200', r2.status === 200)
    ok('data[] contient notre plan', Array.isArray((r2.data as {data?:{id:string}[]}).data) &&
       (r2.data as {data:{id:string}[]}).data.some(p => p.id === planId))
    ok('meta.total >= 1', ((r2.data as {meta?:{total?:number}}).meta?.total ?? 0) >= 1)

    // Get by ID
    const r3 = await req('GET', `/plans/${planId}`, undefined, KEY)
    ok('GET /plans/:id → 200', r3.status === 200)
    ok('Prix = 1500', Number((r3.data as {data?:{price?:unknown}}).data?.price) === 1500)

    // Update
    const r4 = await req('PATCH', `/plans/${planId}`, { price: 2000 }, KEY)
    ok('PATCH /plans/:id → 200', r4.status === 200)
    ok('Prix mis à jour = 2000', Number((r4.data as {data?:{price?:unknown}}).data?.price) === 2000)

    // 404
    const r5 = await req('GET', '/plans/plan_inexistant_xyz', undefined, KEY)
    ok('Plan inexistant → 404', r5.status === 404)

    // ── 5. Clients CRUD ────────────────────────────────────────────────────
    section('5. Clients — CRUD complet')

    const c1 = await req('POST', '/clients', {
      name: 'Benali',
      firstName: 'Yacine',
      email: 'yacine.benali.e2e@example.com',
      phone: '0555123456',
      wilaya: 'Alger',
      clientType: 'INDIVIDUAL',
    }, KEY)
    ok('POST /clients → 201', c1.status === 201)
    clientId = (c1.data as {data?:{id?:string}}).data?.id ?? ''
    ok('id retourné', clientId.length > 0)
    console.log(`  ℹ️  Client créé : ${clientId}`)

    const c1b = await req('POST', '/clients', { email: 'sans-nom@test.com' }, KEY)
    ok('POST /clients sans name → 422', c1b.status === 422)

    const c2 = await req('GET', '/clients', undefined, KEY)
    ok('GET /clients → 200', c2.status === 200)
    ok('Contient notre client', (c2.data as {data?:{id:string}[]}).data?.some(c => c.id === clientId) ?? false)

    const c3 = await req('GET', '/clients?search=Benali', undefined, KEY)
    ok('Recherche "Benali" → 200', c3.status === 200)
    ok('Trouvé dans recherche', (c3.data as {data?:{id:string}[]}).data?.some(c => c.id === clientId) ?? false)

    const c4 = await req('GET', `/clients/${clientId}`, undefined, KEY)
    ok('GET /clients/:id → 200', c4.status === 200)
    ok('Nom = Benali', (c4.data as {data?:{name?:string}}).data?.name === 'Benali')

    const c5 = await req('PATCH', `/clients/${clientId}`, { phone: '0661987654', wilaya: 'Oran' }, KEY)
    ok('PATCH /clients/:id → 200', c5.status === 200)
    ok('Téléphone mis à jour', (c5.data as {data?:{phone?:string}}).data?.phone === '0661987654')

    // PATCH null → clear optional field
    const c6 = await req('PATCH', `/clients/${clientId}`, { address: null }, KEY)
    ok('PATCH avec null → 200', c6.status === 200)

    // ── 6. Subscriptions CRUD ─────────────────────────────────────────────
    section('6. Subscriptions — CRUD complet')

    const s1 = await req('POST', '/subscriptions', {
      planId,
      clientId,
      clientEmail: 'yacine.benali.e2e@example.com',
      notes: 'Créé par script E2E',
    }, KEY)
    ok('POST /subscriptions → 201', s1.status === 201)
    subscriptionId = (s1.data as {data?:{id?:string}}).data?.id ?? ''
    ok('id retourné', subscriptionId.length > 0)
    const subStatus = (s1.data as {data?:{status?:string}}).data?.status
    console.log(`  ℹ️  Subscription : ${subscriptionId} (status: ${subStatus})`)

    // newClient inline
    const s1b = await req('POST', '/subscriptions', {
      planId,
      newClient: { name: 'Djemai', firstName: 'Sofiane', email: 'sofiane.e2e@example.com' },
    }, KEY)
    ok('POST avec newClient inline → 201', s1b.status === 201)
    inlineSubId    = (s1b.data as {data?:{id?:string}}).data?.id ?? ''
    inlineClientId = (s1b.data as {data?:{clientId?:string}}).data?.clientId ?? ''

    // planId ou clientId requis
    const s1c = await req('POST', '/subscriptions', { planId }, KEY)
    ok('POST sans clientId/newClient → 422 ou 400', [400, 422].includes(s1c.status))

    const s2 = await req('GET', '/subscriptions', undefined, KEY)
    ok('GET /subscriptions → 200', s2.status === 200)
    ok('Contient notre sub', (s2.data as {data?:{id:string}[]}).data?.some(s => s.id === subscriptionId) ?? false)

    const s3 = await req('GET', `/subscriptions?status=${subStatus}`, undefined, KEY)
    ok(`Filtre ?status=${subStatus} → 200`, s3.status === 200)

    const s4 = await req('GET', `/subscriptions?clientId=${clientId}`, undefined, KEY)
    ok('Filtre ?clientId → 200', s4.status === 200)

    const s5 = await req('GET', `/subscriptions/${subscriptionId}`, undefined, KEY)
    ok('GET /subscriptions/:id → 200', s5.status === 200)
    ok('clientId correct', (s5.data as {data?:{clientId?:string}}).data?.clientId === clientId)
    ok('planId correct', (s5.data as {data?:{planId?:string}}).data?.planId === planId)

    const s6 = await req('PATCH', `/subscriptions/${subscriptionId}`, {
      notes: 'Notes E2E mises à jour',
      clientEmail: 'yacine.updated@example.com',
    }, KEY)
    ok('PATCH notes/email → 200', s6.status === 200)
    ok('Notes mises à jour', (s6.data as {data?:{notes?:string}}).data?.notes === 'Notes E2E mises à jour')

    const s7 = await req('PATCH', `/subscriptions/${subscriptionId}`, { status: 'PAUSED' }, KEY)
    ok('PATCH status → PAUSED', s7.status === 200)

    const s8 = await req('PATCH', `/subscriptions/${subscriptionId}`, { status: 'ACTIVE' }, KEY)
    ok('PATCH status → ACTIVE', s8.status === 200)

    const s9 = await req('PATCH', `/subscriptions/${subscriptionId}`, { status: 'CANCELLED' }, KEY)
    ok('PATCH status → CANCELLED', s9.status === 200)
    ok('cancelledAt défini', !!(s9.data as {data?:{cancelledAt?:string}}).data?.cancelledAt)

    // ── 7. Checkout ────────────────────────────────────────────────────────
    section('7. POST /subscriptions/:id/checkout')

    const ch1 = await req('POST', `/subscriptions/${subscriptionId}/checkout`, {
      successUrl: 'https://example.com/success',
      failureUrl: 'https://example.com/cancel',
    }, KEY)
    ok('Checkout → 200 (avec Chargily) ou 409 (sans)', [200, 409].includes(ch1.status))
    if (ch1.status === 200) {
      ok('checkoutUrl présent', typeof (ch1.data as {data?:{checkoutUrl?:string}}).data?.checkoutUrl === 'string')
      console.log(`  ℹ️  checkoutUrl : ${(ch1.data as {data?:{checkoutUrl?:string}}).data?.checkoutUrl}`)
    }
    if (ch1.status === 409) {
      console.log('  ℹ️  Chargily non configuré pour ce compte — comportement normal')
    }

    // Sub annulée → checkout doit refuser
    const ch2 = await req('POST', `/subscriptions/${subscriptionId}/checkout`, {}, KEY)
    ok('Checkout sub CANCELLED → 409 ou 400', [400, 409].includes(ch2.status))

    // Sub inexistante
    const ch3 = await req('POST', '/subscriptions/inexistant_xyz/checkout', {}, KEY)
    ok('Checkout sub inexistante → 404', ch3.status === 404)

    // ── 8. Suppression ────────────────────────────────────────────────────
    section('8. DELETE — nettoyage des ressources de test')

    const d1 = await req('DELETE', `/subscriptions/${inlineSubId}`, undefined, KEY)
    ok('DELETE sub inline → 200', d1.status === 200)

    const d2 = await req('DELETE', `/subscriptions/${subscriptionId}`, undefined, KEY)
    ok('DELETE /subscriptions/:id → 200', d2.status === 200)

    const d2b = await req('GET', `/subscriptions/${subscriptionId}`, undefined, KEY)
    ok('Sub supprimée → 404', d2b.status === 404)

    if (inlineClientId) await req('DELETE', `/clients/${inlineClientId}`, undefined, KEY)

    const d3 = await req('DELETE', `/clients/${clientId}`, undefined, KEY)
    ok('DELETE /clients/:id → 200', d3.status === 200)

    const d4 = await req('DELETE', `/plans/${planId}`, undefined, KEY)
    ok('DELETE /plans/:id → 200', d4.status === 200)

    const d4b = await req('GET', `/plans/${planId}`, undefined, KEY)
    ok('Plan supprimé → 404', d4b.status === 404)

    // ── 9. Webhooks ───────────────────────────────────────────────────────
    section('9. Webhooks — Sécurité & Signature')

    // Corps avec la bonne structure Chargily (data wrapper)
    const fakeBodySubs = JSON.stringify({
      type: 'checkout.paid',
      data: {
        id: `fake_${Date.now()}`,
        amount: 1500,
        status: 'paid',
        metadata: { type: 'sub_renewal', subscriptionId: 'fake_sub_id', userId: user.id },
      },
    })

    // chargily-subscriptions : sans signature → 401 (header absent)
    const w1 = await fetch('https://subs.yelha.net/api/webhooks/chargily-subscriptions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: fakeBodySubs,
    })
    ok('/chargily-subscriptions sans sig → 401', w1.status === 401)
    console.log(`  ℹ️  Status sans sig : ${w1.status}`)

    // signature invalide (header "signature" est le bon nom Chargily)
    const w2 = await fetch('https://subs.yelha.net/api/webhooks/chargily-subscriptions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'signature': 'sig_invalide_xyz' },
      body: fakeBodySubs,
    })
    // Sub "fake_sub_id" not found → 404 (signature verified per-user after fetching sub)
    ok('/chargily-subscriptions sig invalide → 404 ou 403', [403, 404].includes(w2.status))
    console.log(`  ℹ️  Status sig invalide : ${w2.status}`)

    // webhook app YelhaSubs principal — route réelle : /api/webhooks/chargily
    const fakeBodyYelha = JSON.stringify({ type: 'checkout.paid', data: { id: `fake_yelha_${Date.now()}`, amount: 0 } })
    const w4 = await fetch('https://subs.yelha.net/api/webhooks/chargily', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: fakeBodyYelha,
    })
    ok('/api/webhooks/chargily sans sig → 400', w4.status === 400)
    console.log(`  ℹ️  Status chargily sans sig : ${w4.status}`)

    // chargily avec signature HMAC valide → 200 (chargilyId not found → received gracefully)
    if (CHARGILY_WEBHOOK_SECRET) {
      const hmac = crypto.createHmac('sha256', CHARGILY_WEBHOOK_SECRET).update(fakeBodyYelha).digest('hex')
      const w5 = await fetch('https://subs.yelha.net/api/webhooks/chargily', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'signature': hmac },
        body: fakeBodyYelha,
      })
      ok('Sig HMAC valide → 200', w5.status === 200)
      console.log(`  ℹ️  Status avec bonne sig : ${w5.status}`)
    } else {
      console.log('  ⚠️  CHARGILY_WEBHOOK_SECRET non défini — test sig valide ignoré')
    }

    // ── 10. Pagination & edge cases ───────────────────────────────────────
    section('10. Pagination & edge cases')

    const p1 = await req('GET', '/clients?limit=2&page=1', undefined, KEY)
    ok('limit=2 → 200', p1.status === 200)
    ok('meta.limit = 2', (p1.data as {meta?:{limit?:number}}).meta?.limit === 2)

    const p2 = await req('GET', '/clients?limit=200', undefined, KEY)
    ok('limit=200 → 200 (clampé à 100 max)', p2.status === 200)
    ok('meta.limit ≤ 100', ((p2.data as {meta?:{limit?:number}}).meta?.limit ?? 0) <= 100)

    const p3 = await req('GET', '/subscriptions?planId=inexistant', undefined, KEY)
    ok('Filter planId inexistant → 200 (liste vide)', p3.status === 200)

  } finally {
    // Restaurer l'abonnement YelhaSubs à son état original
    if (savedSubState) {
      await prisma.yelhaSubscription.update({
        where: { id: savedSubState.id },
        data: { status: savedSubState.status as 'TRIAL' | 'ACTIVE' | 'EXPIRED' | 'CANCELLED' | 'PAST_DUE' | 'PAUSED', trialEndsAt: savedSubState.trialEndsAt, currentPeriodEnd: savedSubState.currentPeriodEnd },
      }).catch(() => {})
    } else {
      await prisma.yelhaSubscription.delete({ where: { userId: user.id } }).catch(() => {})
    }
    // Nettoyage clé API de test
    await prisma.subApiKey.delete({ where: { id: apiKeyRecord.id } }).catch(() => {})
    await prisma.$disconnect()
  }

  // ── Résumé ─────────────────────────────────────────────────────────────────
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`  ✅ ${passed} tests réussis`)
  if (failed > 0) {
    console.log(`  ❌ ${failed} tests échoués :`)
    for (const e of errors) console.log(`     • ${e}`)
  } else {
    console.log('  🎉 Tous les tests sont passés !')
  }
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
  process.exit(failed > 0 ? 1 : 0)
}

main().catch(async (e) => {
  console.error('Erreur fatale :', e)
  process.exit(1)
})
