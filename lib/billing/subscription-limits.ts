import { prisma } from '@/lib/prisma'
import { PLANS, type PlanId } from '@/lib/pricing/config'

export async function checkSubscriptionLimit(userId: string, userPlan: string): Promise<{ allowed: boolean; limit: number; current: number }> {
  const plan = PLANS[userPlan.toLowerCase() as PlanId]
  const limit = plan?.maxSubscriptions ?? 20

  if (limit === -1) return { allowed: true, limit: -1, current: 0 }

  const current = await prisma.subscription.count({
    where: { userId, status: { in: ['ACTIVE', 'TRIAL'] } },
  })

  return { allowed: current < limit, limit, current }
}
