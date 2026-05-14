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

    const now = new Date()

    const [
      totalCompanies,
      newCompaniesThisMonth,
      totalUsers,
      activeAppSubs,
      trialAppSubs,
      appSubMrr,
      recentAppPayments,
      appPaymentsThisMonth,
      legacySubByStatus,
      legacyMrr,
      recentLegacyPayments,
      legacyPaidThisMonth,
    ] = await Promise.all([
      prisma.company.count(),
      prisma.company.count({ where: { createdAt: { gte: startOfMonth } } }),
      prisma.user.count(),

      prisma.appSubscription.count({ where: { status: 'ACTIVE', currentPeriodEnd: { gte: now } } }),
      prisma.appSubscription.count({ where: { status: 'TRIAL', trialEndsAt: { gte: now } } }),
      prisma.appSubscription.aggregate({ where: { status: 'ACTIVE', currentPeriodEnd: { gte: now } }, _sum: { monthlyAmount: true } }),

      // Only PAID AppPayments
      prisma.appPayment.findMany({
        where: { status: 'PAID' },
        take: 15,
        orderBy: { createdAt: 'desc' },
        include: { appSubscription: { include: { company: { select: { id: true, name: true } } } } },
      }),
      prisma.appPayment.aggregate({
        where: { status: 'PAID', paidAt: { gte: startOfMonth } },
        _sum: { amount: true },
        _count: { id: true },
      }),

      // Legacy — only PAID
      prisma.yelhaSubscription.groupBy({ by: ['status'], _count: { id: true } }),
      prisma.yelhaSubscription.aggregate({ where: { status: 'ACTIVE' }, _sum: { monthlyAmount: true } }),
      prisma.yelhaPayment.findMany({
        where: { status: { in: ['PAID', 'SUCCEEDED'] } },
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, amount: true, planId: true, method: true, status: true,
          paidAt: true, createdAt: true,
          subscription: { select: { company: { select: { id: true, name: true } } } },
        },
      }),
      prisma.yelhaPayment.aggregate({
        where: { status: { in: ['PAID', 'SUCCEEDED'] }, paidAt: { gte: startOfMonth } },
        _sum: { amount: true },
        _count: { id: true },
      }),
    ])

    const legacyStatusMap: Record<string, number> = {}
    for (const s of legacySubByStatus) legacyStatusMap[s.status] = s._count.id

    const normalizedAppPayments = recentAppPayments.map(p => ({
      id: p.id,
      amount: p.amount,
      planId: `${p.appId} — ${p.planId}`,
      method: p.method,
      status: p.status,
      paidAt: p.paidAt?.toISOString() ?? null,
      createdAt: p.createdAt.toISOString(),
      subscription: p.appSubscription ? { company: p.appSubscription.company } : null,
    }))

    const normalizedLegacyPayments = recentLegacyPayments.map(p => ({
      ...p,
      paidAt: p.paidAt ? (p.paidAt as Date).toISOString() : null,
      createdAt: (p.createdAt as Date).toISOString(),
    }))

    const allRecentPayments = [...normalizedAppPayments, ...normalizedLegacyPayments]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 15)

    return apiSuccess({
      companies: {
        total: totalCompanies,
        newThisMonth: newCompaniesThisMonth,
        byStatus: {
          trial: trialAppSubs + (legacyStatusMap['TRIAL'] ?? 0),
          active: activeAppSubs + (legacyStatusMap['ACTIVE'] ?? 0),
          paused: legacyStatusMap['PAUSED'] ?? 0,
          cancelled: legacyStatusMap['CANCELLED'] ?? 0,
          expired: legacyStatusMap['EXPIRED'] ?? 0,
          pastDue: legacyStatusMap['PAST_DUE'] ?? 0,
        },
      },
      users: { total: totalUsers },
      revenue: {
        mrr: (appSubMrr._sum.monthlyAmount ?? 0) + (legacyMrr._sum.monthlyAmount ?? 0),
        thisMonth: (appPaymentsThisMonth._sum.amount ?? 0) + (legacyPaidThisMonth._sum.amount ?? 0),
        paymentsThisMonth: (appPaymentsThisMonth._count.id ?? 0) + (legacyPaidThisMonth._count.id ?? 0),
        pendingPayments: 0,
      },
      recentPayments: allRecentPayments,
    })
  } catch (e: unknown) {
    if (e instanceof Error) {
      if (e.message === 'UNAUTHORIZED') return apiError('Non authentifié', 401)
      if (e.message === 'FORBIDDEN') return apiError('Accès refusé', 403)
    }
    return apiError('Erreur serveur', 500)
  }
}
