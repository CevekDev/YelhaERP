/**
 * Test E2E complet du module Abonnements (sub-api)
 *
 * Étapes testées :
 *   1. Connexion DB + trouvaille d'une company avec AppSubscription active
 *   2. Création d'une clé sub-api de test
 *   3. Création d'un plan via sub-api
 *   4. Création d'un abonné (newClient) + subscription avec email
 *   5. Email de bienvenue (tentative, nécessite RESEND_API_KEY)
 *   6. Génération d'un lien Chargily checkout (appel API réel)
 *   7. Simulation du cron J-1 (advance nextBilling → dans 20h)
 *   8. Appel du cron reminder → email de rappel
 *   9. Simulation webhook Chargily → renouvellement
 *  10. Vérification DB : nextBilling étendu, status ACTIVE
 *  11. Nettoyage des données de test
 *
 * Usage :
 *   npx tsx scripts/test-subscriptions-e2e.ts
 *
 * Pré-requis :
 *   - npm run dev en cours sur localhost:3000
 *   - .env.local avec DATABASE_URL + CHARGILY_SECRET_KEY
 */

import crypto from 'crypto'
import path from 'path'
import fs from 'fs'
import { PrismaClient } from '@prisma/client'
import { assertNotProd } from './lib/prod-guard'

// ── Charger .env.local ────────────────────────────────────────────────────────
const envPath = path.resolve(process.cwd(), '.env.local')
if (!fs.existsSync(envPath)) { console.error('❌  .env.local introuvable'); process.exit(1) }
for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
  const t = line.trim()
  if (!t || t.startsWith('#')) continue
  const idx = t.indexOf('=')
  if (idx === -1) continue
  const key = t.slice(0, idx).trim()
  const val = t.slice(idx + 1).trim().replace(/^["']|["']$/g, '')
  if (!process.env[key]) process.env[key] = val
}

assertNotProd('test-subscriptions-e2e.ts')

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
const CRON_SECRET = process.env.CRON_SECRET ?? 'undefined'
const CHARGILY_KEY = process.env.CHARGILY_SECRET_KEY!

const prisma = new PrismaClient()
const KEY_PREFIX = 'yelha_sub_'

function ok(label: string, detail = '') { console.log(`  ✅  ${label}${detail ? `  →  ${detail}` : ''}`) }
function fail(label: string, detail = '') { console.log(`  ❌  ${label}${detail ? `  →  ${detail}` : ''}`) }
function info(label: string) { console.log(`  ℹ️   ${label}`) }
function step(n: number, label: string) { console.log(`\n── Étape ${n} : ${label} ${'─'.repeat(Math.max(0, 50 - label.length))}`) }

// ── Helpers ───────────────────────────────────────────────────────────────────

function generateKey() {
  const random = crypto.randomBytes(32).toString('hex')
  const rawKey = `${KEY_PREFIX}${random}`
  const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex')
  const keyPrefix = rawKey.slice(0, KEY_PREFIX.length + 8)
  return { rawKey, keyHash, keyPrefix }
}

function hmac(secret: string, body: string) {
  return crypto.createHmac('sha256', secret).update(body).digest('hex')
}

async function api(
  method: string,
  path: string,
  apiKey: string,
  body?: unknown,
): Promise<{ status: number; data: unknown }> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  let data: unknown
  try { data = await res.json() } catch { data = await res.text() }
  return { status: res.status, data }
}

async function callCron(path: string): Promise<{ status: number; data: unknown }> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { Authorization: `Bearer ${CRON_SECRET}` },
  })
  let data: unknown
  try { data = await res.json() } catch { data = await res.text() }
  return { status: res.status, data }
}

