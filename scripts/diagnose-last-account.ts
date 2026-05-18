import path from 'path'
import fs from 'fs'
import { PrismaClient } from '@prisma/client'

const envPath = path.resolve(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const idx = t.indexOf('=')
    if (idx === -1) continue
    const key = t.slice(0, idx).trim()
    const val = t.slice(idx + 1).trim().replace(/^["']|["']$/g, '')
    if (!process.env[key]) process.env[key] = val
  }
}

const prisma = new PrismaClient()

function fmtDate(d: Date | null | undefined) {
  if (!d) return '—'
  return new Date(d).toLocaleString('fr-DZ')
}

async function main() {
  const cleanup = process.argv.includes('--cleanup')

  const user = await prisma.user.findFirst({
    orderBy: { createdAt: 'desc' },
    include: {
      company: {
        include: {
          yelhaSubscription: { include: { payments: { orderBy: { createdAt: 'desc' } } } },
          appSubscriptions:  { include: { payments: { orderBy: { createdAt: 'desc' } } } },
        },
      },
    },
  })

  if (!user) {
    console.log('Aucun utilisateur trouvé.')
    return
  }

  console.log('═══════════════════════════════════════════════════════════════')
  console.log('DERNIER COMPTE INSCRIT')
  console.log('═══════════════════════════════════════════════════════════════')
  console.log(`User    : ${user.name} <${user.email}>`)
  console.log(`Role    : ${user.role}${user.isSuperAdmin ? ' (SUPER ADMIN)' : ''}`)
  console.log(`Inscrit : ${fmtDate(user.createdAt)}`)
  console.log(`Vérifié : ${user.emailVerified ? '✓' : '✗ (email non vérifié)'}`)
  console.log('')
  console.log(`Company : ${user.company.name} (${user.company.id})`)
  console.log(`Plan    : ${user.company.plan}   ← champ legacy Company.plan`)
  console.log(`Trial   : ${fmtDate(user.company.trialEndsAt)}`)
  console.log(`Banni   : ${user.company.isBanned ? 'OUI' : 'non'}`)
  console.log('')

  const ys = user.company.yelhaSubscription
  console.log('─── YelhaSubscription (ERP global) ───')
  if (!ys) {
    console.log('  AUCUN abonnement YelhaSubscription')
  } else {
    console.log(`  planId            : ${ys.planId}`)
    console.log(`  status            : ${ys.status}`)
    console.log(`  monthlyAmount     : ${ys.monthlyAmount} DA`)
    console.log(`  billingCycle      : ${ys.billingCycle}`)
    console.log(`  trialEndsAt       : ${fmtDate(ys.trialEndsAt)}`)
    console.log(`  currentPeriodEnd  : ${fmtDate(ys.currentPeriodEnd)}`)
    console.log(`  extraApps         : [${ys.extraApps.join(', ')}]`)
    console.log(`  trialApps         : [${ys.trialApps.join(', ')}]`)
    console.log(`  lastPaymentAt     : ${fmtDate(ys.lastPaymentAt)}`)
    console.log(`  lastPaymentRef    : ${ys.lastPaymentRef ?? '—'}`)
    console.log(`  chargilySubId     : ${ys.chargilySubId ?? '—'}`)

    console.log(`\n  YelhaPayment (${ys.payments.length}) :`)
    for (const p of ys.payments) {
      console.log(`    - ${p.planId.padEnd(10)} ${String(p.amount).padStart(6)} DA  ${p.method.padEnd(16)} ${p.status.padEnd(8)} ${fmtDate(p.createdAt)}`)
      console.log(`      id=${p.id}  paidAt=${fmtDate(p.paidAt)}  chargilyId=${p.chargilyId ?? '—'}`)
    }
    if (ys.payments.length === 0) console.log('    (aucun)')
  }

  console.log('')
  console.log('─── AppSubscription (par app) ───')
  if (user.company.appSubscriptions.length === 0) {
    console.log('  (aucune)')
  } else {
    for (const a of user.company.appSubscriptions) {
      console.log(`  ${a.appId} → planId=${a.planId} status=${a.status} monthlyAmount=${a.monthlyAmount} DA`)
      console.log(`    trialEndsAt=${fmtDate(a.trialEndsAt)} currentPeriodEnd=${fmtDate(a.currentPeriodEnd)}`)
      console.log(`    AppPayment (${a.payments.length}) :`)
      for (const p of a.payments) {
        console.log(`      - ${p.planId.padEnd(10)} ${String(p.amount).padStart(6)} DA  ${p.method.padEnd(16)} ${p.status.padEnd(8)} ${fmtDate(p.createdAt)}`)
      }
    }
  }

  console.log('')
  console.log('═══════════════════════════════════════════════════════════════')
  console.log('DIAGNOSTIC')
  console.log('═══════════════════════════════════════════════════════════════')

  const issues: string[] = []
  const suspectPayments: string[] = []

  if (ys) {
    if (ys.planId !== 'trial' || ys.status !== 'TRIAL' || ys.monthlyAmount !== 0) {
      issues.push(`Le YelhaSubscription n'est pas dans l'état trial attendu (planId=${ys.planId}, status=${ys.status}, monthlyAmount=${ys.monthlyAmount}).`)
    }
    for (const p of ys.payments) {
      if (p.status === 'PAID') {
        const src =
          p.method === 'ADMIN_ACTIVATE' ? 'admin "⚡ Activer" cliqué' :
          p.method === 'ADMIN_FREE'     ? 'admin "🎁 Offrir" cliqué' :
          p.method === 'CHARGILY'       ? 'webhook Chargily reçu (paiement réel ou simulé)' :
          p.method === 'CCP'            ? 'paiement CCP confirmé manuellement' :
          `méthode "${p.method}"`
        suspectPayments.push(`  → YelhaPayment ${p.id} (${p.planId}, ${p.amount} DA, ${p.method}, PAID le ${fmtDate(p.paidAt)})  ← origine : ${src}`)
      }
    }
  }

  if (issues.length === 0 && suspectPayments.length === 0) {
    console.log('✓ Le compte est dans l\'état trial attendu. Rien d\'anormal.')
  } else {
    if (issues.length > 0) {
      console.log('⚠ Anomalies :')
      for (const i of issues) console.log(`  - ${i}`)
    }
    if (suspectPayments.length > 0) {
      console.log('⚠ Paiements PAID inattendus pour un compte non payeur :')
      for (const s of suspectPayments) console.log(s)
    }
  }

  if (cleanup) {
    if (issues.length === 0 && suspectPayments.length === 0) {
      console.log('\nRien à nettoyer.')
    } else if (ys) {
      const trialEnd = new Date(Date.now() + 30 * 86400000)
      await prisma.$transaction([
        prisma.yelhaPayment.deleteMany({ where: { subscriptionId: ys.id } }),
        prisma.yelhaSubscription.update({
          where: { id: ys.id },
          data: {
            planId: 'trial',
            status: 'TRIAL',
            monthlyAmount: 0,
            extraApps: [],
            trialApps: [],
            trialEndsAt: trialEnd,
            currentPeriodStart: new Date(),
            currentPeriodEnd: trialEnd,
            lastPaymentAt: null,
            lastPaymentRef: null,
            chargilySubId: null,
            limitEmails: 50,
            limitApiReq: 500,
            limitDeliverers: 0,
            limitSkus: 50,
            limitAiReq: 15,
          },
        }),
        prisma.appSubscription.deleteMany({ where: { companyId: user.company.id } }),
        prisma.company.update({
          where: { id: user.company.id },
          data: { plan: 'TRIAL', trialEndsAt: trialEnd },
        }),
      ])
      console.log('\n✓ Compte remis à l\'état TRIAL propre (paiements YelhaPayment + AppSubscriptions supprimés, trial 30j).')
    }
  } else {
    console.log('\nPour remettre ce compte à TRIAL propre (supprime YelhaPayment + AppSubscription) :')
    console.log('  npx tsx scripts/diagnose-last-account.ts --cleanup')
  }
}

main().catch(console.error).finally(() => prisma.$disconnect())
