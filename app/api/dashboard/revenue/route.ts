import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTenantContext } from '@/lib/security/tenant'
import { apiSuccess, apiError } from '@/lib/security/api-response'

export const dynamic = 'force-dynamic'

type Period = 'day' | 'week' | 'month' | '3months' | '6months' | '1year' | '2years' | '3years'

interface PeriodConfig {
  days: number
  granularity: 'hour' | 'day' | 'week' | 'month'
  label: string
  previousLabel: string
}

const PERIODS: Record<Period, PeriodConfig> = {
  day:       { days: 1,    granularity: 'hour',  label: "Aujourd'hui",        previousLabel: 'Hier' },
  week:      { days: 7,    granularity: 'day',   label: '7 derniers jours',   previousLabel: '7 jours précédents' },
  month:     { days: 30,   granularity: 'day',   label: '30 derniers jours',  previousLabel: '30 jours précédents' },
  '3months': { days: 90,   granularity: 'week',  label: '3 derniers mois',    previousLabel: '3 mois précédents' },
  '6months': { days: 180,  granularity: 'week',  label: '6 derniers mois',    previousLabel: '6 mois précédents' },
  '1year':   { days: 365,  granularity: 'month', label: '1 an',               previousLabel: 'Année précédente' },
  '2years':  { days: 730,  granularity: 'month', label: '2 ans',              previousLabel: '2 ans précédents' },
  '3years':  { days: 1095, granularity: 'month', label: '3 ans',              previousLabel: '3 ans précédents' },
}

function dateFormat(g: PeriodConfig['granularity']): string {
  switch (g) {
    case 'hour':  return 'YYYY-MM-DD HH24:00'
    case 'day':   return 'YYYY-MM-DD'
    case 'week':  return 'YYYY-"W"IW'
    case 'month': return 'YYYY-MM'
  }
}

function dateTrunc(g: PeriodConfig['granularity']): string {
  switch (g) {
    case 'hour':  return 'hour'
    case 'day':   return 'day'
    case 'week':  return 'week'
    case 'month': return 'month'
  }
}

export async function GET(req: NextRequest) {
  try {
    const ctx = await getTenantContext()
    if (!ctx) return apiError('Non autorisé', 401)

    const periodParam = (new URL(req.url).searchParams.get('period') ?? 'month') as Period
    const config = PERIODS[periodParam]
    if (!config) return apiError('Période invalide', 400)

    const now = new Date()
    const currentStart = new Date(now.getTime() - config.days * 24 * 60 * 60 * 1000)
    const previousStart = new Date(currentStart.getTime() - config.days * 24 * 60 * 60 * 1000)

    const fmt = dateFormat(config.granularity)
    const trunc = dateTrunc(config.granularity)

    const [currentAgg, previousAgg, chartRows, activeSubs] = await Promise.all([
      prisma.invoice.aggregate({
        where: {
          companyId: ctx.companyId,
          status: 'PAID',
          issueDate: { gte: currentStart, lte: now },
        },
        _sum: { total: true },
        _count: true,
      }).catch(() => ({ _sum: { total: 0 }, _count: 0 })),

      prisma.invoice.aggregate({
        where: {
          companyId: ctx.companyId,
          status: 'PAID',
          issueDate: { gte: previousStart, lt: currentStart },
        },
        _sum: { total: true },
        _count: true,
      }).catch(() => ({ _sum: { total: 0 }, _count: 0 })),

      prisma.$queryRawUnsafe<{ label: string; total: number }[]>(
        `SELECT TO_CHAR(DATE_TRUNC('${trunc}', "issueDate"), '${fmt}') as label,
                SUM(total)::float as total
         FROM "Invoice"
         WHERE "companyId" = $1 AND status = 'PAID' AND "issueDate" >= $2 AND "issueDate" <= $3
         GROUP BY label
         ORDER BY label`,
        ctx.companyId, currentStart, now,
      ).catch(() => [] as { label: string; total: number }[]),

      // Abonnements actifs pour estimer le CA recurrent
      prisma.subscription.findMany({
        where: { companyId: ctx.companyId, status: 'ACTIVE' },
        include: { plan: { select: { price: true, interval: true, intervalCount: true } } },
      }).catch(() => []),
    ])

    // MRR normalisé mensuel (somme des plans actifs ramenés en équivalent mois)
    const mrr = activeSubs.reduce((sum, sub) => {
      const price = Number(sub.plan.price)
      const count = sub.plan.intervalCount || 1
      switch (sub.plan.interval) {
        case 'DAILY':     return sum + (price * 30) / count
        case 'WEEKLY':    return sum + (price * 30 / 7) / count
        case 'MONTHLY':   return sum + price / count
        case 'QUARTERLY': return sum + price / (3 * count)
        case 'YEARLY':    return sum + price / (12 * count)
        default:          return sum + price
      }
    }, 0)

    // CA abonnements estimé sur la période = MRR × (jours / 30)
    const periodMonths = config.days / 30
    const subsRevenue = mrr * periodMonths

    const invoiceCurrent  = Number(currentAgg._sum.total ?? 0)
    const invoicePrevious = Number(previousAgg._sum.total ?? 0)

    // Pour la période précédente on suppose le même MRR (on n'a pas l'historique des statuts)
    const current  = invoiceCurrent  + subsRevenue
    const previous = invoicePrevious + subsRevenue
    const delta = previous > 0 ? ((current - previous) / previous) * 100 : (current > 0 ? 100 : 0)

    return apiSuccess({
      period: periodParam,
      label: config.label,
      previousLabel: config.previousLabel,
      current,
      previous,
      delta: Number(delta.toFixed(1)),
      currentCount: currentAgg._count,
      previousCount: previousAgg._count,
      chart: chartRows,
      granularity: config.granularity,
      breakdown: {
        invoiceCurrent,
        invoicePrevious,
        subsRevenue: Math.round(subsRevenue),
        activeSubsCount: activeSubs.length,
      },
    })
  } catch (e) {
    console.error('Dashboard revenue API error:', e)
    return apiError('Erreur serveur', 500)
  }
}
