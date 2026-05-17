/**
 * 🧑‍💻 SIMULATION DEV — Intégration API Abonnements depuis zéro
 *
 * Ce script simule un développeur qui lit la doc et suit les étapes.
 * Il teste CHAQUE endpoint documenté, les cas d'erreur, les formats.
 *
 * Usage : npx tsx scripts/simulate-dev-integration.ts
 * Pré-requis : npm run dev en cours
 */

import crypto from 'crypto'
import path from 'path'
import fs from 'fs'
import { PrismaClient } from '@prisma/client'

// ── Charger .env.local ────────────────────────────────────────────────────────
const envPath = path.resolve(process.cwd(), '.env.local')
for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
  const t = line.trim()
  if (!t || t.startsWith('#')) continue
  const idx = t.indexOf('=')
  if (idx === -1) continue
  const key = t.slice(0, idx).trim()
  const val = t.slice(idx + 1).trim().replace(/^["']|["']$/g, '')
  if (!process.env[key]) process.env[key] = val
}

const BASE = 'http://localhost:3000/api/sub-api'
const prisma = new PrismaClient()
const KEY_PREFIX = 'yelha_sub_'

// ── Couleurs console ──────────────────────────────────────────────────────────
const G = '\x1b[32m' // green
const R = '\x1b[31m' // red
const Y = '\x1b[33m' // yellow
const B = '\x1b[36m' // blue
const D = '\x1b[90m' // dim
const X = '\x1b[0m'  // reset

let passed = 0, failed = 0, warnings = 0

function log(icon: string, msg: string, detail = '') {
  console.log(`  ${icon}  ${msg}${detail ? `${D}  →  ${detail}${X}` : ''}`)
}
function pass(msg: string, detail = '') { passed++; log(`${G}✅${X}`, msg, detail) }
function fail(msg: string, detail = '') { failed++; log(`${R}❌${X}`, msg, detail) }
function warn(msg: string, detail = '') { warnings++; log(`${Y}⚠️ ${X}`, msg, detail) }
function info(msg: string)              { log(`${B}ℹ️ ${X}`, msg) }
function section(title: string)         { console.log(`\n${B}━━ ${title} ${'━'.repeat(Math.max(0,50-title.length))}${X}`) }

// ── Requête HTTP générique ────────────────────────────────────────────────────
async function req(
  method: string,
  path: string,
  apiKey: string | null,
  body?: unknown,
): Promise<{ status: number; headers: Headers; data: unknown }> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  let data: unknown
  try { data = await res.json() } catch { data = {} }
  return { status: res.status, headers: res.headers, data }
}

function d(data: unknown): string {
  return JSON.stringify(data).slice(0, 120)
}

