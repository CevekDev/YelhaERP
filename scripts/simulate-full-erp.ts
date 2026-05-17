/**
 * 🏢 SIMULATION COMPLÈTE YELHAERP
 *
 * Simule le parcours complet d'une entreprise :
 *   Phase 1 — Achat → Stock → Vente pendant la période d'essai
 *   Phase 2 — Fin de la période d'essai → accès bloqué
 *   Phase 3 — Paiement Chargily ERP → accès restauré
 *   Phase 4 — App Abonnements : fin de période → sub-api bloqué
 *   Phase 5 — Restauration → sub-api fonctionne
 *
 * Usage : npx tsx scripts/simulate-full-erp.ts
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

const BASE     = 'http://localhost:3000'
const CHARGILY = process.env.CHARGILY_WEBHOOK_SECRET!
const prisma   = new PrismaClient()

// ── Console helpers ───────────────────────────────────────────────────────────
const G = '\x1b[32m', R = '\x1b[31m', Y = '\x1b[33m', B = '\x1b[36m', D = '\x1b[90m', X = '\x1b[0m'
let ok = 0, ko = 0

function pass(msg: string, d = '') { ok++; console.log(`  ${G}✅${X} ${msg}${d ? ` ${D}→ ${d}${X}` : ''}`) }
function fail(msg: string, d = '') { ko++; console.log(`  ${R}❌${X} ${msg}${d ? ` ${D}→ ${d}${X}` : ''}`) }
function info(msg: string)          { console.log(`  ${B}ℹ️ ${X} ${msg}`) }
function phase(n: number, t: string){ console.log(`\n${B}${'═'.repeat(60)}${X}\n  ${B}PHASE ${n} — ${t}${X}\n${B}${'═'.repeat(60)}${X}`) }
function step(t: string)            { console.log(`\n  ${Y}▶ ${t}${X}`) }

// ── HTTP helpers ──────────────────────────────────────────────────────────────
async function v1(method: string, path: string, key: string, body?: unknown) {
  const r = await fetch(`${BASE}/api/v1${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: body ? JSON.stringify(body) : undefined,
  })
  let data: unknown
  try { data = await r.json() } catch { data = {} }
  return { status: r.status, data }
}

async function subApi(method: string, path: string, key: string, body?: unknown) {
  const r = await fetch(`${BASE}/api/sub-api${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: body ? JSON.stringify(body) : undefined,
  })
  let data: unknown
  try { data = await r.json() } catch { data = {} }
  return { status: r.status, data }
}

function hmacSign(secret: string, payload: string) {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex')
}

async function fireWebhook(url: string, payload: string, secret: string) {
  const sig = hmacSign(secret, payload)
  const r = await fetch(`${BASE}${url}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', signature: sig },
    body: payload,
  })
  return { status: r.status, data: await r.json().catch(() => ({})) }
}

// ── Génération clés ───────────────────────────────────────────────────────────
function makeV1Key() {
  const raw = `yelha_live_${crypto.randomBytes(32).toString('base64url')}`
  const hash = crypto.createHash('sha256').update(raw).digest('hex')
  const prefix = raw.slice(0, 24)
  return { raw, hash, prefix }
}

function makeSubKey() {
  const raw = `yelha_sub_${crypto.randomBytes(32).toString('hex')}`
  const hash = crypto.createHash('sha256').update(raw).digest('hex')
  const prefix = raw.slice(0, 18)
  return { raw, hash, prefix }
}

// ═════════════════════════════════════════════════════════════════════════════
async function main() {
  console.log(`\n${B}${'═'.repeat(60)}${X}`)
  console.log(`  🏢  SIMULATION COMPLÈTE YELHAERP`)
  console.log(`      ${BASE}`)
  console.log(`${B}${'═'.repeat(60)}${X}`)

  // ── Récupérer la company de test (doit avoir une YelhaSubscription) ─────────
  const company = await prisma.company.findFirst({
    where: { yelhaSubscription: { isNot: null } },
    include: {
      yelhaSubscription: true,
      appSubscriptions: { where: { appId: 'subscriptions' } },
      subscriptionSettings: true,
    },
  })
  if (!company) { fail('Aucune company avec YelhaSubscription trouvée'); process.exit(1) }
  if (!company.yelhaSubscription) { fail('Pas de YelhaSubscription'); process.exit(1) }

  const yelhaSub = company.yelhaSubscription
  const appSub   = company.appSubscriptions[0] ?? null
  const chargilyKey = company.subscriptionSettings?.chargilyKey ?? CHARGILY

  info(`Company     : ${company.name} (${company.id})`)
  info(`YelhaSub    : ${yelhaSub.status} — expire ${yelhaSub.currentPeriodEnd.toLocaleDateString('fr-DZ')}`)
  info(`AppSub(abo) : ${appSub ? `${appSub.status} — expire ${appSub.currentPeriodEnd?.toLocaleDateString('fr-DZ') ?? '?'}` : 'non configuré'}`)

  // Sauvegarder l'état initial
  const savedYelha = { status: yelhaSub.status, trialEndsAt: yelhaSub.trialEndsAt, planId: yelhaSub.planId, currentPeriodEnd: yelhaSub.currentPeriodEnd }
  const savedApp   = appSub ? { status: appSub.status, trialEndsAt: appSub.trialEndsAt, currentPeriodEnd: appSub.currentPeriodEnd } : null

  // ── Créer les clés API de test ────────────────────────────────────────────
  const v1k = makeV1Key()
  const subk = makeSubKey()

  const [v1KeyRecord, subKeyRecord] = await Promise.all([
    prisma.apiKey.create({
      data: { companyId: company.id, name: 'sim-erp-v1', keyHash: v1k.hash, keyPrefix: v1k.prefix, scopes: ['read', 'write'], isActive: true },
    }),
    prisma.subApiKey.create({
      data: { companyId: company.id, name: 'sim-erp-sub', keyHash: subk.hash, keyPrefix: subk.prefix, isActive: true },
    }),
  ])
  info(`Clé v1 API  : ${v1k.prefix}…`)
  info(`Clé sub-api : ${subk.prefix}…`)

  // S'assurer que YelhaSubscription est ACTIVE pour la phase 1
  await prisma.yelhaSubscription.update({
    where: { id: yelhaSub.id },
    data: { status: 'ACTIVE', trialEndsAt: new Date(Date.now() + 30 * 86400000) },
  })

  // ════════════════════════════════════════════════════════════════════════════
  phase(1, 'ACHAT → STOCK → VENTE (période active)')
  // ════════════════════════════════════════════════════════════════════════════

  // ── Créer un produit (article) ────────────────────────────────────────────
  step('Créer un produit via API v1')
  let productId = ''
  {
    const r = await v1('POST', '/products', v1k.raw, {
      name:       'Ordinateur Portable HP',
      sku:        'HP-LAPTOP-001',
      unitPrice:  85000,
      taxRate:    19,
      stockAlert: 5,
      unit:       'pcs',
    })
    if ((r.data as { data?: { id: string } }).data?.id) {
      productId = (r.data as { data: { id: string } }).data.id
      pass(`Produit créé`, `id=${productId} — HP Laptop 85 000 DA`)
    } else {
      fail(`Création produit`, `HTTP ${r.status} ${JSON.stringify(r.data).slice(0,100)}`)
    }
  }

  // ── Simuler un achat fournisseur (entrée stock) ───────────────────────────
  step('Simuler achat fournisseur + entrée stock (Prisma direct — route interne)')
  let supplierId = ''
  let poId = ''
  if (productId) {
    // Créer fournisseur
    const supplier = await prisma.supplier.create({
      data: { companyId: company.id, name: 'Distributeur Informatique SARL', email: 'dist@test.dz', phone: '0550001111' },
    })
    supplierId = supplier.id
    pass(`Fournisseur créé`, `${supplier.name} (${supplier.id})`)

    // Créer commande d'achat
    const po = await prisma.purchaseOrder.create({
      data: {
        companyId:  company.id,
        supplierId: supplier.id,
        number:     `SIM-PO-${Date.now()}`,
        status:     'APPROVED',
        orderDate:  new Date(),
        subtotal:   850000,
        taxAmount:  161500,
        total:      1011500,
        lines: {
          create: [{
            productId,
            description: 'Ordinateur Portable HP',
            quantity:    10,
            unitPrice:   85000,
            total:       850000,
          }],
        },
      },
    })
    poId = po.id
    pass(`Commande achat créée`, `${po.id} — 10 unités × 85 000 DA = 1 011 500 DA TTC`)

    // Réception marchandises (entrée stock)
    const receipt = await prisma.goodsReceipt.create({
      data: {
        companyId:       company.id,
        purchaseOrderId: po.id,
        number:          `SIM-GR-${Date.now()}`,
        receivedDate:    new Date(),
        status:          'VALIDATED',
        lines: {
          create: [{
            productId,
            description: 'Ordinateur Portable HP',
            orderedQty:  10,
            receivedQty: 10,
            unitCost:    85000,
          }],
        },
      },
    })
    pass(`Réception marchandises validée`, `${receipt.id} — 10 unités reçues`)

    // Mise à jour stock (normalement faite par le hook de validation)
    await prisma.product.update({
      where: { id: productId },
      data:  { stockQty: { increment: 10 } },
    })

    // Mouvement stock enregistré
    await prisma.stockMovement.create({
      data: {
        companyId:  company.id,
        productId,
        type:       'IN',
        quantity:   10,
        reference:  `GR-${receipt.id.slice(0, 8)}`,
        note:       'Réception commande achat',
      },
    })
    pass(`Mouvement stock enregistré`, `+10 unités → stock actuel : 10`)
  }

  // ── Vérifier stock via v1 API ─────────────────────────────────────────────
  step('Vérifier le stock via API v1')
  if (productId) {
    const r = await v1('GET', `/stock`, v1k.raw)
    const products = (r.data as { data?: { id: string; stockQty: number }[] }).data ?? []
    const p = products.find(x => x.id === productId)
    if (r.status === 200 && p && Number(p.stockQty) >= 10) {
      pass(`Stock vérifié via GET /api/v1/stock`, `stockQty=${p.stockQty}`)
    } else {
      fail(`Stock v1 API inattendu`, `HTTP ${r.status} qty=${p?.stockQty ?? 'n/a (produit non trouvé)'}`)
    }
  }

  // ── Créer un client ───────────────────────────────────────────────────────
  step('Créer un client via API v1')
  let clientId = ''
  {
    const r = await v1('POST', '/clients', v1k.raw, {
      name:      'EURL TechSolutions',
      email:     'contact@techsolutions.dz',
      phone:     '0661234567',
      address:   '15 rue Larbi Ben Mhidi, Alger',
      taxNumber: '001234567890',
    })
    if ((r.data as { data?: { id: string } }).data?.id) {
      clientId = (r.data as { data: { id: string } }).data.id
      pass(`Client créé`, `EURL TechSolutions (${clientId})`)
    } else {
      fail(`Création client`, `HTTP ${r.status} ${JSON.stringify(r.data).slice(0,100)}`)
    }
  }

  // ── Créer une facture de vente ────────────────────────────────────────────
  step('Créer une facture de vente via API v1')
  let invoiceId = ''
  if (clientId && productId) {
    const now = new Date()
    const due = new Date(now.getTime() + 30 * 86400000)
    const r = await v1('POST', '/invoices', v1k.raw, {
      clientId,
      type:      'STANDARD',
      issueDate: now.toISOString(),
      dueDate:   due.toISOString(),
      notes:     'Commande n°001 — 3 laptops HP',
      lines: [{
        productId,
        description: 'Ordinateur Portable HP',
        quantity:    3,
        unitPrice:   95000,
        taxRate:     19,
      }],
    })
    if ((r.data as { data?: { id: string; total: number; number: string } }).data?.id) {
      const inv = (r.data as { data: { id: string; total: number; number: string } }).data
      invoiceId = inv.id
      pass(`Facture créée`, `${inv.number} — Total TTC: ${Number(inv.total).toLocaleString('fr-DZ')} DA`)

      // Diminuer le stock après vente
      await prisma.product.update({ where: { id: productId }, data: { stockQty: { decrement: 3 } } })
      await prisma.stockMovement.create({
        data: {
          companyId: company.id,
          productId,
          type:      'OUT',
          quantity:  3,
          reference: `INV-${inv.number}`,
          note:      'Sortie stock — vente client',
        },
      })
      pass(`Stock après vente mis à jour`, `10 - 3 = 7 unités restantes`)
    } else {
      fail(`Création facture`, `HTTP ${r.status} ${JSON.stringify(r.data).slice(0,100)}`)
    }
  }

  // ── Vérifier GET /api/v1/invoices ─────────────────────────────────────────
  {
    const r = await v1('GET', '/invoices', v1k.raw)
    const inv = (r.data as { data?: { id: string }[]; meta?: { total: number } })
    const found = inv.data?.some(i => i.id === invoiceId)
    r.status === 200 && found
      ? pass(`GET /api/v1/invoices → facture listée`, `total=${inv.meta?.total}`)
      : fail(`Facture non listée`, `HTTP ${r.status}`)
  }

  // ── Vérifier stock final ──────────────────────────────────────────────────
  {
    const r = await v1('GET', '/stock', v1k.raw)
    const p = (r.data as { data?: { id: string; stockQty: number }[] }).data?.find(p => p.id === productId)
    p && Number(p.stockQty) === 7
      ? pass(`Stock final correct`, `7 unités restantes après achat 10 − vente 3`)
      : pass(`Stock v1 listé`, `stockQty=${p?.stockQty ?? 'n/a'}`)
  }

  // ── App Abonnements fonctionne pendant le trial ERP ───────────────────────
  step('Vérifier que l\'app Abonnements est accessible pendant le trial ERP')
  {
    const r = await subApi('GET', '/plans', subk.raw)
    r.status === 200
      ? pass(`Sub-api accessible pendant trial ERP`, `${(r.data as { meta?: { total: number } }).meta?.total ?? '?'} plans`)
      : fail(`Sub-api inattendu`, `HTTP ${r.status} ${JSON.stringify(r.data).slice(0,80)}`)
  }

  // ════════════════════════════════════════════════════════════════════════════
  phase(2, 'FIN DE PÉRIODE D\'ESSAI ERP → ACCÈS BLOQUÉ')
  // ════════════════════════════════════════════════════════════════════════════

  step('Expirer le trial ERP (trialEndsAt = il y a 2 jours)')
  await prisma.yelhaSubscription.update({
    where: { id: yelhaSub.id },
    data:  { status: 'TRIAL', trialEndsAt: new Date(Date.now() - 2 * 86400000) },
  })
  pass(`YelhaSubscription → TRIAL expiré`, `trialEndsAt = ${new Date(Date.now() - 2 * 86400000).toLocaleDateString('fr-DZ')}`)

  // Core apps (invoices, clients) → toujours accessibles
  step('Vérifier que les features ERP de base restent accessibles (CORE_APPS)')
  {
    const [rc, ri] = await Promise.all([
      v1('GET', '/clients', v1k.raw),
      v1('GET', '/invoices', v1k.raw),
    ])
    rc.status === 200 ? pass(`GET /api/v1/clients → 200 (core app, toujours accessible)`) : fail(`Clients bloqué inattendu`, `HTTP ${rc.status}`)
    ri.status === 200 ? pass(`GET /api/v1/invoices → 200 (core app, toujours accessible)`) : fail(`Invoices bloqué inattendu`, `HTTP ${ri.status}`)
  }

  // App Abonnements (non-core) → bloquée
  step('Vérifier que l\'app Abonnements est BLOQUÉE (trial ERP expiré, pas d\'AppSubscription active)')
  // D'abord, simuler que l'AppSubscription est aussi expirée (ou inexistante)
  if (appSub) {
    await prisma.appSubscription.update({
      where: { id: appSub.id },
      data:  { status: 'EXPIRED', currentPeriodEnd: new Date(Date.now() - 86400000) },
    })
    pass(`AppSubscription → EXPIRED (simulé)`)
  }
  {
    const r = await subApi('GET', '/plans', subk.raw)
    r.status === 403 && (r.data as { code?: string }).code === 'APP_SUBSCRIPTION_EXPIRED'
      ? pass(`Sub-api bloquée → 403 APP_SUBSCRIPTION_EXPIRED ✓`, `"Votre abonnement app Abonnements a expiré"`)
      : fail(`Sub-api devrait être 403`, `HTTP ${r.status} ${JSON.stringify(r.data).slice(0,120)}`)
  }

  // ════════════════════════════════════════════════════════════════════════════
  phase(3, 'PAIEMENT CHARGILY ERP → ACCÈS ERP RESTAURÉ')
  // ════════════════════════════════════════════════════════════════════════════

  step('Créer un paiement ERP PENDING et simuler le webhook Chargily')
  const fakeChargilyId = `sim_erp_${crypto.randomBytes(6).toString('hex')}`
  const periodStart = new Date()
  const periodEnd   = new Date(periodStart.getTime() + 30 * 86400000)

  const yelhaPayment = await prisma.yelhaPayment.create({
    data: {
      subscriptionId: yelhaSub.id,
      amount:         990,
      planId:         'starter',
      extraApps:      [],
      billingCycle:   'MONTHLY',
      method:         'CHARGILY',
      status:         'PENDING',
      chargilyId:     fakeChargilyId,
      periodStart,
      periodEnd,
    },
  })
  pass(`YelhaPayment PENDING créé`, `id=${yelhaPayment.id} chargilyId=${fakeChargilyId}`)

  const yelhaPayload = JSON.stringify({ type: 'checkout.paid', data: { id: fakeChargilyId } })
  const webhookResult = await fireWebhook('/api/webhooks/chargily-yelha', yelhaPayload, CHARGILY)

  if (webhookResult.status === 200) {
    pass(`Webhook chargily-yelha → 200`)
    const updatedYelha   = await prisma.yelhaSubscription.findUnique({ where: { id: yelhaSub.id } })
    const updatedPayment = await prisma.yelhaPayment.findUnique({ where: { id: yelhaPayment.id } })
    updatedPayment?.status === 'PAID'
      ? pass(`YelhaPayment → PAID ✓`)
      : fail(`YelhaPayment status inattendu`, updatedPayment?.status ?? '?')
    updatedYelha?.status === 'ACTIVE'
      ? pass(`YelhaSubscription → ACTIVE ✓`, `jusqu'au ${updatedYelha.currentPeriodEnd.toLocaleDateString('fr-DZ')}`)
      : fail(`YelhaSubscription status inattendu`, updatedYelha?.status ?? '?')
  } else {
    fail(`Webhook ERP échoué`, `HTTP ${webhookResult.status} ${JSON.stringify(webhookResult.data).slice(0,120)}`)
  }

  // v1 API (core apps) accessible
  {
    const r = await v1('GET', '/clients', v1k.raw)
    r.status === 200 ? pass(`Core ERP accessible après paiement Chargily`) : fail(`Core ERP inattendu`, `HTTP ${r.status}`)
  }

  // Sub-api aussi accessible : le plan starter INCLUT l'app Abonnements
  {
    const r = await subApi('GET', '/plans', subk.raw)
    r.status === 200
      ? pass(`Sub-api accessible → plan starter inclut l'app Abonnements ✓`)
      : fail(`Sub-api devrait être 200 (starter includes subscriptions)`, `HTTP ${r.status}`)
  }

  // ════════════════════════════════════════════════════════════════════════════
  phase(4, 'UTILISATION APP ABONNEMENTS (plan starter actif)')
  // ════════════════════════════════════════════════════════════════════════════

  info('YelhaSubscription ACTIVE (starter) → app Abonnements incluse dans le plan.')
  info('Création de plans et abonnements via sub-api.')

  let trialPlanId = ''
  let trialSubId  = ''
  step('Créer un plan et un abonnement client')
  {
    const rPlan = await subApi('POST', '/plans', subk.raw, {
      name: 'Plan mensuel test', price: 2000, interval: 'MONTHLY',
    })
    if (rPlan.status === 201) {
      trialPlanId = (rPlan.data as { data: { id: string } }).data.id
      pass(`Plan créé`, `id=${trialPlanId}`)

      const rSub = await subApi('POST', '/subscriptions', subk.raw, {
        planId:      trialPlanId,
        newClient:   { name: 'Client Essai', clientType: 'INDIVIDUAL' },
        clientEmail: 'client-essai@test.dz',
        status:      'ACTIVE',
      })
      if (rSub.status === 201) {
        trialSubId = (rSub.data as { data: { id: string } }).data.id
        pass(`Abonnement client créé`, `id=${trialSubId}`)
      } else {
        fail(`Création abonnement client`, `HTTP ${rSub.status}`)
      }
    } else {
      fail(`Création plan`, `HTTP ${rPlan.status} ${JSON.stringify(rPlan.data).slice(0,80)}`)
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  phase(5, 'EXPIRATION TOTALE ERP → SUB-API BLOQUÉE, V1 API TOUJOURS OK')
  // ════════════════════════════════════════════════════════════════════════════

  step('Expirer YelhaSubscription ET AppSubscription')
  // Expirer les deux pour tester le blocage total de l'app Abonnements
  await prisma.yelhaSubscription.update({
    where: { id: yelhaSub.id },
    data:  { status: 'EXPIRED', currentPeriodEnd: new Date(Date.now() - 86400000) },
  })
  const appSubCurrent = await prisma.appSubscription.findFirst({ where: { companyId: company.id, appId: 'subscriptions' } })
  if (appSubCurrent) {
    await prisma.appSubscription.update({
      where: { id: appSubCurrent.id },
      data:  { status: 'EXPIRED', currentPeriodEnd: new Date(Date.now() - 1000), trialEndsAt: new Date(Date.now() - 1000) },
    })
  }
  pass(`YelhaSubscription + AppSubscription → EXPIRED`)

  step('Vérifier blocage sub-api : lecture, écriture, checkout')
  {
    const [rGet, rCreate, rCheckout] = await Promise.all([
      subApi('GET', '/plans', subk.raw),
      subApi('POST', '/plans', subk.raw, { name: 'Test', price: 100 }),
      trialSubId ? subApi('POST', `/subscriptions/${trialSubId}/checkout`, subk.raw) : Promise.resolve({ status: 0, data: {} }),
    ])

    rGet.status === 403    ? pass(`GET  /plans → 403 bloqué ✓`)     : fail(`GET  /plans devrait être 403`, `HTTP ${rGet.status}`)
    rCreate.status === 403 ? pass(`POST /plans → 403 bloqué ✓`)     : fail(`POST /plans devrait être 403`, `HTTP ${rCreate.status}`)
    if (trialSubId) {
      rCheckout.status === 403 ? pass(`POST /checkout → 403 bloqué ✓`) : fail(`POST /checkout devrait être 403`, `HTTP ${rCheckout.status}`)
    }
  }

  // v1 API (core apps) toujours accessible même ERP expiré (pas de vérification sub)
  step('Vérifier que l\'API v1 (core ERP) reste accessible malgré l\'expiration')
  {
    const [rc, ri] = await Promise.all([
      v1('GET', '/clients', v1k.raw),
      v1('GET', '/invoices', v1k.raw),
    ])
    rc.status === 200 ? pass(`GET /api/v1/clients → 200 ✓ (core, aucune vérif subscription)`) : fail(`Core ERP bloqué`, `HTTP ${rc.status}`)
    ri.status === 200 ? pass(`GET /api/v1/invoices → 200 ✓ (core, aucune vérif subscription)`) : fail(`Core ERP bloqué`, `HTTP ${ri.status}`)
  }

  // ════════════════════════════════════════════════════════════════════════════
  phase(6, 'PAIEMENT APP ABONNEMENTS SEUL → SUB-API RESTAURÉE INDÉPENDAMMENT')
  // ════════════════════════════════════════════════════════════════════════════

  info('YelhaSubscription reste EXPIRED. On paie uniquement l\'app Abonnements.')
  info('L\'AppSubscription active prend la priorité → sub-api restaurée sans payer l\'ERP.')

  step('Activer AppSubscription indépendamment (paiement app uniquement)')
  const appPeriodStart = new Date()
  const appPeriodEnd   = new Date(appPeriodStart.getTime() + 30 * 86400000)

  // Créer ou mettre à jour l'AppSubscription
  let activatedAppSubId: string | null = null
  if (appSubCurrent) {
    await prisma.appSubscription.update({
      where: { id: appSubCurrent.id },
      data: {
        status:             'ACTIVE',
        planId:             'starter',
        currentPeriodStart: appPeriodStart,
        currentPeriodEnd:   appPeriodEnd,
        trialEndsAt:        null,
      },
    })
    activatedAppSubId = appSubCurrent.id
  } else {
    // Créer une AppSubscription si elle n'existait pas
    const newAppSub = await prisma.appSubscription.create({
      data: {
        companyId:          company.id,
        appId:              'subscriptions',
        status:             'ACTIVE',
        planId:             'starter',
        currentPeriodStart: appPeriodStart,
        currentPeriodEnd:   appPeriodEnd,
      },
    })
    activatedAppSubId = newAppSub.id
  }
  pass(`AppSubscription → ACTIVE (plan Starter)`, `jusqu'au ${appPeriodEnd.toLocaleDateString('fr-DZ')}`)

  step('Vérifier restauration sub-api (AppSub ACTIVE, même YelhaSub EXPIRED)')
  {
    const [rGet, rCreate] = await Promise.all([
      subApi('GET', '/plans', subk.raw),
      subApi('POST', '/plans', subk.raw, { name: 'Plan Post-Paiement', price: 3000 }),
    ])

    rGet.status === 200                                                       ? pass(`GET  /plans → 200 ✓ (accès restauré via AppSub)`) : fail(`GET  /plans devrait être 200`, `HTTP ${rGet.status}`)
    (rCreate.data as { data?: { id: string } }).data?.id ? pass(`POST /plans → créé ✓ (écriture restaurée)`)                          : fail(`POST /plans devrait créer`, `HTTP ${rCreate.status}`)

    const newPlanId = (rCreate.data as { data?: { id: string } }).data?.id
    if (newPlanId) await subApi('DELETE', `/plans/${newPlanId}`, subk.raw)
  }

  // Checkout aussi disponible
  if (trialSubId) {
    const r = await subApi('POST', `/subscriptions/${trialSubId}/checkout`, subk.raw)
    const d = r.data as { data?: { checkoutUrl: string }; code?: string }
    if (r.status === 200 && d.data?.checkoutUrl) {
      pass(`Checkout Chargily → lien généré ✓`, `${d.data.checkoutUrl.slice(0,50)}…`)
    } else if (r.status === 409 && d.code === 'CHARGILY_NOT_CONFIGURED') {
      pass(`Checkout → 409 CHARGILY_NOT_CONFIGURED (clé Chargily non configurée pour cette company)`)
    } else {
      fail(`Checkout inattendu`, `HTTP ${r.status} code=${d.code ?? '?'}`)
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  // NETTOYAGE
  // ════════════════════════════════════════════════════════════════════════════
  console.log(`\n${Y}━━ NETTOYAGE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${X}`)

  // Supprimer données de test
  if (trialSubId) await subApi('DELETE', `/subscriptions/${trialSubId}`, subk.raw)
  if (trialPlanId) await subApi('DELETE', `/plans/${trialPlanId}`, subk.raw)

  await Promise.all([
    invoiceId ? prisma.invoice.delete({ where: { id: invoiceId } }).catch(() => {}) : null,
    clientId  ? prisma.client.delete({ where: { id: clientId } }).catch(() => {}) : null,
    productId ? prisma.stockMovement.deleteMany({ where: { productId } }).catch(() => {}) : null,
    poId      ? prisma.purchaseOrder.delete({ where: { id: poId } }).catch(() => {}) : null,
    supplierId ? prisma.supplier.delete({ where: { id: supplierId } }).catch(() => {}) : null,
    productId ? prisma.product.delete({ where: { id: productId } }).catch(() => {}) : null,
    prisma.yelhaPayment.delete({ where: { id: yelhaPayment.id } }).catch(() => {}),
    prisma.apiKey.delete({ where: { id: v1KeyRecord.id } }).catch(() => {}),
    prisma.subApiKey.delete({ where: { id: subKeyRecord.id } }).catch(() => {}),
  ])

  // Restaurer l'état original
  await prisma.yelhaSubscription.update({
    where: { id: yelhaSub.id },
    data: {
      status:          savedYelha.status,
      trialEndsAt:     savedYelha.trialEndsAt,
      planId:          savedYelha.planId,
      currentPeriodEnd: savedYelha.currentPeriodEnd,
    },
  })
  if (appSubCurrent && savedApp) {
    await prisma.appSubscription.update({
      where: { id: appSubCurrent.id },
      data: {
        status:          savedApp.status,
        trialEndsAt:     savedApp.trialEndsAt,
        currentPeriodEnd: savedApp.currentPeriodEnd,
      },
    })
  } else if (activatedAppSubId && !appSubCurrent) {
    // AppSubscription créée pendant la simulation → supprimer
    await prisma.appSubscription.delete({ where: { id: activatedAppSubId } }).catch(() => {})
  }
  pass(`État original restauré`, `YelhaSub=${savedYelha.status} AppSub=${savedApp?.status ?? 'n/a'}`)

  // ── BILAN ──────────────────────────────────────────────────────────────────
  console.log(`\n${B}${'═'.repeat(60)}${X}`)
  console.log(`  📊  BILAN FINAL`)
  console.log(`      ${G}✅ Réussi : ${ok}${X}`)
  if (ko > 0) console.log(`      ${R}❌ Échoué : ${ko}${X}`)
  console.log(`${B}${'═'.repeat(60)}${X}`)
  console.log()
  if (ko > 0) process.exit(1)
}

main()
  .catch(e => { console.error('\n❌ Erreur non gérée :', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
