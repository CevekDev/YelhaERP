import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTenantContext } from '@/lib/security/tenant'
import { apiSuccess, apiError, rateLimitResponse } from '@/lib/security/api-response'
import { rateLimit, AUTHENTICATED_RATE_LIMIT } from '@/lib/security/ratelimit'

export async function GET(req: NextRequest) {
  const { success, reset } = await rateLimit(req, AUTHENTICATED_RATE_LIMIT)
  if (!success) return rateLimitResponse(reset)
  try {
    const ctx = await getTenantContext()
    const { userId } = ctx

    const now = new Date()
    const in7d = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const [
      byStatus,
      mrrData,
      upcomingRenewals,
      trialExpiring,
      recentSubs,
      newThisMonth,
      cancelledThisMonth,
    ] = await Promise.all([
      prisma.subscription.groupBy({
        by: ['status'],
        where: { userId },
        _count: { id: true },
      }),
      prisma.subscription.findMany({
        where: { userId, status: 'ACTIVE' },
        include: { plan: { select: { price: true } } },
      }),
      prisma.subscription.findMany({
        where: { userId, status: 'ACTIVE', nextBilling: { gte: now, lte: in7d } },
        include: {
          client: { select: { name: true, firstName: true } },
          plan: { select: { name: true, price: true } },
        },
        orderBy: { nextBilling: 'asc' },
        take: 10,
      }),
      prisma.subscription.findMany({
        where: { userId, status: 'TRIAL', nextBilling: { gte: now, lte: in7d } },
        include: {
          client: { select: { name: true, firstName: true } },
          plan: { select: { name: true, price: true } },
        },
        orderBy: { nextBilling: 'asc' },
        take: 10,
      }),
      prisma.subscription.findMany({
        where: { userId },
        include: {
          client: { select: { name: true, firstName: true } },
          plan: { select: { name: true, price: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      prisma.subscription.count({
        where: { userId, createdAt: { gte: startOfMonth } },
      }),
      prisma.subscription.count({
        where: { userId, status: 'CANCELLED', cancelledAt: { gte: startOfMonth } },
      }),
    ])

    const statusMap: Record<string, number> = {}
    for (const s of byStatus) statusMap[s.status] = s._count.id

    const mrr = mrrData.reduce((sum, s) => sum + Number(s.plan.price), 0)
    const totalActive = statusMap['ACTIVE'] ?? 0
    const total = Object.values(statusMap).reduce((a, b) => a + b, 0)

    return apiSuccess({
      byStatus: {
        active: statusMap['ACTIVE'] ?? 0,
        trial: statusMap['TRIAL'] ?? 0,
        paused: statusMap['PAUSED'] ?? 0,
        cancelled: statusMap['CANCELLED'] ?? 0,
        expired: statusMap['EXPIRED'] ?? 0,
        pending: statusMap['PENDING'] ?? 0,
      },
      total,
      mrr,
      arpu: totalActive > 0 ? Math.round(mrr / totalActive) : 0,
      newThisMonth,
      cancelledThisMonth,
      upcomingRenewals: upcomingRenewals.map(s => ({
        id: s.id,
        clientName: [s.client.firstName, s.client.name].filter(Boolean).join(' '),
        planName: s.plan.name,
        price: Number(s.plan.price),
        nextBilling: s.nextBilling,
        status: s.status,
      })),
      trialExpiring: trialExpiring.map(s => ({
        id: s.id,
        clientName: [s.client.firstName, s.client.name].filter(Boolean).join(' '),
        planName: s.plan.name,
        price: Number(s.plan.price),
        nextBilling: s.nextBilling,
        status: s.status,
      })),
      recentSubs: recentSubs.map(s => ({
        id: s.id,
        clientName: [s.client.firstName, s.client.name].filter(Boolean).join(' '),
        planName: s.plan.name,
        price: Number(s.plan.price),
        status: s.status,
        createdAt: s.createdAt,
      })),
    })
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'UNAUTHORIZED') return apiError('Non authentifié', 401)
    if (e instanceof Error && e.message === 'FORBIDDEN') return apiError('Accès refusé', 403)
    return apiError('Erreur serveur', 500, e)
  }
}