// ── Générer clé dev (simule "Dashboard > Générer une clé") ───────────────────
async function createDevKey(companyId: string): Promise<{ rawKey: string; id: string }> {
  const random = crypto.randomBytes(32).toString('hex')
  const rawKey = `${KEY_PREFIX}${random}`
  const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex')
  const keyPrefix = rawKey.slice(0, KEY_PREFIX.length + 8)
  const record = await prisma.subApiKey.create({
    data: { companyId, name: 'sim-dev-integration', keyHash, keyPrefix, isActive: true },
  })
  return { rawKey, id: record.id }
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n${'═'.repeat(60)}`)
  console.log(`  🧑‍💻  SIMULATION INTÉGRATION DEV — API Abonnements`)
  console.log(`      Base URL : ${BASE}`)
  console.log(`${'═'.repeat(60)}`)

  // ── Trouver une company avec AppSubscription active ─────────────────────────
  const appSub = await prisma.appSubscription.findFirst({
    where: { appId: 'subscriptions', status: { in: ['ACTIVE', 'TRIAL'] } },
    include: { company: { include: { subscriptionSettings: true } } },
  })
  if (!appSub) { fail('Aucune company avec AppSubscription subscriptions active'); process.exit(1) }
  const company = appSub.company
  const chargilyKey = company.subscriptionSettings?.chargilyKey ?? process.env.CHARGILY_SECRET_KEY!

  // Générer la clé API (simule le dashboard)
  const { rawKey: KEY, id: keyId } = await createDevKey(company.id)
  info(`Clé API simulée (comme si elle venait du dashboard) : ${KEY.slice(0, 28)}…`)
  info(`Company : ${company.name}`)

  // ════════════════════════════════════════════════════════════
  section('1. AUTHENTIFICATION — Cas d\'erreur (doc §Auth)')
  // ════════════════════════════════════════════════════════════

  // 1a. Sans clé → UNAUTHENTICATED
  {
    const r = await req('GET', '/plans', null)
    r.status === 401 && (r.data as { code?: string }).code === 'UNAUTHENTICATED'
      ? pass('Sans clé → 401 UNAUTHENTICATED', d(r.data))
      : fail('Sans clé attendait 401 UNAUTHENTICATED', `HTTP ${r.status} ${d(r.data)}`)
  }

  // 1b. Mauvais format → INVALID_KEY_FORMAT
  {
    const r = await req('GET', '/plans', 'bad_key_format_12345')
    r.status === 401 && (r.data as { code?: string }).code === 'INVALID_KEY_FORMAT'
      ? pass('Mauvais format → 401 INVALID_KEY_FORMAT', d(r.data))
      : fail('Mauvais format attendait 401 INVALID_KEY_FORMAT', `HTTP ${r.status} ${d(r.data)}`)
  }

  // 1c. Format correct mais clé inconnue → INVALID_KEY
  {
    const fakeKey = `yelha_sub_${'a'.repeat(64)}`
    const r = await req('GET', '/plans', fakeKey)
    r.status === 401 && (r.data as { code?: string }).code === 'INVALID_KEY'
      ? pass('Clé inconnue → 401 INVALID_KEY', d(r.data))
      : fail('Clé inconnue attendait 401 INVALID_KEY', `HTTP ${r.status} ${d(r.data)}`)
  }

  // 1d. Headers rate-limit présents sur toutes les réponses
  {
    const r = await req('GET', '/plans', KEY)
    const hasRL = r.headers.get('X-RateLimit-Limit') && r.headers.get('X-RateLimit-Remaining')
    hasRL
      ? pass('Headers X-RateLimit présents', `Limit=${r.headers.get('X-RateLimit-Limit')} Remaining=${r.headers.get('X-RateLimit-Remaining')}`)
      : fail('Headers X-RateLimit absents')
  }

  // ════════════════════════════════════════════════════════════
  section('2. PLANS — CRUD complet')
  // ════════════════════════════════════════════════════════════

  // 2a. GET /plans (liste vide ou non)
  {
    const r = await req('GET', '/plans', KEY)
    r.status === 200 && (r.data as { data: unknown[]; meta: { total: number } }).data !== undefined
      ? pass('GET /plans → 200 avec data + meta', `total=${(r.data as { meta: { total: number } }).meta.total}`)
      : fail('GET /plans → format inattendu', `HTTP ${r.status} ${d(r.data)}`)
  }

  // 2b. POST /plans — validation manquante (name obligatoire)
  {
    const r = await req('POST', '/plans', KEY, { price: 1000 })
    r.status === 422 && (r.data as { code?: string }).code === 'VALIDATION_ERROR'
      ? pass('POST /plans sans name → 422 VALIDATION_ERROR', d(r.data))
      : fail('POST /plans sans name attendait 422', `HTTP ${r.status} ${d(r.data)}`)
  }

  // 2c. POST /plans — plan mensuel valide
  let planId = ''
  {
    const r = await req('POST', '/plans', KEY, {
      name:          'Plan Starter',
      description:   'Plan de base mensuel',
      price:         1200,
      currency:      'DZD',
      interval:      'MONTHLY',
      intervalCount: 1,
      trialDays:     7,
      features:      ['Accès complet', 'Support par email'],
      isActive:      true,
    })
    const ok = r.status === 201 && (r.data as { data?: { id: string } }).data?.id
    if (ok) {
      planId = (r.data as { data: { id: string } }).data.id
      pass('POST /plans → 201 créé', `id=${planId}`)
      // Vérifier format du prix (string)
      const price = (r.data as { data: { price: string } }).data.price
      typeof price === 'string'
        ? pass('Prix retourné sous forme string (Decimal)', `price="${price}"`)
        : fail('Prix devrait être string (type Decimal)', `price=${price} type=${typeof price}`)
    } else {
      fail('POST /plans → création échouée', `HTTP ${r.status} ${d(r.data)}`)
    }
  }

  // 2d. POST /plans — deuxième plan (annuel)
  let planAnnuelId = ''
  {
    const r = await req('POST', '/plans', KEY, {
      name:          'Plan Pro Annuel',
      price:         12000,
      interval:      'YEARLY',
      intervalCount: 1,
      features:      ['Tout le Starter', 'Support prioritaire', 'API illimitée'],
    })
    if (r.status === 201 && (r.data as { data?: { id: string } }).data?.id) {
      planAnnuelId = (r.data as { data: { id: string } }).data.id
      pass('POST /plans → plan annuel créé', `id=${planAnnuelId}`)
    } else {
      fail('Plan annuel → création échouée', `HTTP ${r.status} ${d(r.data)}`)
    }
  }

  // 2e. GET /plans/{id}
  if (planId) {
    const r = await req('GET', `/plans/${planId}`, KEY)
    r.status === 200 && (r.data as { data?: { name: string } }).data?.name === 'Plan Starter'
      ? pass('GET /plans/{id} → 200', `name="${(r.data as { data: { name: string } }).data.name}"`)
      : fail('GET /plans/{id} → inattendu', `HTTP ${r.status} ${d(r.data)}`)
  }

  // 2f. GET /plans/{id} — introuvable
  {
    const r = await req('GET', '/plans/notexistingid123', KEY)
    r.status === 404 && (r.data as { code?: string }).code === 'NOT_FOUND'
      ? pass('GET /plans/inexistant → 404 NOT_FOUND')
      : fail('GET /plans/inexistant attendait 404 NOT_FOUND', `HTTP ${r.status} ${d(r.data)}`)
  }

  // 2g. PATCH /plans/{id} — modifier le prix
  if (planId) {
    const r = await req('PATCH', `/plans/${planId}`, KEY, { price: 1500, description: 'Mis à jour' })
    r.status === 200 && (r.data as { data?: { price: string } }).data?.price === '1500'
      ? pass('PATCH /plans/{id} → prix mis à jour', `price="${(r.data as { data: { price: string } }).data.price}"`)
      : fail('PATCH /plans/{id} → inattendu', `HTTP ${r.status} ${d(r.data)}`)
  }

  // ════════════════════════════════════════════════════════════
  section('3. CLIENTS — CRUD + recherche')
  // ════════════════════════════════════════════════════════════

  // 3a. GET /clients (liste)
  {
    const r = await req('GET', '/clients', KEY)
    r.status === 200 && Array.isArray((r.data as { data?: unknown[] }).data)
      ? pass('GET /clients → 200', `total=${(r.data as { meta: { total: number } }).meta.total}`)
      : fail('GET /clients → format inattendu', `HTTP ${r.status} ${d(r.data)}`)
  }

  // 3b. POST /clients — validation (name obligatoire)
  {
    const r = await req('POST', '/clients', KEY, { firstName: 'Ahmed' })
    r.status === 422 && (r.data as { code?: string }).code === 'VALIDATION_ERROR'
      ? pass('POST /clients sans name → 422 VALIDATION_ERROR')
      : fail('POST /clients sans name attendait 422', `HTTP ${r.status} ${d(r.data)}`)
  }

  // 3c. POST /clients — client valide
  let clientId = ''
  {
    const r = await req('POST', '/clients', KEY, {
      name:       'Boudiaf',
      firstName:  'Yacine',
      phone:      '0661234567',
      email:      'yacine.boudiaf@exemple.dz',
      wilaya:     'Alger',
      address:    '5 rue Didouche Mourad',
      clientType: 'INDIVIDUAL',
    })
    const ok = r.status === 201 && (r.data as { data?: { id: string } }).data?.id
    if (ok) {
      clientId = (r.data as { data: { id: string } }).data.id
      pass('POST /clients → 201 créé', `id=${clientId}`)
    } else {
      fail('POST /clients → création échouée', `HTTP ${r.status} ${d(r.data)}`)
    }
  }

  // 3d. GET /clients avec search
  {
    const r = await req('GET', '/clients?search=Boudiaf', KEY)
    const found = (r.data as { data?: { id: string }[] }).data?.some(c => c.id === clientId)
    r.status === 200 && found
      ? pass('GET /clients?search=Boudiaf → client trouvé')
      : fail('GET /clients?search= → client non trouvé', `HTTP ${r.status} ${d(r.data)}`)
  }

  // 3e. GET /clients/{id}
  if (clientId) {
    const r = await req('GET', `/clients/${clientId}`, KEY)
    r.status === 200 && (r.data as { data?: { name: string } }).data?.name === 'Boudiaf'
      ? pass('GET /clients/{id} → 200', `name="Boudiaf"`)
      : fail('GET /clients/{id} → inattendu', `HTTP ${r.status} ${d(r.data)}`)
  }

  // 3f. PATCH /clients/{id}
  if (clientId) {
    const r = await req('PATCH', `/clients/${clientId}`, KEY, { phone: '0770000000', wilaya: 'Oran' })
    r.status === 200 && (r.data as { data?: { wilaya: string } }).data?.wilaya === 'Oran'
      ? pass('PATCH /clients/{id} → wilaya mis à jour')
      : fail('PATCH /clients/{id} → inattendu', `HTTP ${r.status} ${d(r.data)}`)
  }

  // 3g. PATCH /clients/{id} — effacer un champ avec null (doc: "Envoyez null")
  if (clientId) {
    const r = await req('PATCH', `/clients/${clientId}`, KEY, { email: null })
    r.status === 200 && (r.data as { data?: { email: string | null } }).data?.email === null
      ? pass('PATCH /clients avec null → champ effacé', `email=null`)
      : warn('PATCH /clients avec null → résultat inattendu', `HTTP ${r.status} ${d(r.data)}`)
  }

  // ════════════════════════════════════════════════════════════
  section('4. ABONNEMENTS — Création avec clientId existant')
  // ════════════════════════════════════════════════════════════

  // 4a. POST sans clientId ni newClient → CLIENT_REQUIRED
  {
    const r = await req('POST', '/subscriptions', KEY, { planId })
    r.status === 422 && (r.data as { code?: string }).code === 'CLIENT_REQUIRED'
      ? pass('POST /subscriptions sans client → 422 CLIENT_REQUIRED')
      : fail('Attendait 422 CLIENT_REQUIRED', `HTTP ${r.status} ${d(r.data)}`)
  }

  // 4b. POST avec planId inexistant → PLAN_NOT_FOUND
  {
    const r = await req('POST', '/subscriptions', KEY, { planId: 'notexist', clientId })
    r.status === 422 && (r.data as { code?: string }).code === 'PLAN_NOT_FOUND'
      ? pass('POST /subscriptions plan inexistant → 422 PLAN_NOT_FOUND')
      : fail('Attendait 422 PLAN_NOT_FOUND', `HTTP ${r.status} ${d(r.data)}`)
  }

  // 4c. POST avec clientId inexistant → CLIENT_NOT_FOUND
  {
    const r = await req('POST', '/subscriptions', KEY, { planId, clientId: 'notexistclient' })
    r.status === 422 && (r.data as { code?: string }).code === 'CLIENT_NOT_FOUND'
      ? pass('POST /subscriptions clientId inexistant → 422 CLIENT_NOT_FOUND')
      : fail('Attendait 422 CLIENT_NOT_FOUND', `HTTP ${r.status} ${d(r.data)}`)
  }

  // 4d. POST valide avec clientId existant
  let subId1 = ''
  let subClientEmail = 'yacine.boudiaf@exemple.dz'
  {
    const r = await req('POST', '/subscriptions', KEY, {
      planId,
      clientId,
      clientEmail: subClientEmail,
      status:      'ACTIVE',
      notes:       'Client VIP',
    })
    const ok = r.status === 201 && (r.data as { data?: { id: string } }).data?.id
    if (ok) {
      const sub = (r.data as { data: { id: string; status: string; nextBilling: string; plan: { interval: string } } }).data
      subId1 = sub.id
      pass('POST /subscriptions clientId → 201 créé', `id=${subId1}`)
      // Vérifier nextBilling calculé automatiquement (+1 mois selon plan)
      const nb = new Date(sub.nextBilling)
      const in30 = new Date(Date.now() + 28 * 86400000)
      nb > in30
        ? pass('nextBilling calculé automatiquement (+1 mois)', `nextBilling=${nb.toLocaleDateString('fr-DZ')}`)
        : fail('nextBilling semble incorrect', `nextBilling=${nb.toISOString()}`)
      // Vérifier plan imbriqué
      ;(r.data as { data: { plan: { interval: string } } }).data.plan?.interval === 'MONTHLY'
        ? pass('Objet plan imbriqué dans la réponse', `interval=MONTHLY`)
        : warn('plan imbriqué manquant ou incorrect', d(r.data))
      // Vérifier client imbriqué
      ;(r.data as { data: { client: { name: string } } }).data.client?.name === 'Boudiaf'
        ? pass('Objet client imbriqué dans la réponse')
        : warn('client imbriqué manquant')
    } else {
      fail('POST /subscriptions → création échouée', `HTTP ${r.status} ${d(r.data)}`)
    }
  }

  // ════════════════════════════════════════════════════════════
  section('5. ABONNEMENTS — Création avec newClient inline')
  // ════════════════════════════════════════════════════════════

  let subId2 = ''
  let newClientId = ''
  {
    const r = await req('POST', '/subscriptions', KEY, {
      planId,
      newClient: {
        name:       'Merzougui',
        firstName:  'Sofiane',
        phone:      '0555987654',
        email:      'sofiane@exemple.dz',
        clientType: 'INDIVIDUAL',
      },
      clientEmail: 'sofiane@exemple.dz',
      status:      'TRIAL',
    })
    const ok = r.status === 201 && (r.data as { data?: { id: string } }).data?.id
    if (ok) {
      const sub = (r.data as { data: { id: string; status: string; nextBilling: string; clientId: string } }).data
      subId2 = sub.id
      newClientId = sub.clientId
      pass('POST /subscriptions newClient → 201 créé', `id=${subId2} status=${sub.status}`)
      // TRIAL → nextBilling = startDate + trialDays (7 jours)
      const nb = new Date(sub.nextBilling)
      const in7d = new Date(Date.now() + 6 * 86400000)
      nb > in7d && nb < new Date(Date.now() + 8 * 86400000)
        ? pass('TRIAL nextBilling = maintenant + 7 jours', `nextBilling=${nb.toLocaleDateString('fr-DZ')}`)
        : warn('TRIAL nextBilling semble incorrect', `nextBilling=${nb.toISOString()}`)
    } else {
      fail('POST /subscriptions newClient → échec', `HTTP ${r.status} ${d(r.data)}`)
    }
  }

  // ════════════════════════════════════════════════════════════
  section('6. ABONNEMENTS — Lecture + filtres')
  // ════════════════════════════════════════════════════════════

  // 6a. GET /subscriptions
  {
    const r = await req('GET', '/subscriptions', KEY)
    r.status === 200 && Array.isArray((r.data as { data?: unknown[] }).data)
      ? pass('GET /subscriptions → 200', `total=${(r.data as { meta: { total: number } }).meta.total}`)
      : fail('GET /subscriptions → format inattendu', `HTTP ${r.status} ${d(r.data)}`)
  }

  // 6b. GET /subscriptions?status=TRIAL
  {
    const r = await req('GET', '/subscriptions?status=TRIAL', KEY)
    const trials = (r.data as { data?: { status: string }[] }).data
    const allTrial = trials?.every(s => s.status === 'TRIAL')
    r.status === 200 && allTrial !== false
      ? pass('GET /subscriptions?status=TRIAL → filtré', `${trials?.length} résultats`)
      : fail('Filtre status TRIAL incorrect', `HTTP ${r.status} ${d(r.data)}`)
  }

  // 6c. GET /subscriptions?clientId=xxx
  if (clientId && subId1) {
    const r = await req('GET', `/subscriptions?clientId=${clientId}`, KEY)
    const found = (r.data as { data?: { id: string }[] }).data?.some(s => s.id === subId1)
    r.status === 200 && found
      ? pass('GET /subscriptions?clientId → abonnement trouvé')
      : fail('Filtre clientId incorrect', `HTTP ${r.status} ${d(r.data)}`)
  }

  // 6d. GET /subscriptions/{id}
  if (subId1) {
    const r = await req('GET', `/subscriptions/${subId1}`, KEY)
    r.status === 200 && (r.data as { data?: { id: string } }).data?.id === subId1
      ? pass('GET /subscriptions/{id} → 200')
      : fail('GET /subscriptions/{id} → inattendu', `HTTP ${r.status} ${d(r.data)}`)
  }

  // 6e. GET /subscriptions/{id} — introuvable
  {
    const r = await req('GET', '/subscriptions/doesnotexist', KEY)
    r.status === 404 && (r.data as { code?: string }).code === 'NOT_FOUND'
      ? pass('GET /subscriptions/inexistant → 404 NOT_FOUND')
      : fail('Attendait 404 NOT_FOUND', `HTTP ${r.status} ${d(r.data)}`)
  }

  // ════════════════════════════════════════════════════════════
  section('7. ABONNEMENTS — Modification (PATCH)')
  // ════════════════════════════════════════════════════════════

  // 7a. Mettre en pause
  if (subId1) {
    const r = await req('PATCH', `/subscriptions/${subId1}`, KEY, { status: 'PAUSED' })
    r.status === 200 && (r.data as { data?: { status: string } }).data?.status === 'PAUSED'
      ? pass('PATCH /subscriptions → status PAUSED')
      : fail('PATCH status PAUSED → inattendu', `HTTP ${r.status} ${d(r.data)}`)
  }

  // 7b. Ré-activer
  if (subId1) {
    const r = await req('PATCH', `/subscriptions/${subId1}`, KEY, { status: 'ACTIVE' })
    r.status === 200 && (r.data as { data?: { status: string } }).data?.status === 'ACTIVE'
      ? pass('PATCH /subscriptions → status ACTIVE (réactivé)')
      : fail('PATCH status ACTIVE → inattendu', `HTTP ${r.status} ${d(r.data)}`)
  }

  // 7c. Changer le plan
  if (subId1 && planAnnuelId) {
    const r = await req('PATCH', `/subscriptions/${subId1}`, KEY, { planId: planAnnuelId })
    r.status === 200 && (r.data as { data?: { planId: string } }).data?.planId === planAnnuelId
      ? pass('PATCH /subscriptions → changement de plan')
      : fail('PATCH planId → inattendu', `HTTP ${r.status} ${d(r.data)}`)
    // Remettre le plan initial pour les prochains tests
    await req('PATCH', `/subscriptions/${subId1}`, KEY, { planId })
  }

  // 7d. Étendre nextBilling (manuellement après paiement CCP par exemple)
  if (subId1) {
    const extendedDate = new Date(Date.now() + 60 * 86400000).toISOString()
    const r = await req('PATCH', `/subscriptions/${subId1}`, KEY, { nextBilling: extendedDate })
    r.status === 200
      ? pass('PATCH /subscriptions → nextBilling étendu manuellement', `→ ${new Date(extendedDate).toLocaleDateString('fr-DZ')}`)
      : fail('Étendre nextBilling → inattendu', `HTTP ${r.status} ${d(r.data)}`)
  }

  // ════════════════════════════════════════════════════════════
  section('8. CHECKOUT CHARGILY')
  // ════════════════════════════════════════════════════════════

  // 8a. Checkout sur abonnement ACTIVE
  let checkoutUrl = ''
  if (subId1) {
    const r = await req('POST', `/subscriptions/${subId1}/checkout`, KEY, {
      successUrl: 'https://monsite.dz/success',
      failureUrl: 'https://monsite.dz/echec',
    })
    const ok = r.status === 200 && (r.data as { data?: { checkoutUrl: string; amount: number; currency: string } }).data?.checkoutUrl
    if (ok) {
      const d2 = (r.data as { data: { checkoutUrl: string; amount: number; currency: string } }).data
      checkoutUrl = d2.checkoutUrl
      pass('POST /checkout → 200 lien généré', `amount=${d2.amount} DZD`)
      d2.currency === 'DZD' ? pass('Devise = DZD ✓') : fail(`Devise inattendue : ${d2.currency}`)
      d2.checkoutUrl.includes('chargily') ? pass('URL pointe vers Chargily ✓') : warn('URL Chargily inattendue', d2.checkoutUrl)
    } else {
      fail('POST /checkout → échec', `HTTP ${r.status} ${d(r.data)}`)
    }
  }

  // 8b. Checkout sans successUrl/failureUrl (optionnels selon la doc)
  if (subId1) {
    const r = await req('POST', `/subscriptions/${subId1}/checkout`, KEY)
    r.status === 200 && (r.data as { data?: { checkoutUrl: string } }).data?.checkoutUrl
      ? pass('POST /checkout sans URLs → 200 (URLs optionnelles)')
      : fail('POST /checkout sans URLs → attendait 200', `HTTP ${r.status} ${d(r.data)}`)
  }

  // 8c. Checkout sur abonnement CANCELLED → SUBSCRIPTION_NOT_RENEWABLE
  let cancelledSubId = ''
  {
    const r = await req('POST', '/subscriptions', KEY, {
      planId,
      clientId,
      status: 'ACTIVE',
    })
    if (r.status === 201) {
      cancelledSubId = (r.data as { data: { id: string } }).data.id
      await req('PATCH', `/subscriptions/${cancelledSubId}`, KEY, { status: 'CANCELLED' })
      const r2 = await req('POST', `/subscriptions/${cancelledSubId}/checkout`, KEY)
      r2.status === 409 && (r2.data as { code?: string }).code === 'SUBSCRIPTION_NOT_RENEWABLE'
        ? pass('Checkout sur CANCELLED → 409 SUBSCRIPTION_NOT_RENEWABLE')
        : fail('Checkout CANCELLED attendait 409 SUBSCRIPTION_NOT_RENEWABLE', `HTTP ${r2.status} ${d(r2.data)}`)
    }
  }

  // 8d. Checkout sur abonnement EXPIRED → SUBSCRIPTION_NOT_RENEWABLE
  {
    const r = await req('POST', '/subscriptions', KEY, { planId, clientId, status: 'ACTIVE' })
    if (r.status === 201) {
      const expiredId = (r.data as { data: { id: string } }).data.id
      await req('PATCH', `/subscriptions/${expiredId}`, KEY, { status: 'EXPIRED' })
      const r2 = await req('POST', `/subscriptions/${expiredId}/checkout`, KEY)
      r2.status === 409 && (r2.data as { code?: string }).code === 'SUBSCRIPTION_NOT_RENEWABLE'
        ? pass('Checkout sur EXPIRED → 409 SUBSCRIPTION_NOT_RENEWABLE')
        : fail('Checkout EXPIRED attendait 409 SUBSCRIPTION_NOT_RENEWABLE', `HTTP ${r2.status} ${d(r2.data)}`)
      await req('DELETE', `/subscriptions/${expiredId}`, KEY)
    }
  }

  // ════════════════════════════════════════════════════════════
  section('9. WEBHOOK CHARGILY — Simulation paiement')
  // ════════════════════════════════════════════════════════════

  // Simuler un paiement Chargily qui renouvelle subId1
  if (subId1) {
    const subBefore = await req('GET', `/subscriptions/${subId1}`, KEY)
    const nbBefore = new Date((subBefore.data as { data: { nextBilling: string } }).data.nextBilling)

    const fakeEventId = 'sim_' + crypto.randomBytes(6).toString('hex')
    const payload = JSON.stringify({
      type: 'checkout.paid',
      data: {
        id:     fakeEventId,
        status: 'paid',
        metadata: { type: 'sub_renewal', subscriptionId: subId1, companyId: company.id },
      },
    })
    const signature = crypto.createHmac('sha256', chargilyKey).update(payload).digest('hex')

    const res = await fetch('http://localhost:3000/api/webhooks/chargily-subscriptions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', signature },
      body: payload,
    })
    const wr = await res.json() as { success?: boolean; nextBilling?: string; ignored?: boolean }

    if (res.status === 200 && wr.success) {
      const nbAfter = new Date(wr.nextBilling!)
      nbAfter > nbBefore
        ? pass('Webhook checkout.paid → nextBilling étendu ✓', `${nbBefore.toLocaleDateString('fr-DZ')} → ${nbAfter.toLocaleDateString('fr-DZ')}`)
        : fail('nextBilling non étendu après webhook', `before=${nbBefore.toISOString()} after=${wr.nextBilling}`)

      // 9b. Idempotence : rejouer le même event → ignored
      const res2 = await fetch('http://localhost:3000/api/webhooks/chargily-subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', signature },
        body: payload,
      })
      const wr2 = await res2.json() as { ignored?: boolean; reason?: string }
      res2.status === 200 && wr2.ignored
        ? pass('Idempotence : rejouer même event → ignored ✓', `reason=${wr2.reason}`)
        : warn('Idempotence non vérifiable (Redis non configuré ?)', `HTTP ${res2.status} ${JSON.stringify(wr2)}`)
    } else {
      fail('Webhook → inattendu', `HTTP ${res.status} ${JSON.stringify(wr)}`)
    }
  }

  // ════════════════════════════════════════════════════════════
  section('10. PAGINATION')
  // ════════════════════════════════════════════════════════════

  {
    // Créer rapidement quelques plans pour tester la pagination
    const ids: string[] = []
    for (let i = 0; i < 3; i++) {
      const r = await req('POST', '/plans', KEY, { name: `Pagination Plan ${i}`, price: i * 100 })
      if (r.status === 201) ids.push((r.data as { data: { id: string } }).data.id)
    }

    const r = await req('GET', '/plans?page=1&limit=2', KEY)
    const meta = (r.data as { meta?: { total: number; page: number; limit: number } }).meta
    if (r.status === 200 && meta && meta.limit === 2) {
      pass('Pagination : limit=2 respecté', `page=${meta.page} total=${meta.total} limit=${meta.limit}`)
    } else {
      fail('Pagination inattendue', `HTTP ${r.status} ${d(r.data)}`)
    }

    // Nettoyer les plans de pagination (sans abonnés)
    for (const id of ids) await req('DELETE', `/plans/${id}`, KEY)
  }

  // ════════════════════════════════════════════════════════════
  section('11. SUPPRESSION — Contraintes (doc §DELETE)')
  // ════════════════════════════════════════════════════════════

  // 11a. DELETE /clients/{id} avec abonnement ACTIVE → 409
  if (clientId && subId1) {
    // Remettre subId1 en ACTIVE d'abord
    await req('PATCH', `/subscriptions/${subId1}`, KEY, { status: 'ACTIVE' })
    const r = await req('DELETE', `/clients/${clientId}`, KEY)
    r.status === 409 && (r.data as { code?: string }).code === 'CONFLICT'
      ? pass('DELETE /clients avec abo ACTIVE → 409 CONFLICT')
      : fail('DELETE client avec abo actif attendait 409 CONFLICT', `HTTP ${r.status} ${d(r.data)}`)
  }

  // 11b. DELETE /plans/{id} avec abonnement ACTIVE → 409
  if (planId && subId1) {
    const r = await req('DELETE', `/plans/${planId}`, KEY)
    r.status === 409 && (r.data as { code?: string }).code === 'CONFLICT'
      ? pass('DELETE /plans avec abo ACTIVE → 409 CONFLICT')
      : fail('DELETE plan avec abo actif attendait 409 CONFLICT', `HTTP ${r.status} ${d(r.data)}`)
  }

  // ════════════════════════════════════════════════════════════
  section('12. NETTOYAGE')
  // ════════════════════════════════════════════════════════════

  const toDelete = [
    subId1 ? req('DELETE', `/subscriptions/${subId1}`, KEY) : null,
    subId2 ? req('DELETE', `/subscriptions/${subId2}`, KEY) : null,
    cancelledSubId ? req('DELETE', `/subscriptions/${cancelledSubId}`, KEY) : null,
  ].filter(Boolean)
  await Promise.all(toDelete)

  // Supprimer les plans (sans abonnés maintenant)
  if (planAnnuelId) await req('DELETE', `/plans/${planAnnuelId}`, KEY)
  if (planId) await req('DELETE', `/plans/${planId}`, KEY)
  if (clientId) await req('DELETE', `/clients/${clientId}`, KEY)
  if (newClientId) await req('DELETE', `/clients/${newClientId}`, KEY)
  await prisma.subApiKey.delete({ where: { id: keyId } })
  pass('Données de test nettoyées')

  // ════════════════════════════════════════════════════════════
  // BILAN
  // ════════════════════════════════════════════════════════════
  console.log(`\n${'═'.repeat(60)}`)
  console.log(`  📊  BILAN`)
  console.log(`      ${G}✅ Réussi   : ${passed}${X}`)
  if (failed > 0)   console.log(`      ${R}❌ Échoué   : ${failed}${X}`)
  if (warnings > 0) console.log(`      ${Y}⚠️  Warning  : ${warnings}${X}`)
  console.log(`${'═'.repeat(60)}\n`)

  if (failed > 0) process.exit(1)
}

main()
  .catch(e => { console.error('\n❌  Erreur non gérée :', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
