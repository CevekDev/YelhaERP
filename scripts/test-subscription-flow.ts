/**
 * Test end-to-end subscription flow for cevekmehdi@gmail.com
 *
 * Steps:
 *  1.  Find the YelhaERP user whose email is cevekmehdi@gmail.com
 *  2.  Create a subscription plan (test plan, 1 500 DA/mois, 7-day trial)
 *  3.  Create a client with email cevekmehdi@gmail.com
 *  4.  Create a subscription in TRIAL status (nextBilling = now + 7 days)
 *  4b. Send welcome email (bienvenue + instructions paiement)
 *  4c. Simulate trial J-1 → send trial-end reminder email
 *  5.  Simulate trial end → status EXPIRED
 *  6.  Activate subscription → status ACTIVE, nextBilling = now + 30 days
 *  7.  Simulate renewal J-1 → nextBilling = now + 23 hours
 *  8.  Send renewal reminder email
 *  9.  Cleanup all test data created
 *
 * Usage:
 *   npx tsx scripts/test-subscription-flow.ts --allow-prod
 *   npx tsx scripts/test-subscription-flow.ts --allow-prod --keep  (skip cleanup)
 */

import { readFileSync } from 'fs'
import { resolve } from 'path'

// Load .env.vercel.local then .env.local (Vercel vars take priority for RESEND etc.)
for (const filename of ['.env.vercel.local', '.env.local']) {
  try {
    const envPath = resolve(process.cwd(), filename)
    const lines = readFileSync(envPath, 'utf-8').split('\n')
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eq = trimmed.indexOf('=')
      if (eq < 0) continue
      const key = trimmed.slice(0, eq).trim()
      const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '')
      if (!(key in process.env)) process.env[key] = val
    }
  } catch { /* file absent — skip */ }
}

import { assertNotProd } from './lib/prod-guard'
import { PrismaClient } from '@prisma/client'
import { sendEmail } from '../lib/email/resend'
import { getTemplate, type EmailLang, type TemplatesByLang } from '../lib/subscriptions/email-templates'
import { renderEmail } from '../lib/subscriptions/email-renderer'
import { sendWelcomeEmail } from '../lib/subscriptions/send-welcome'

assertNotProd('test-subscription-flow')

const prisma = new PrismaClient()

const TARGET_EMAIL = 'cevekmehdi@gmail.com'
const KEEP = process.argv.includes('--keep')

// ── helpers ──────────────────────────────────────────────────────────────────

function step(label: string, msg: string) {
  console.log(`\n[${label}] ${msg}`)
}

function ok(msg: string)   { console.log(`    ✅ ${msg}`) }
function info(msg: string) { console.log(`    ℹ️  ${msg}`) }

function fail(msg: string): never {
  console.error(`    ❌ ${msg}`)
  process.exit(1)
}

async function runReminderLogic(
  subId: string,
  emailType: 'renewal' | 'trialEnd',
  stepLabel: string,
) {
  const sub = await prisma.subscription.findUniqueOrThrow({
    where: { id: subId },
    include: {
      client: { select: { name: true, firstName: true } },
      plan:   { select: { name: true, price: true } },
      user:   { select: { id: true, name: true, subscriptionSettings: true } },
    },
  })

  if (!sub.clientEmail || !sub.nextBilling) fail('clientEmail ou nextBilling absent')

  info(`status=${sub.status}  nextBilling=${sub.nextBilling.toLocaleString('fr-DZ')}`)

  const settings    = sub.user.subscriptionSettings
  const lang        = (settings?.emailLanguage ?? 'fr') as EmailLang
  const template    = getTemplate(
    (settings?.emailTemplates ?? null) as TemplatesByLang | null,
    emailType,
    lang,
  )
  const clientName  = [sub.client.firstName, sub.client.name].filter(Boolean).join(' ') || sub.client.name
  const amount      = Number(sub.plan.price)

  const { subject, html } = renderEmail({
    template,
    lang,
    data: { clientName, planName: sub.plan.name, companyName: sub.user.name ?? 'YelhaERP', amount, expiresAt: sub.nextBilling },
    settings: { whatsapp: settings?.whatsapp ?? null, ccpNumber: settings?.ccpNumber ?? null, chargilyCheckoutUrl: null },
  })

  info(`Sujet : "${subject}"`)
  info(`Destinataire : ${sub.clientEmail}`)

  const result = await sendEmail({ to: sub.clientEmail, subject, html })
  if (!result || ('error' in result && result.error)) {
    fail(`Envoi échoué : ${JSON.stringify('error' in result ? result.error : result)}`)
  }
  ok(`Email envoyé ! id Resend: ${'data' in result ? result.data?.id : '—'}`)

  // Marquer comme envoyé (anti-spam)
  const updateData = emailType === 'trialEnd'
    ? { lastTrialEndReminderAt: new Date() }
    : { lastRenewalReminderAt: new Date() }
  await prisma.subscription.update({ where: { id: subId }, data: updateData })
  ok('Timestamp anti-spam mis à jour')
}

