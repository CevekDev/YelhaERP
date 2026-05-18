import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { apiError, apiSuccess } from '@/lib/security/api-response'
import { verifyCronSecret } from '@/lib/security/cron-auth'
import { sendTrialExpired, sendTrialReminder, sendYelhaRenewalReminder } from '@/lib/email/resend'
import { PLANS, type PlanId } from '@/lib/pricing/config'

export const dynamic = 'force-dynamic'

function daysDiff(a: Date, b: Date): number {
  return Math.round((a.getTime() - b.getTime()) / 86400000)
}

export async function GET(req: NextRequest) {
  if (!verifyCronSecret(req)) return apiError('Non autorisé', 401)

  const now = new Date()
  const counts = { expired: 0, reminders: 0, renewals: 0, renewalReminders: 0 }

  // 1. Mark expired trials
  const expiredTrials = await prisma.yelhaSubscription.findMany({
    where: { status: 'TRIAL', trialEndsAt: { lt: now } },
    include: { company: { include: { users: { where: { role: 'OWNER' }, take: 1 } } } },
  })
  for (const sub of expiredTrials) {
    await prisma.yelhaSubscription.update({
      where: { id: sub.id },
      data: { status: 'EXPIRED' },
    })
    const owner = sub.company.users[0]
    if (owner) {
      await sendTrialExpired({ to: owner.email, name: owner.name }).catch(() => {})
    }
    counts.expired++
  }

  // 2. Trial reminders (7 days and 3 days before expiry)
  for (const daysLeft of [7, 3]) {
    const targetDate = new Date(now)
    targetDate.setDate(targetDate.getDate() + daysLeft)
    const dayStart = new Date(targetDate); dayStart.setHours(0, 0, 0, 0)
    const dayEnd   = new Date(targetDate); dayEnd.setHours(23, 59, 59, 999)

    const subs = await prisma.yelhaSubscription.findMany({
      where: { status: 'TRIAL', trialEndsAt: { gte: dayStart, lte: dayEnd } },
      include: { company: { include: { users: { where: { role: 'OWNER' }, take: 1 } } } },
    })
    for (const sub of subs) {
      const owner = sub.company.users[0]
      if (owner) {
        await sendTrialReminder({ to: owner.email, name: owner.name, daysLeft }).catch(() => {})
        counts.reminders++
      }
    }
  }

  // 3. Monthly renewals — find active subs where period has ended
  const dueSubs = await prisma.yelhaSubscription.findMany({
    where: { status: 'ACTIVE', currentPeriodEnd: { lt: now } },
  })
  for (const sub of dueSubs) {
    await prisma.yelhaSubscription.update({
      where: { id: sub.id },
      data: { status: 'PAST_DUE' },
    })
    counts.renewals++
  }

  // 4. Renewal reminders — J-3 and J-1 for ACTIVE subscriptions
  for (const daysLeft of [3, 1]) {
    const targetStart = new Date(now)
    targetStart.setDate(targetStart.getDate() + daysLeft)
    targetStart.setHours(0, 0, 0, 0)
    const targetEnd = new Date(targetStart)
    targetEnd.setHours(23, 59, 59, 999)

    const reminderField = daysLeft === 3 ? 'lastRenewalReminder3At' : 'lastRenewalReminder1At'

    const activeSubs = await prisma.yelhaSubscription.findMany({
      where: {
        status: 'ACTIVE',
        currentPeriodEnd: { gte: targetStart, lte: targetEnd },
        OR: [
          { [reminderField]: null },
          { [reminderField]: { lt: new Date(now.getTime() - 25 * 86400000) } },
        ],
      },
      include: { company: { include: { users: { where: { role: 'OWNER' }, take: 1 } } } },
    })

    for (const sub of activeSubs) {
      const owner = sub.company.users[0]
      if (!owner) continue
      const plan = PLANS[sub.planId as PlanId]
      if (!plan) continue

      await sendYelhaRenewalReminder({
        to: owner.email,
        name: owner.name ?? owner.email,
        planName: plan.name,
        amount: sub.monthlyAmount,
        expiresAt: sub.currentPeriodEnd,
        daysLeft,
      }).catch(() => {})

      await prisma.yelhaSubscription.update({
        where: { id: sub.id },
        data: { [reminderField]: now },
      })

      counts.renewalReminders++
    }
  }

  // 5. Flag accounts expired for >30 days (log only, no deletion)
  const thirtyDaysAgo = new Date(now)
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const stale = await prisma.yelhaSubscription.count({
    where: { status: 'EXPIRED', updatedAt: { lt: thirtyDaysAgo } },
  })
  if (stale > 0) {
    console.log(`[billing-cron] ${stale} comptes expirés depuis >30 jours — à traiter manuellement`)
  }

  return apiSuccess({ processed: counts, staleAccounts: stale, renewalReminders: counts.renewalReminders })
}
