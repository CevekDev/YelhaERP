import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { apiError, apiSuccess } from '@/lib/security/api-response'
import { verifyCronSecret } from '@/lib/security/cron-auth'
import { sendTrialExpired, sendTrialReminder, sendYelhaRenewalReminder } from '@/lib/email/resend'
import type { BillingCycle } from '@prisma/client'
import { PLANS, type PlanId } from '@/lib/pricing/config'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  if (!verifyCronSecret(req)) return apiError('Non autorisé', 401)

  const now = new Date()
  const counts = { expired: 0, reminders: 0, renewals: 0, renewalReminders: 0 }

  // 1. Mark expired trials
  const expiredTrials = await prisma.yelhaSubscription.findMany({
    where: { status: 'TRIAL', trialEndsAt: { lt: now } },
    include: { user: true },
  })
  for (const sub of expiredTrials) {
    await prisma.yelhaSubscription.update({
      where: { id: sub.id },
      data: { status: 'EXPIRED' },
    })
    await sendTrialExpired({ to: sub.user.email, name: sub.user.name }).catch(() => {})
    counts.expired++
  }

  // 2. Trial reminders (7 days, 3 days and 1 day before expiry)
  for (const daysLeft of [7, 3, 1]) {
    const targetDate = new Date(now)
    targetDate.setDate(targetDate.getDate() + daysLeft)
    const dayStart = new Date(targetDate); dayStart.setHours(0, 0, 0, 0)
    const dayEnd   = new Date(targetDate); dayEnd.setHours(23, 59, 59, 999)

    const subs = await prisma.yelhaSubscription.findMany({
      where: { status: 'TRIAL', trialEndsAt: { gte: dayStart, lte: dayEnd } },
      include: { user: true },
    })
    for (const sub of subs) {
      await sendTrialReminder({
        to: sub.user.email,
        name: sub.user.name,
        daysLeft,
        trialEndsAt: sub.trialEndsAt ?? new Date(),
      }).catch(() => {})
      counts.reminders++
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
      include: { user: true },
    })

    for (const sub of activeSubs) {
      const plan = PLANS[sub.planId as PlanId]
      if (!plan) continue

      await sendYelhaRenewalReminder({
        to: sub.user.email,
        name: sub.user.name ?? sub.user.email,
        planName: plan.name,
        amount: sub.monthlyAmount,
        billingCycle: sub.billingCycle as BillingCycle,
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

  // 5. Flag accounts expired for >30 days (return count in response, no deletion)
  const thirtyDaysAgo = new Date(now)
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const stale = await prisma.yelhaSubscription.count({
    where: { status: 'EXPIRED', updatedAt: { lt: thirtyDaysAgo } },
  })

  return apiSuccess({ processed: counts, staleAccounts: stale, renewalReminders: counts.renewalReminders })
}
