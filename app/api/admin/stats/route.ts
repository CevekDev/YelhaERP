import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSuperAdmin } from '@/lib/security/tenant'
import { apiError, apiSuccess, rateLimitResponse } from '@/lib/security/api-response'
import { rateLimit, AUTHENTICATED_RATE_LIMIT } from '@/lib/security/ratelimit'

export async function GET(req: NextRequest) {
  const { success, reset } = await rateLimit(req, AUTHENTICATED_RATE_LIMIT)
  if (!success) return rateLimitResponse(reset)
  try {
    await requireSuperAdmin(req)

    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const [
      totalUsers,
      newUsersThisMonth,
      subByStatus,
      mrr,
      recentPayments,
      paidThisMonth,
    ] = await Promise.all([
      prisma.user.count({ where: { isSuperAdmin: false } }),
      prisma.user.count({ where: { isSuperAdmin: false, createdAt: { gte: startOfMonth } } }),
      prisma.yelhaSubscription.groupBy({ by: ['status'], _count: { id: true } }),
      prisma.yelhaSubscription.aggregate({ where: { status: 'ACTIVE' }, _sum: { monthlyAmount: true } }),
      prisma.yelhaPayment.findMany({
        where: { status: { in: ['PAID', 'SUCCEEDED'] } },
        take: 15,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, amount: true, planId: true, method: true, status: true,
          paidAt: true, createdAt: true,
          subscription: { select: { user: { select: { id: true, name: true } } } },
        },
      }),
      prisma.yelhaPayment.aggregate({
        where: { status: { in: ['PAID', 'SUCCEEDED'] }, paidAt: { gte: startOfMonth } },
        _sum: { amount: true },
        _count: { id: true },
      }),
    ])

    const statusMap: Record<string, number> = {}
    for (const s of subByStatus) statusMap[s.status] = s._count.id

    return apiSuccess({
      companies: {
        total: totalUsers,
        newThisMonth: newUsersThisMonth,
        byStatus: {
          trial: statusMap['TRIAL'] ?? 0,
          active: statusMap['ACTIVE'] ?? 0,
          paused: statusMap['PAUSED'] ?? 0,
          cancelled: statusMap['CANCELLED'] ?? 0,
          expired: statusMap['EXPIRED'] ?? 0,
          pastDue: statusMap['PAST_DUE'] ?? 0,
        },
      },
      users: { total: totalUsers },
      revenue: {
        mrr: mrr._sum.monthlyAmount ?? 0,
        thisMonth: paidThisMonth._sum.amount ?? 0,
        paymentsThisMonth: paidThisMonth._count.id ?? 0,
        pendingPayments: 0,
      },
      recentPayments: recentPayments.map(p => ({
        ...p,
        paidAt: p.paidAt ? p.paidAt.toISOString() : null,
        createdAt: p.createdAt.toISOString(),
      })),
    })
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'UNAUTHORIZED') return apiError('Non authentifié', 401)
    if (e instanceof Error && e.message === 'FORBIDDEN') return apiError('Accès refusé', 403)
    return apiError('Erreur serveur', 500)
  }
}