// ── main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('━'.repeat(60))
  console.log('  Test : flux d\'abonnement E2E (5 emails)')
  console.log(`  Email cible : ${TARGET_EMAIL}`)
  console.log('━'.repeat(60))

  // ── 1. Trouver l'utilisateur ──────────────────────────────────────────────
  step('1', 'Recherche du compte utilisateur YelhaERP…')
  const user = await prisma.user.findFirst({
    where: { email: TARGET_EMAIL },
    include: { subscriptionSettings: true },
  })
  if (!user) fail(`Aucun compte trouvé pour ${TARGET_EMAIL}`)
  ok(`Compte trouvé — id: ${user.id}  nom: ${user.name ?? '(sans nom)'}`)

  // ── 2. Créer un plan de test ──────────────────────────────────────────────
  step('2', 'Création du plan d\'abonnement de test…')
  const plan = await prisma.subscriptionPlan.create({
    data: {
      userId: user.id, name: '[TEST] Plan Mensuel',
      description: 'Plan de test — supprimé après le script',
      price: 1500, currency: 'DZD', interval: 'MONTHLY', intervalCount: 1,
      trialDays: 7, features: ['Accès illimité', 'Support email'], isActive: true,
    },
  })
  ok(`Plan créé — id: ${plan.id}  prix: ${plan.price} DA  trial: ${plan.trialDays}j`)

  // ── 3. Créer un client de test ────────────────────────────────────────────
  step('3', 'Création du client de test…')
  const client = await prisma.client.create({
    data: { userId: user.id, name: 'Mehdi', firstName: 'Cevek', email: TARGET_EMAIL, clientType: 'INDIVIDUAL' },
  })
  ok(`Client créé — id: ${client.id}`)

  // ── 4. Créer l'abonnement en TRIAL ────────────────────────────────────────
  step('4', 'Création de l\'abonnement en TRIAL (7 jours)…')
  const trialEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  const sub = await prisma.subscription.create({
    data: {
      userId: user.id, clientId: client.id, planId: plan.id,
      status: 'TRIAL', startDate: new Date(), nextBilling: trialEnd,
      clientEmail: TARGET_EMAIL,
    },
  })
  ok(`Abonnement créé — id: ${sub.id}  nextBilling: ${trialEnd.toLocaleDateString('fr-DZ')}`)

  // ── 4b. Email de bienvenue ────────────────────────────────────────────────
  step('4b', 'Envoi de l\'email de bienvenue (activation abonnement)…')
  await sendWelcomeEmail(sub.id)
  ok('Email de bienvenue envoyé → vérifiez votre boîte mail')

  // ── 4c. Rappel fin d'essai J-1 (TRIAL) ───────────────────────────────────
  step('4c', 'Simulation J-1 fin d\'essai (TRIAL) → envoi rappel trialEnd…')
  const trialJ1 = new Date(Date.now() + 23 * 60 * 60 * 1000)
  await prisma.subscription.update({ where: { id: sub.id }, data: { nextBilling: trialJ1 } })
  ok(`nextBilling → ${trialJ1.toLocaleString('fr-DZ')} (dans 23h, status toujours TRIAL)`)
  await runReminderLogic(sub.id, 'trialEnd', '4c')

  // ── 5. Simuler la fin d'essai → EXPIRED ──────────────────────────────────
  step('5', 'Simulation fin d\'essai → status EXPIRED…')
  await prisma.subscription.update({
    where: { id: sub.id },
    data: { nextBilling: new Date(Date.now() - 60 * 60 * 1000), status: 'EXPIRED' },
  })
  ok('status → EXPIRED')

  // ── 6. Activer l'abonnement → ACTIVE ─────────────────────────────────────
  step('6', 'Activation → status ACTIVE (30 jours)…')
  const nextRenewal = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  await prisma.subscription.update({
    where: { id: sub.id },
    data: { status: 'ACTIVE', startDate: new Date(), nextBilling: nextRenewal, lastTrialEndReminderAt: null },
  })
  ok(`status → ACTIVE  nextBilling: ${nextRenewal.toLocaleDateString('fr-DZ')}`)

  // ── 7. Simuler J-1 renouvellement (ACTIVE) ───────────────────────────────
  step('7', 'Simulation J-1 renouvellement (ACTIVE) → nextBilling = +23h…')
  const renewalJ1 = new Date(Date.now() + 23 * 60 * 60 * 1000)
  await prisma.subscription.update({ where: { id: sub.id }, data: { nextBilling: renewalJ1 } })
  ok(`nextBilling → ${renewalJ1.toLocaleString('fr-DZ')}`)

  // ── 8. Rappel renouvellement J-1 (ACTIVE) ────────────────────────────────
  step('8', 'Envoi rappel de renouvellement J-1 (ACTIVE)…')
  await runReminderLogic(sub.id, 'renewal', '8')

  // ── 9. Nettoyage ──────────────────────────────────────────────────────────
  if (KEEP) {
    step('9', 'Nettoyage ignoré (--keep passé)')
    info(`Sub: ${sub.id}  Client: ${client.id}  Plan: ${plan.id}`)
  } else {
    step('9', 'Nettoyage des données de test…')
    await prisma.subscription.delete({ where: { id: sub.id } })
    ok('Abonnement supprimé')
    await prisma.client.delete({ where: { id: client.id } })
    ok('Client supprimé')
    await prisma.subscriptionPlan.delete({ where: { id: plan.id } })
    ok('Plan supprimé')
  }

  console.log('\n' + '━'.repeat(60))
  console.log('  ✅ Tous les tests ont réussi ! (3 emails envoyés)')
  console.log('  📬 Vérifiez cevekmehdi@gmail.com :')
  console.log('     1. Email de bienvenue / activation')
  console.log('     2. Rappel fin d\'essai (J-1 TRIAL)')
  console.log('     3. Rappel renouvellement (J-1 ACTIVE)')
  console.log('━'.repeat(60) + '\n')
}

main()
  .catch(e => {
    console.error('\n🛑 Erreur fatale :', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
