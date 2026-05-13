import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSuperAdmin } from '@/lib/security/tenant'
import { apiError, apiSuccess, rateLimitResponse } from '@/lib/security/api-response'
import { rateLimit, AUTHENTICATED_RATE_LIMIT } from '@/lib/security/ratelimit'

export async function GET(req: NextRequest) {
  const { success, reset } = await rateLimit(req, AUTHENTICATED_RATE_LIMIT)
  if (!success) return rateLimitResponse(reset)
  try {
    await requireSuperAdmin()

    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const [
      totalCompanies,
      newCompaniesThisMonth,
      totalUsers,
      subByStatus,
      mrr,
      recentPayments,
      paidPaymentsThisMonth,
      pendingPayments,
    ] = await Promise.all([
      prisma.company.count(),
      prisma.company.count({ where: { createdAt: { gte: startOfMonth } } }),
      prisma.user.count(),
      prisma.yelhaSubscription.groupBy({ by: ['status'], _count: { id: true } }),
      prisma.yelhaSubscription.aggregate({ where: { status: 'ACTIVE' }, _sum: { monthlyAmount: true } }),
      prisma.yelhaPayment.findMany({
        take: 15,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, amount: true, planId: true, method: true, status: true,
          paidAt: true, createdAt: true, ccpRef: true,
          subscription: { select: { company: { select: { id: true, name: true } } } },
        },
      }),
      prisma.yelhaPayment.aggregate({
        where: { status: { in: ['PAID', 'SUCCEEDED'] }, paidAt: { gte: startOfMonth } },
        _sum: { amount: true },
        _count: { id: true },
      }),
      prisma.yelhaPayment.count({ where: { status: 'PENDING' } }),
    ])

    const statusMap: Record<string, number> = {}
    for (const s of subByStatus) statusMap[s.status] = s._count.id

    return apiSuccess({
      companies: {
        total: totalCompanies,
        newThisMonth: newCompaniesThisMonth,
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
        thisMonth: paidPaymentsThisMonth._sum.amount ?? 0,
        paymentsThisMonth: paidPaymentsThisMonth._count.id ?? 0,
        pendingPayments,
      },
      recentPayments,
    })
  } catch (e: unknown) {
    if (e instanceof Error) {
      if (e.message === 'UNAUTHORIZED') return apiError('Non authentifié', 401)
      if (e.message === 'FORBIDDEN') return apiError('Accès refusé', 403)
    }
    return apiError('Erreur serveur', 500)
  }
}
