/**
 * Test end-to-end subscription flow for cevekmehdi@gmail.com
 *
 * Steps:
 *  1. Find the YelhaERP user whose email is cevekmehdi@gmail.com
 *  2. Create a subscription plan (test plan, 1 500 DA/mois, 7-day trial)
 *  3. Create a client with email cevekmehdi@gmail.com
 *  4. Create a subscription in TRIAL status (nextBilling = now + 7 days)
 *  5. Simulate trial end → status EXPIRED
 *  6. Activate subscription → status ACTIVE, nextBilling = now + 30 days
 *  7. Simulate J-1 → nextBilling = now + 23 hours
 *  8. Run reminder logic (inline cron) → verify email sent
 *  9. Cleanup all test data created
 *
 * Usage:
 *   npx tsx scripts/test-subscription-flow.ts
 *   npx tsx scripts/test-subscription-flow.ts --keep   (skip cleanup)
 */

import 'dotenv/config'
import { assertNotProd } from './lib/prod-guard'
import { PrismaClient } from '@prisma/client'
import { sendEmail } from '../lib/email/resend'
import { getTemplate, type EmailLang, type TemplatesByLang } from '../lib/subscriptions/email-templates'
import { renderEmail } from '../lib/subscriptions/email-renderer'

assertNotProd('test-subscription-flow')

const prisma = new PrismaClient()

const TARGET_EMAIL = 'cevekmehdi@gmail.com'
const KEEP = process.argv.includes('--keep')

// ── helpers ──────────────────────────────────────────────────────────────────

function step(n: number, msg: string) {
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

// ── main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('━'.repeat(60))
  console.log('  Test : flux d\'abonnement E2E')
  console.log(`  Email cible : ${TARGET_EMAIL}`)
  console.log('━'.repeat(60))

  // ── 1. Trouver l'utilisateur ──────────────────────────────────────────────
  step(1, 'Recherche du compte utilisateur YelhaERP…')

  const user = await prisma.user.findFirst({
    where: { email: TARGET_EMAIL },
    include: { subscriptionSettings: true },
  })

  if (!user) fail(`Aucun compte trouvé pour ${TARGET_EMAIL}. Créez d'abord un compte.`)
  ok(`Compte trouvé — id: ${user.id}  nom: ${user.name ?? '(sans nom)'}`)

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

  // ── 5. Simuler la fin d'essai → EXPIRED ──────────────────────────────────
  step(5, 'Simulation fin d\'essai → status EXPIRED…')
  await sleep(500)

  const pastDate = new Date(Date.now() - 60 * 60 * 1000) // il y a 1 heure

  await prisma.subscription.update({
    where: { id: sub.id },
    data:  { nextBilling: pastDate, status: 'EXPIRED' },
  })
  ok(`nextBilling mis dans le passé, status → EXPIRED`)

  // ── 6. Activer l'abonnement → ACTIVE ─────────────────────────────────────
  step(6, 'Activation de l\'abonnement → status ACTIVE (30 jours)…')
  await sleep(500)

  const nextRenewal = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

  await prisma.subscription.update({
    where: { id: sub.id },
    data: {
      status:      'ACTIVE',
      startDate:   new Date(),
      nextBilling: nextRenewal,
    },
  })
  ok(`status → ACTIVE  nextBilling: ${nextRenewal.toLocaleDateString('fr-DZ')}`)

  // ── 7. Simuler J-1 (23h avant expiration) ────────────────────────────────
  step(7, 'Simulation J-1 : nextBilling = maintenant + 23h…')
  await sleep(500)

  const in23h = new Date(Date.now() + 23 * 60 * 60 * 1000)

  await prisma.subscription.update({
    where: { id: sub.id },
    data: { nextBilling: in23h },
  })
  ok(`nextBilling → ${in23h.toLocaleString('fr-DZ')} (dans 23h)`)

  // ── 8. Exécuter la logique de rappel ─────────────────────────────────────
  step(8, 'Exécution de la logique de rappel J-1…')

  const freshSub = await prisma.subscription.findUniqueOrThrow({
    where: { id: sub.id },
    include: {
      client: { select: { name: true, firstName: true } },
      plan:   { select: { name: true, price: true } },
      user:   { select: { id: true, name: true, subscriptionSettings: true } },
    },
  })

  if (!freshSub.clientEmail || !freshSub.nextBilling) {
    fail('Données de rappel incomplètes (clientEmail ou nextBilling absent)')
  }

  info(`Abonnement: status=${freshSub.status}  nextBilling=${freshSub.nextBilling.toLocaleString('fr-DZ')}`)

  const settings  = freshSub.user.subscriptionSettings
  const lang      = (settings?.emailLanguage ?? 'fr') as EmailLang
  const template  = getTemplate(
    (settings?.emailTemplates ?? null) as TemplatesByLang | null,
    'renewal',
    lang,
  )

  const clientName = [freshSub.client.firstName, freshSub.client.name].filter(Boolean).join(' ') || freshSub.client.name
  const amount     = Number(freshSub.plan.price)

  const { subject, html } = renderEmail({
    template,
    lang,
    data: {
      clientName,
      planName:    freshSub.plan.name,
      companyName: freshSub.user.name ?? 'YelhaERP',
      amount,
      expiresAt:   freshSub.nextBilling,
    },
    settings: {
      whatsapp:            settings?.whatsapp ?? null,
      ccpNumber:           settings?.ccpNumber ?? null,
      chargilyCheckoutUrl: null,
    },
  })

  info(`Sujet de l'email : "${subject}"`)
  info(`Destinataire : ${freshSub.clientEmail}`)
  info(`Langue : ${lang}`)

  const result = await sendEmail({ to: freshSub.clientEmail, subject, html })

  if (!result || ('error' in result && result.error)) {
    fail(`Envoi email échoué : ${JSON.stringify('error' in result ? result.error : result)}`)
  }

  ok(`Email de rappel envoyé avec succès ! id Resend: ${'data' in result ? result.data?.id : '—'}`)

  // Marquer le rappel comme envoyé (comme le cron le ferait)
  await prisma.subscription.update({
    where: { id: sub.id },
    data: { lastRenewalReminderAt: new Date() },
  })
  ok('lastRenewalReminderAt mis à jour — anti-spam activé')

  // ── 9. Nettoyage ──────────────────────────────────────────────────────────
  if (KEEP) {
    step(9, 'Nettoyage ignoré (--keep passé)')
    info(`Plan   : ${plan.id}`)
    info(`Client : ${client.id}`)
    info(`Sub    : ${sub.id}`)
  } else {
    step(9, 'Nettoyage des données de test…')

    await prisma.subscription.delete({ where: { id: sub.id } })
    ok('Abonnement supprimé')

    await prisma.client.delete({ where: { id: client.id } })
    ok('Client supprimé')

    await prisma.subscriptionPlan.delete({ where: { id: plan.id } })
    ok('Plan supprimé')
  }

  console.log('\n' + '━'.repeat(60))
  console.log('  ✅ Tous les tests ont réussi !')
  console.log('━'.repeat(60) + '\n')
}

main()
  .catch(e => {
    console.error('\n🛑 Erreur fatale :', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
