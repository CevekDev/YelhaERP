import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { apiError, apiSuccess } from '@/lib/security/api-response'
import { sendAppRenewalReminder } from '@/lib/email/resend'
import { getAppPlanConfig } from '@/lib/pricing/app-plans'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const secret = req.headers.get('authorization')?.replace('Bearer ', '')
  if (secret !== process.env.CRON_SECRET) {
    return apiError('Non autorisé', 401)
  }

  const now = new Date()
  const counts = { reminders: 0, expired: 0 }

  // 1. Rappel 2 jours avant expiration
  const in2days = new Date(now)
  in2days.setDate(in2days.getDate() + 2)
  const dayStart = new Date(in2days); dayStart.setHours(0, 0, 0, 0)
  const dayEnd   = new Date(in2days); dayEnd.setHours(23, 59, 59, 999)

  const expiringSoon = await prisma.appSubscription.findMany({
    where: {
      status: 'ACTIVE',
      currentPeriodEnd: { gte: dayStart, lte: dayEnd },
    },
    include: {
      company: { include: { users: { where: { role: 'OWNER' }, take: 1 } } },
    },
  })

  for (const sub of expiringSoon) {
    const owner = sub.company.users[0]
    if (!owner) continue
    const appConfig = getAppPlanConfig(sub.appId)
    await sendAppRenewalReminder({
      to: owner.email,
      name: owner.name,
      appName: appConfig?.appName ?? sub.appId,
      planName: sub.planId,
      amount: sub.monthlyAmount,
      expiresAt: sub.currentPeriodEnd,
      appId: sub.appId,
    }).catch(() => {})
    counts.reminders++
  }

  // 2. Marquer expirées les AppSubscriptions ACTIVE dont la période est dépassée
  const expired = await prisma.appSubscription.findMany({
    where: { status: 'ACTIVE', currentPeriodEnd: { lt: now } },
  })
  for (const sub of expired) {
    await prisma.appSubscription.update({
      where: { id: sub.id },
      data: { status: 'EXPIRED' },
    })
    counts.expired++
  }

  // 3. Marquer expirées les AppSubscriptions TRIAL dont la période est dépassée
  const expiredTrials = await prisma.appSubscription.findMany({
    where: { status: 'TRIAL', currentPeriodEnd: { lt: now } },
  })
  for (const sub of expiredTrials) {
    await prisma.appSubscription.update({
      where: { id: sub.id },
      data: { status: 'EXPIRED' },
    })
    counts.expired++
  }

  return apiSuccess({ processed: counts })
}
