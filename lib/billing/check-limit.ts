import { prisma } from '@/lib/prisma'

type LimitKey = 'emails' | 'apiRequests' | 'ai' | 'deliverers' | 'skus'

function getUsageField(key: LimitKey): string {
  switch (key) {
    case 'emails':      return 'usageEmails'
    case 'apiRequests': return 'usageApiReq'
    case 'ai':          return 'usageAiReq'
    default:            return ''
  }
}

function getLimitField(key: LimitKey): string {
  switch (key) {
    case 'emails':      return 'limitEmails'
    case 'apiRequests': return 'limitApiReq'
    case 'ai':          return 'limitAiReq'
    case 'deliverers':  return 'limitDeliverers'
    case 'skus':        return 'limitSkus'
  }
}

export async function checkLimit(
  companyId: string,
  key: LimitKey
): Promise<{ allowed: boolean; current: number; limit: number; remaining: number }> {
  const sub = await prisma.yelhaSubscription.findUnique({
    where: { companyId },
  })

  if (!sub) {
    // No subscription found — deny
    return { allowed: false, current: 0, limit: 0, remaining: 0 }
  }

  // Monthly reset: if usageResetAt is in a previous month, reset counters
  const now = new Date()
  const resetAt = new Date(sub.usageResetAt)
  const needsReset =
    resetAt.getFullYear() < now.getFullYear() ||
    resetAt.getMonth() < now.getMonth()

  if (needsReset) {
    await prisma.yelhaSubscription.update({
      where: { companyId },
      data: {
        usageEmails:  0,
        usageApiReq:  0,
        usageAiReq:   0,
        usageResetAt: new Date(now.getFullYear(), now.getMonth(), 1),
      },
    })
    // After reset, usage is 0
    const limitField = getLimitField(key)
    const limit = sub[limitField as keyof typeof sub] as number
    if (limit === -1) return { allowed: true, current: 0, limit: -1, remaining: Infinity }
    return { allowed: true, current: 0, limit, remaining: limit }
  }

  // Determine current usage (deliverers and skus have no usage counter — always check limit only)
  let current = 0
  const limitField = getLimitField(key)
  const limit = sub[limitField as keyof typeof sub] as number

  if (key === 'emails')      current = sub.usageEmails
  else if (key === 'apiRequests') current = sub.usageApiReq
  else if (key === 'ai')     current = sub.usageAiReq
  else current = 0 // deliverers and skus: usage not tracked in counters

  if (limit === -1) {
    return { allowed: true, current, limit: -1, remaining: Infinity }
  }

  const remaining = Math.max(0, limit - current)
  return { allowed: current < limit, current, limit, remaining }
}

export async function incrementUsage(
  companyId: string,
  key: 'emails' | 'apiRequests' | 'ai'
): Promise<void> {
  const field = getUsageField(key) as 'usageEmails' | 'usageApiReq' | 'usageAiReq'
  if (!field) return

  // Monthly reset check before incrementing
  const sub = await prisma.yelhaSubscription.findUnique({
    where: { companyId },
    select: { usageResetAt: true },
  })

  if (!sub) return

  const now = new Date()
  const resetAt = new Date(sub.usageResetAt)
  const needsReset =
    resetAt.getFullYear() < now.getFullYear() ||
    resetAt.getMonth() < now.getMonth()

  if (needsReset) {
    await prisma.yelhaSubscription.update({
      where: { companyId },
      data: {
        usageEmails:  0,
        usageApiReq:  0,
        usageAiReq:   0,
        usageResetAt: new Date(now.getFullYear(), now.getMonth(), 1),
        [field]: 1,
      },
    })
    return
  }

  await prisma.yelhaSubscription.update({
    where: { companyId },
    data: { [field]: { increment: 1 } },
  })
}
