/**
 * Test end-to-end subscription flow for cevekmehdi@gmail.com
 *
 * Steps:
 *  1.  Find the YelhaERP user (cevekmehdi@gmail.com) — save original plan
 *  1b. Set user.plan = 'PRO' to simulate white-label mode
 *  2.  Create a test subscription plan (1 500 DA/mois, 7-day trial)
 *  3.  Create a test client (cevekmehdi@gmail.com)
 *  4.  Create subscription in TRIAL status (nextBilling = now + 7 days)
 *  4b. Send trialWelcome email → confirm trial started (no payment blocks)
 *  4c. Simulate trial J-1 (nextBilling = now + 23h) → send trialEnd reminder
 *  5.  Expire trial → status EXPIRED
 *  6.  Activate subscription → status ACTIVE, nextBilling = now + 30 days
 *  7.  Simulate J-1 → nextBilling = now + 23h
 *  8.  Send renewal reminder (white-label header)
 *  9.  Cleanup + restore user.plan
 *
 * Usage:
 *   npx tsx scripts/test-subscription-flow.ts
 *   npx tsx scripts/test-subscription-flow.ts --keep   (skip cleanup)
 */

import { readFileSync } from 'fs'
import { resolve } from 'path'

// Walk up from cwd to find .env files (handles git worktrees where env files live in the main project)
function loadEnvFiles() {
  const filenames = ['.env.vercel.local', '.env.local']
  let dir = process.cwd()
  const visited = new Set<string>()
  while (dir && !visited.has(dir)) {
    visited.add(dir)
    for (const filename of filenames) {
      try {
        const lines = readFileSync(resolve(dir, filename), 'utf-8').split('\n')
        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed || trimmed.startsWith('#')) continue
          const eq = trimmed.indexOf('=')
          if (eq < 0) continue
          const key = trimmed.slice(0, eq).trim()
          const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '')
          if (!(key in process.env)) process.env[key] = val
        }
      } catch { /* file absent */ }
    }
    const parent = resolve(dir, '..')
    if (parent === dir) break
    dir = parent
  }
}
loadEnvFiles()

import { assertNotProd } from './lib/prod-guard'
import { PrismaClient } from '@prisma/client'
import { sendEmail } from '../lib/email/resend'
import { getTemplate, type EmailLang, type TemplatesByLang } from '../lib/subscriptions/email-templates'
import { renderEmail, isWhiteLabel } from '../lib/subscriptions/email-renderer'

assertNotProd('test-subscription-flow')

const prisma = new PrismaClient()

const TARGET_EMAIL = 'cevekmehdi@gmail.com'
const KEEP = process.argv.includes('--keep')

// ── helpers ──────────────────────────────────────────────────────────────────

function step(n: string | number, msg: string) {
  console.log(`\n[${n}] ${msg}`)
}

function ok(msg: string) {
  console.log(`    ✅ ${msg}`)
}

function info(msg: string) {
  console.log(`    ℹ️  ${msg}`)
}

function fail(msg: string): never {
  console.error(`    ❌ ${msg}`)
  process.exit(1)
}

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms))
}

async function sendTestEmail(
  params: Parameters<typeof renderEmail>[0],
  to: string,
  label: string,
) {
  const { subject, html } = renderEmail(params)
  info(`Sujet : "${subject}"`)
  info(`Destinataire : ${to}`)
  const result = await sendEmail({ to, subject, html })
  if (!result || ('error' in result && result.error)) {
    fail(`Envoi "${label}" échoué : ${JSON.stringify('error' in result ? result.error : result)}`)
  }
  ok(`Email "${label}" envoyé ! id Resend: ${'data' in result ? result.data?.id : '—'}`)
}