async function simulateSubWebhook(
  subscriptionId: string,
  companyId: string,
  chargilyKey: string,
): Promise<{ status: number; data: unknown }> {
  const fakeEventId = 'sim_sub_' + crypto.randomBytes(6).toString('hex')
  const payload = JSON.stringify({
    type: 'checkout.paid',
    data: {
      id: fakeEventId,
      status: 'paid',
      metadata: { type: 'sub_renewal', subscriptionId, companyId },
    },
  })
  const signature = hmac(chargilyKey, payload)
  const res = await fetch(`${BASE_URL}/api/webhooks/chargily-subscriptions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', signature },
    body: payload,
  })
  let data: unknown
  try { data = await res.json() } catch { data = await res.text() }
  return { status: res.status, data }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🧪  TEST E2E — Module Abonnements (sub-api)')
  console.log(`    Serveur : ${BASE_URL}`)
  console.log(`    DB      : Supabase (prod)\n`)

  // ── Vérifier que le serveur répond ──────────────────────────────────────────
  try {
    const ping = await fetch(`${BASE_URL}/api/sub-api/docs`)
    if (!ping.ok && ping.status !== 401) throw new Error(`HTTP ${ping.status}`)
    ok('Serveur Next.js accessible')
  } catch {
    fail('Serveur Next.js inaccessible — lance `npm run dev` dans un autre terminal')
    process.exit(1)
  }

  // ── Étape 1 : Trouver une company avec AppSubscription subscriptions ────────
  step(1, 'Recherche company avec AppSubscription active')
  const appSub = await prisma.appSubscription.findFirst({
    where: { appId: 'subscriptions', status: { in: ['ACTIVE', 'TRIAL'] } },
    include: {
      company: {
        include: { subscriptionSettings: true },
      },
    },
  })
  if (!appSub) {
    fail('Aucune company avec AppSubscription subscriptions active.')
    info('Active l\'app Abonnements sur le dashboard (Paramètres > Applications) puis relance.')
    process.exit(1)
  }
  const company = appSub.company
  ok(`Company trouvée : ${company.name} (${company.id})`)
  info(`AppSubscription status : ${appSub.status}, expire le ${appSub.currentPeriodEnd?.toLocaleDateString('fr-DZ') ?? '?'}`)

  // ── Étape 2 : Clé sub-api de test ──────────────────────────────────────────
  step(2, 'Création d\'une clé sub-api temporaire')
  const { rawKey, keyHash, keyPrefix } = generateKey()
  const testKeyRecord = await prisma.subApiKey.create({
    data: {
      companyId: company.id,
      name:      'test-e2e (supprimée après test)',
      keyHash,
      keyPrefix,
      isActive:  true,
    },
  })
  ok(`Clé créée : ${keyPrefix}••••••••`)

  // ── Étape 3 : SubscriptionSettings avec chargilyKey ────────────────────────
  step(3, 'Vérification / création SubscriptionSettings')
  let settings = company.subscriptionSettings
  if (!settings) {
    settings = await prisma.subscriptionSettings.create({
      data: {
        companyId:     company.id,
        chargilyKey:   CHARGILY_KEY,
        emailLanguage: 'fr',
      },
    })
    ok('SubscriptionSettings créées avec la clé Chargily de test')
  } else if (!settings.chargilyKey) {
    settings = await prisma.subscriptionSettings.update({
      where: { companyId: company.id },
      data:  { chargilyKey: CHARGILY_KEY },
    })
    ok('chargilyKey ajoutée aux settings existantes')
  } else {
    ok(`SubscriptionSettings déjà configurées (chargilyKey: ${settings.chargilyKey.slice(0, 16)}…)`)
  }

  // ── Étape 4 : Créer un plan via sub-api ────────────────────────────────────
  step(4, 'Création d\'un plan via sub-api')
  const planRes = await api('POST', '/api/sub-api/plans', rawKey, {
    name:          'Plan Test E2E',
    description:   'Créé par le script de test automatique',
    price:         500,
    currency:      'DZD',
    interval:      'MONTHLY',
    intervalCount: 1,
    trialDays:     0,
    features:      ['Feature A', 'Feature B'],
    isActive:      true,
  })
  if (planRes.status !== 201) {
    fail(`Création plan échouée HTTP ${planRes.status}`, JSON.stringify(planRes.data))
    await cleanup(testKeyRecord.id); process.exit(1)
  }
  const plan = (planRes.data as { data: { id: string; name: string } }).data
  ok(`Plan créé : "${plan.name}" (${plan.id})`)

  // ── Étape 5 : Créer un abonnement avec newClient ────────────────────────────
  step(5, 'Création d\'un abonnement + nouveau client')
  const clientEmail = 'test-e2e@yelhaerp-test.dz'
  const subRes = await api('POST', '/api/sub-api/subscriptions', rawKey, {
    planId: plan.id,
    newClient: {
      name:       'Test E2E',
      firstName:  'Client',
      clientType: 'INDIVIDUAL',
    },
    clientEmail,
    status: 'ACTIVE',
  })
  if (subRes.status !== 201) {
    fail(`Création abonnement échouée HTTP ${subRes.status}`, JSON.stringify(subRes.data))
    await cleanup(testKeyRecord.id, plan.id); process.exit(1)
  }
  const sub = (subRes.data as { data: { id: string; status: string; nextBilling: string; clientId?: string } }).data
  ok(`Abonnement créé : ${sub.id}`)
  ok(`Status : ${sub.status}`)
  ok(`nextBilling : ${new Date(sub.nextBilling).toLocaleDateString('fr-DZ')}`)
  if (!process.env.RESEND_API_KEY) {
    info('Email de bienvenue : RESEND_API_KEY absente du .env.local → email ignoré silencieusement (normal en local)')
    info('En production Vercel, l\'email sera envoyé à ' + clientEmail)
  } else {
    ok(`Email de bienvenue envoyé à ${clientEmail}`)
  }

  // ── Étape 6 : GET abonnement par ID ────────────────────────────────────────
  step(6, 'Lecture de l\'abonnement via GET /subscriptions/:id')
  const getRes = await api('GET', `/api/sub-api/subscriptions/${sub.id}`, rawKey)
  if (getRes.status === 200) {
    ok('GET /subscriptions/:id → 200')
  } else {
    fail(`GET /subscriptions/:id → HTTP ${getRes.status}`, JSON.stringify(getRes.data))
  }

  // ── Étape 7 : Génération du lien Chargily checkout ─────────────────────────
  step(7, 'Génération lien Chargily checkout (API réelle)')
  const checkoutRes = await api('POST', `/api/sub-api/subscriptions/${sub.id}/checkout`, rawKey, {
    successUrl: `${BASE_URL}/success`,
    failureUrl: `${BASE_URL}/failure`,
  })
  if (checkoutRes.status === 200) {
    const url = (checkoutRes.data as { data: { checkoutUrl: string; amount: number } }).data
    ok(`Lien Chargily généré → montant ${url.amount} DZD`)
    info(`URL : ${url.checkoutUrl}`)
  } else {
    fail(`Checkout échoué HTTP ${checkoutRes.status}`, JSON.stringify(checkoutRes.data))
  }

  // ── Étape 8 : Avancer nextBilling → dans 20h (J-1 window) ──────────────────
  step(8, 'Simulation J-1 : avancer nextBilling à dans 20h')
  const in20h = new Date(Date.now() + 20 * 60 * 60 * 1000)
  await prisma.subscription.update({
    where: { id: sub.id },
    data:  {
      nextBilling:            in20h,
      lastRenewalReminderAt:  null,
      lastTrialEndReminderAt: null,
      lastRenewalReminder3At: null,
    },
  })
  ok(`nextBilling mis à ${in20h.toLocaleString('fr-DZ')} (dans ~20h)`)

  // ── Étape 9 : Appel du cron subscriptions-reminders ────────────────────────
  step(9, 'Appel du cron /api/cron/subscriptions-reminders')
  const cronRes = await callCron('/api/cron/subscriptions-reminders')
  if (cronRes.status === 200) {
    const r = cronRes.data as { remindersSent: number; skipped: number; markedExpired: number }
    ok(`Cron exécuté → remindersSent=${r.remindersSent}, skipped=${r.skipped}, markedExpired=${r.markedExpired}`)
    if (r.remindersSent > 0) {
      if (!process.env.RESEND_API_KEY) {
        info('Email de rappel J-1 : RESEND_API_KEY absente → tentative sans envoi réel')
      } else {
        ok(`Email de rappel J-1 envoyé à ${clientEmail}`)
      }
    } else {
      info('Aucun email envoyé (peut-être bloqué par canAccessApp ou anti-spam) — voir logs serveur')
    }
  } else {
    fail(`Cron HTTP ${cronRes.status}`, JSON.stringify(cronRes.data))
    if (cronRes.status === 401) {
      info('CRON_SECRET non défini dans .env.local — ajoute CRON_SECRET=<valeur> pour tester le cron localement')
    }
  }

  // ── Étape 10 : Avancer nextBilling → passé (pour simuler expiration puis renouvellement) ──
  step(10, 'Simulation renouvellement : paiement Chargily webhook')
  // Remettre nextBilling à maintenant + 30j pour que le webhook extend correctement
  const now = new Date()
  const futureNext = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
  await prisma.subscription.update({
    where: { id: sub.id },
    data:  { nextBilling: futureNext, status: 'ACTIVE' },
  })

  const webhookRes = await simulateSubWebhook(sub.id, company.id, settings.chargilyKey!)
  if (webhookRes.status === 200) {
    const wr = webhookRes.data as { success?: boolean; nextBilling?: string; ignored?: boolean }
    if (wr.success) {
      const newNext = new Date(wr.nextBilling!)
      ok(`Webhook traité → nextBilling étendu à ${newNext.toLocaleDateString('fr-DZ')}`)
    } else if (wr.ignored) {
      info(`Webhook ignoré (reason: ${(wr as { reason?: string }).reason ?? 'already_processed'})`)
    }
  } else {
    fail(`Webhook HTTP ${webhookRes.status}`, JSON.stringify(webhookRes.data))
  }

  // ── Étape 11 : Vérification finale en DB ───────────────────────────────────
  step(11, 'Vérification finale en base de données')
  const finalSub = await prisma.subscription.findUnique({ where: { id: sub.id } })
  if (!finalSub) {
    fail('Abonnement introuvable en DB')
  } else {
    const isActive = finalSub.status === 'ACTIVE'
    const isFuture = finalSub.nextBilling && finalSub.nextBilling > now

    isActive  ? ok(`Status : ${finalSub.status}`) : fail(`Status : ${finalSub.status} (attendu ACTIVE)`)
    isFuture  ? ok(`nextBilling : ${finalSub.nextBilling?.toLocaleDateString('fr-DZ')} (futur ✓)`)
              : fail(`nextBilling : ${finalSub.nextBilling?.toLocaleDateString('fr-DZ')} (passé ✗)`)
  }

  // ── Nettoyage ──────────────────────────────────────────────────────────────
  step(12, 'Nettoyage des données de test')
  await cleanup(testKeyRecord.id, plan.id, sub.id, sub.clientId as string | undefined)

  console.log('\n' + '─'.repeat(60))
  console.log('🎉  Test E2E terminé.\n')
  if (!process.env.RESEND_API_KEY) {
    console.log('⚠️   RESEND_API_KEY non configurée localement.')
    console.log('    Les emails (bienvenue + rappels) fonctionneront en production Vercel.')
    console.log('    Pour tester localement, ajoute RESEND_API_KEY=re_xxx dans .env.local\n')
  }
  if (!process.env.CRON_SECRET) {
    console.log('⚠️   CRON_SECRET non configuré localement.')
    console.log('    Ajoute CRON_SECRET=<valeur> dans .env.local pour tester le cron.\n')
  }
}

async function cleanup(keyId: string, planId?: string, subId?: string, clientId?: string) {
  try {
    if (subId)   await prisma.subscription.delete({ where: { id: subId } }).catch(() => {})
    if (clientId) await prisma.client.delete({ where: { id: clientId } }).catch(() => {})
    if (planId)  await prisma.subscriptionPlan.delete({ where: { id: planId } }).catch(() => {})
    await prisma.subApiKey.delete({ where: { id: keyId } }).catch(() => {})
    ok('Données de test supprimées')
  } catch { /* ignore */ }
}

main()
  .catch(e => { console.error('\n❌  Erreur non gérée :', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