// ── main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('━'.repeat(60))
  console.log('  Test : flux d\'abonnement E2E (mode PRO white-label)')
  console.log(`  Email cible : ${TARGET_EMAIL}`)
  console.log('━'.repeat(60))

  // ── 1. Trouver l'utilisateur ──────────────────────────────────────────────
  step(1, 'Recherche du compte utilisateur YelhaERP…')

  const user = await prisma.user.findFirst({
    where: { email: TARGET_EMAIL },
    include: { subscriptionSettings: true },
  })

  if (!user) fail(`Aucun compte trouvé pour ${TARGET_EMAIL}. Créez d'abord un compte.`)

  const originalPlan = user.plan
  ok(`Compte trouvé — id: ${user.id}  nom: ${user.name ?? '(sans nom)'}  plan actuel: ${originalPlan}`)

  // ── 1b. Activer le mode PRO (white-label) ────────────────────────────────
  step('1b', 'Activation temporaire du plan PRO (simulation white-label)…')

  await prisma.user.update({ where: { id: user.id }, data: { plan: 'PRO' } })
  ok(`user.plan → PRO  (sera restauré à "${originalPlan}" en fin de test)`)

  // ── 2. Créer un plan de test ──────────────────────────────────────────────
  step(2, 'Création du plan d\'abonnement de test…')

  const plan = await prisma.subscriptionPlan.create({
    data: {
      userId:        user.id,
      name:          '[TEST] Plan Mensuel',
      description:   'Plan de test — supprimé après le script',
      price:         1500,
      currency:      'DZD',
      interval:      'MONTHLY',
      intervalCount: 1,
      trialDays:     7,
      features:      ['Accès illimité', 'Support email'],
      isActive:      true,
    },
  })
  ok(`Plan créé — id: ${plan.id}  prix: ${plan.price} DA  trial: ${plan.trialDays}j`)

  // ── 3. Créer un client de test ────────────────────────────────────────────
  step(3, 'Création du client de test…')

  const client = await prisma.client.create({
    data: {
      userId:     user.id,
      name:       'Mehdi',
      firstName:  'Cevek',
      email:      TARGET_EMAIL,
      clientType: 'INDIVIDUAL',
    },
  })
  ok(`Client créé — id: ${client.id}  email: ${client.email}`)

  // ── 4. Créer l'abonnement en TRIAL ────────────────────────────────────────
  step(4, 'Création de l\'abonnement en période d\'essai (7 jours)…')

  const trialEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

  const sub = await prisma.subscription.create({
    data: {
      userId:      user.id,
      clientId:    client.id,
      planId:      plan.id,
      status:      'TRIAL',
      startDate:   new Date(),
      nextBilling: trialEnd,
      clientEmail: TARGET_EMAIL,
    },
  })
  ok(`Abonnement créé — id: ${sub.id}  status: TRIAL  nextBilling: ${trialEnd.toLocaleString('fr-DZ')}`)

  // ── 4b. Email trialWelcome ─────────────────────────────────────────────────
  step('4b', 'Envoi de l\'email de bienvenue essai gratuit (trialWelcome)…')

  const freshUser = await prisma.user.findUniqueOrThrow({
    where: { id: user.id },
    include: { subscriptionSettings: true },
  })

  const settings   = freshUser.subscriptionSettings
  const lang       = (settings?.emailLanguage ?? 'fr') as EmailLang
  const clientName = `${client.firstName} ${client.name}`.trim()

  const trialWelcomeTemplate = getTemplate(
    (settings?.emailTemplates ?? null) as TemplatesByLang | null,
    'trialWelcome',
    lang,
  )

  await sendTestEmail(
    {
      template: trialWelcomeTemplate,
      lang,
      data: {
        clientName,
        planName:    plan.name,
        companyName: freshUser.name ?? 'Mon compte',
        amount:      Number(plan.price),
        expiresAt:   trialEnd,
      },
      settings: { whatsapp: null, ccpNumber: null, chargilyCheckoutUrl: null },
      whiteLabel:       isWhiteLabel(freshUser.plan),
      skipPaymentBlock: true,
    },
    TARGET_EMAIL,
    'trialWelcome',
  )

  // ── 4c. Simuler trial J-1 → email trialEnd ───────────────────────────────
  step('4c', 'Simulation trial J-1 : nextBilling = maintenant + 23h → email trialEnd…')
  await sleep(500)

  const trialIn23h = new Date(Date.now() + 23 * 60 * 60 * 1000)
  await prisma.subscription.update({
    where: { id: sub.id },
    data: { nextBilling: trialIn23h },
  })
  ok(`nextBilling → ${trialIn23h.toLocaleString('fr-DZ')} (dans 23h)`)

  const trialEndTemplate = getTemplate(
    (settings?.emailTemplates ?? null) as TemplatesByLang | null,
    'trialEnd',
    lang,
  )

  await sendTestEmail(
    {
      template: trialEndTemplate,
      lang,
      data: {
        clientName,
        planName:    plan.name,
        companyName: freshUser.name ?? 'Mon compte',
        amount:      Number(plan.price),
        expiresAt:   trialIn23h,
      },
      settings: {
        whatsapp:            settings?.whatsapp ?? null,
        ccpNumber:           settings?.ccpNumber ?? null,
        chargilyCheckoutUrl: null,
      },
      whiteLabel: isWhiteLabel(freshUser.plan),
    },
    TARGET_EMAIL,
    'trialEnd',
  )

  await prisma.subscription.update({
    where: { id: sub.id },
    data: { lastTrialEndReminderAt: new Date() },
  })
  ok('lastTrialEndReminderAt mis à jour')

  // ── 5. Simuler la fin d'essai → EXPIRED ──────────────────────────────────
  step(5, 'Simulation fin d\'essai → status EXPIRED…')
  await sleep(500)

  await prisma.subscription.update({
    where: { id: sub.id },
    data: { nextBilling: new Date(Date.now() - 60 * 60 * 1000), status: 'EXPIRED' },
  })
  ok('nextBilling mis dans le passé, status → EXPIRED')

  // ── 6. Activer l'abonnement → ACTIVE ─────────────────────────────────────
  step(6, 'Activation de l\'abonnement → status ACTIVE (30 jours)…')
  await sleep(500)

  const nextRenewal = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  await prisma.subscription.update({
    where: { id: sub.id },
    data: { status: 'ACTIVE', startDate: new Date(), nextBilling: nextRenewal },
  })
  ok(`status → ACTIVE  nextBilling: ${nextRenewal.toLocaleDateString('fr-DZ')}`)

  // ── 7. Simuler J-1 (23h avant renouvellement) ────────────────────────────
  step(7, 'Simulation J-1 : nextBilling = maintenant + 23h…')
  await sleep(500)

  const renewalIn23h = new Date(Date.now() + 23 * 60 * 60 * 1000)
  await prisma.subscription.update({
    where: { id: sub.id },
    data: { nextBilling: renewalIn23h },
  })
  ok(`nextBilling → ${renewalIn23h.toLocaleString('fr-DZ')} (dans 23h)`)

  // ── 8. Email de rappel renouvellement ─────────────────────────────────────
  step(8, 'Envoi de l\'email de rappel renouvellement (renewal)…')

  const renewalTemplate = getTemplate(
    (settings?.emailTemplates ?? null) as TemplatesByLang | null,
    'renewal',
    lang,
  )

  await sendTestEmail(
    {
      template: renewalTemplate,
      lang,
      data: {
        clientName,
        planName:    plan.name,
        companyName: freshUser.name ?? 'Mon compte',
        amount:      Number(plan.price),
        expiresAt:   renewalIn23h,
      },
      settings: {
        whatsapp:            settings?.whatsapp ?? null,
        ccpNumber:           settings?.ccpNumber ?? null,
        chargilyCheckoutUrl: null,
      },
      whiteLabel: isWhiteLabel(freshUser.plan),
    },
    TARGET_EMAIL,
    'renewal',
  )

  await prisma.subscription.update({
    where: { id: sub.id },
    data: { lastRenewalReminderAt: new Date() },
  })
  ok('lastRenewalReminderAt mis à jour — anti-spam activé')

  // ── 9. Nettoyage + restauration du plan ───────────────────────────────────
  if (KEEP) {
    step(9, 'Nettoyage ignoré (--keep passé)')
    info(`Plan   : ${plan.id}`)
    info(`Client : ${client.id}`)
    info(`Sub    : ${sub.id}`)
    info(`user.plan est toujours PRO — restaurez manuellement si besoin`)
  } else {
    step(9, 'Nettoyage des données de test + restauration du plan…')

    await prisma.subscription.delete({ where: { id: sub.id } })
    ok('Abonnement supprimé')

    await prisma.client.delete({ where: { id: client.id } })
    ok('Client supprimé')

    await prisma.subscriptionPlan.delete({ where: { id: plan.id } })
    ok('Plan supprimé')

    await prisma.user.update({ where: { id: user.id }, data: { plan: originalPlan } })
    ok(`user.plan restauré → ${originalPlan}`)
  }

  console.log('\n' + '━'.repeat(60))
  console.log('  ✅ Tous les tests ont réussi !')
  console.log('  3 emails envoyés : trialWelcome · trialEnd · renewal')
  console.log('━'.repeat(60) + '\n')
}

main()
  .catch(e => {
    console.error('\n🛑 Erreur fatale :', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
