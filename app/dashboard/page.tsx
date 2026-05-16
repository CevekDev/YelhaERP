import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Header } from '@/components/layout/header'
import { DashboardKPIs } from '@/components/dashboard/kpis'
import { EnterpriseKPIs } from '@/components/dashboard/enterprise-kpis'
import { SubscriptionsKPIs } from '@/components/dashboard/subscriptions-kpis'
import { RecentInvoices } from '@/components/dashboard/recent-invoices'
import { RevenuePanel } from '@/components/dashboard/revenue-panel'
import { RevenueComparisonChart } from '@/components/dashboard/revenue-comparison-chart'
import { TopClientsChart } from '@/components/dashboard/top-clients-chart'
import { CAAlertBanner } from '@/components/dashboard/ca-alert-banner'

export const dynamic = 'force-dynamic'

async function getDashboardData(companyId: string) {
  const now = new Date()
  const year = now.getFullYear()
  const dayOfWeek = now.getDay() === 0 ? 6 : now.getDay() - 1 // Monday = 0
  const startOfWeek = new Date(now)
  startOfWeek.setDate(now.getDate() - dayOfWeek)
  startOfWeek.setHours(0, 0, 0, 0)
  const startOfMonth = new Date(year, now.getMonth(), 1)
  const startOf6months = new Date(year, now.getMonth() - 5, 1)
  const startOfYear = new Date(year, 0, 1)
  const startOfLastYear = new Date(year - 1, 0, 1)
  const endOfLastYearSameDay = new Date(year - 1, now.getMonth(), now.getDate())

  // Fetch active AppSubscriptions to know which modules to show
  const activeAppSubs = await prisma.appSubscription.findMany({
    where: { companyId, status: 'ACTIVE', currentPeriodEnd: { gte: now } },
    select: { appId: true },
  })
  const activeApps = activeAppSubs.map(s => s.appId)

  // Affiche les KPIs abonnements si l'app est active, ou s'il y a au moins un abonnement OU un plan
  const hasAppSubscriptions = activeApps.includes('subscriptions')
  const [hasAnySubscription, hasAnyPlan] = await Promise.all([
    prisma.subscription.count({ where: { companyId } }).catch(() => 0),
    prisma.subscriptionPlan.count({ where: { companyId } }).catch(() => 0),
  ])
  const hasSubscriptionsApp = hasAppSubscriptions || hasAnySubscription > 0 || hasAnyPlan > 0

  const in30days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

  const [
    weekRevenue,
    monthRevenue,
    unpaidInvoices,
    lowStockCount,
    recentInvoices,
    monthlyRevenue,
    currentYearMonthly,
    lastYearMonthly,
    topClients,
    currentYTD,
    lastYearYTD,
    pendingQuotes,
    pendingExpenses,
    crmLeads,
    purchaseOrders,
    productionOrders,
    leaveRequests,
    activeProjects,
    unmatchedInvoices,
    subsActiveCount,
    subsActiveForRevenue,
    subsUpcoming30d,
    subsForChart,
  ] = await Promise.all([
    // CA cette semaine
    prisma.invoice.aggregate({
      where: { companyId, status: 'PAID', issueDate: { gte: startOfWeek } },
      _sum: { total: true },
    }),
    // CA du mois
    prisma.invoice.aggregate({
      where: { companyId, status: 'PAID', issueDate: { gte: startOfMonth } },
      _sum: { total: true },
    }),
    // Factures impayées
    prisma.invoice.aggregate({
      where: { companyId, status: { in: ['SENT', 'OVERDUE', 'PARTIAL'] } },
      _sum: { total: true },
      _count: true,
    }),
    // Stock en alerte
    prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*)::int as count FROM "Product"
      WHERE "companyId" = ${companyId} AND "isActive" = true AND "stockQty" <= "stockAlert" AND "stockAlert" > 0
    `.then(r => Number(r[0]?.count ?? 0)).catch(() => 0),
    // 5 dernières factures
    prisma.invoice.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { client: { select: { name: true } } },
    }),
    // CA 6 derniers mois
    prisma.$queryRaw<{ month: string; total: number }[]>`
      SELECT TO_CHAR("issueDate", 'YYYY-MM') as month, SUM(total)::float as total
      FROM "Invoice"
      WHERE "companyId" = ${companyId} AND status = 'PAID' AND "issueDate" >= ${startOf6months}
      GROUP BY month ORDER BY month
    `.catch(() => [] as { month: string; total: number }[]),
    // CA mois par mois année courante
    prisma.$queryRaw<{ month: string; total: number }[]>`
      SELECT TO_CHAR("issueDate", 'YYYY-MM') as month, SUM(total)::float as total
      FROM "Invoice"
      WHERE "companyId" = ${companyId} AND status = 'PAID' AND "issueDate" >= ${startOfYear}
      GROUP BY month ORDER BY month
    `.catch(() => [] as { month: string; total: number }[]),
    // CA mois par mois année précédente
    prisma.$queryRaw<{ month: string; total: number }[]>`
      SELECT TO_CHAR("issueDate", 'YYYY-MM') as month, SUM(total)::float as total
      FROM "Invoice"
      WHERE "companyId" = ${companyId} AND status = 'PAID' AND "issueDate" >= ${startOfLastYear} AND "issueDate" < ${startOfYear}
      GROUP BY month ORDER BY month
    `.catch(() => [] as { month: string; total: number }[]),
    // Top 5 clients
    prisma.$queryRaw<{ clientName: string; total: number }[]>`
      SELECT c.name as "clientName", SUM(i.total)::float as total
      FROM "Invoice" i
      JOIN "Client" c ON i."clientId" = c.id
      WHERE i."companyId" = ${companyId} AND i.status = 'PAID'
        AND i."issueDate" >= ${startOfYear}
      GROUP BY c.id, c.name
      ORDER BY total DESC
      LIMIT 5
    `.catch(() => [] as { clientName: string; total: number }[]),
    // CA YTD (year-to-date)
    prisma.invoice.aggregate({
      where: { companyId, status: 'PAID', issueDate: { gte: startOfYear } },
      _sum: { total: true },
    }),
    // CA même période an dernier
    prisma.invoice.aggregate({
      where: { companyId, status: 'PAID', issueDate: { gte: startOfLastYear, lte: endOfLastYearSameDay } },
      _sum: { total: true },
    }),
    // Devis en attente
    prisma.quote.count({ where: { companyId, status: 'SENT' } }),
    // Dépenses en attente d'approbation
    prisma.expense.count({ where: { companyId, status: 'PENDING' } }),
    // Leads CRM actifs (hors WON/LOST)
    prisma.lead.count({ where: { companyId, stage: { notIn: ['WON', 'LOST'] } } }).catch(() => 0),
    // Bons de commande en cours
    prisma.purchaseOrder.count({ where: { companyId, status: { in: ['DRAFT', 'SUBMITTED', 'APPROVED', 'PARTIALLY_RECEIVED'] } } }).catch(() => 0),
    // Ordres de fabrication en production
    prisma.productionOrder.count({ where: { companyId, status: 'IN_PROGRESS' } }).catch(() => 0),
    // Congés en attente de validation
    prisma.leaveRequest.count({ where: { companyId, status: 'PENDING' } }).catch(() => 0),
    // Projets actifs
    prisma.project.count({ where: { companyId, status: 'ACTIVE' } }).catch(() => 0),
    // Factures fournisseurs en attente
    prisma.supplierInvoice.count({ where: { companyId, status: 'PENDING' } }).catch(() => 0),
    // Abonnements clients (module subscriptions)
    hasSubscriptionsApp ? prisma.subscription.count({ where: { companyId, status: 'ACTIVE' } }).catch(() => 0) : Promise.resolve(0),
    // Pour le CA actuel (MRR normalisé mensuel) : on récupère les abonnements actifs + plans
    hasSubscriptionsApp
      ? prisma.subscription.findMany({
          where: { companyId, status: 'ACTIVE' },
          include: { plan: { select: { price: true, interval: true, intervalCount: true } } },
        }).catch(() => [])
      : Promise.resolve([]),
    // Pour le CA à venir (30 prochains jours) : abonnements actifs dont nextBilling tombe dans les 30j
    hasSubscriptionsApp
      ? prisma.subscription.findMany({
          where: {
            companyId,
            status: { in: ['ACTIVE', 'TRIAL'] },
            nextBilling: { gte: now, lte: in30days },
          },
          include: { plan: { select: { price: true } } },
        }).catch(() => [])
      : Promise.resolve([]),
    // Tous les abonnements (hors CANCELLED) pour calculer la contribution mensuelle CA des 2 dernières années
    hasSubscriptionsApp
      ? prisma.subscription.findMany({
          where: { companyId },
          select: {
            startDate: true, cancelledAt: true, status: true,
            plan: { select: { price: true, interval: true, intervalCount: true } },
          },
        }).catch(() => [])
      : Promise.resolve([]),
  ])

  // Helper : contribution mensuelle (DA) d'un abonnement à un mois donné
  type SubForChart = {
    startDate: Date
    cancelledAt: Date | null
    status: string
    plan: { price: number | string; interval: string; intervalCount: number }
  }
  function monthlyContribution(sub: SubForChart, mStart: Date, mEnd: Date): number {
    if (sub.startDate > mEnd) return 0
    if (sub.cancelledAt && sub.cancelledAt < mStart) return 0
    const price = Number(sub.plan.price)
    const count = sub.plan.intervalCount || 1
    switch (sub.plan.interval) {
      case 'DAILY':     return (price * 30) / count
      case 'WEEKLY':    return (price * 30 / 7) / count
      case 'MONTHLY':   return price / count
      case 'QUARTERLY': return price / (3 * count)
      case 'YEARLY':    return price / (12 * count)
      default:          return price
    }
  }

  // Pour chaque mois courant et précédent, ajoute la contribution abonnements aux montants factures
  function monthlySubsTotal(yearOffset: number, monthIndex: number): number {
    const mStart = new Date(year + yearOffset, monthIndex, 1)
    const mEnd = new Date(year + yearOffset, monthIndex + 1, 0, 23, 59, 59)
    return (subsForChart as SubForChart[]).reduce((s, sub) => s + monthlyContribution(sub, mStart, mEnd), 0)
  }

  // Enrichit currentYearMonthly et lastYearMonthly avec le CA abonnements
  const mergeMonthly = (rows: { month: string; total: number }[], yearOffset: number) => {
    const merged = new Map<string, number>()
    for (const r of rows) merged.set(r.month, Number(r.total))
    for (let i = 0; i < 12; i++) {
      const monthKey = `${year + yearOffset}-${String(i + 1).padStart(2, '0')}`
      const subs = monthlySubsTotal(yearOffset, i)
      if (subs > 0) merged.set(monthKey, (merged.get(monthKey) ?? 0) + subs)
    }
    return Array.from(merged.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, total]) => ({ month, total: Math.round(total) }))
  }

  const enrichedCurrentYearMonthly = mergeMonthly(currentYearMonthly as { month: string; total: number }[], 0)
  const enrichedLastYearMonthly = mergeMonthly(lastYearMonthly as { month: string; total: number }[], -1)

  // Calcul MRR normalisé mensuel
  const subsCurrentRevenue = (subsActiveForRevenue as Array<{ plan: { price: number | string; interval: string; intervalCount: number } }>)
    .reduce((sum, sub) => {
      const price = Number(sub.plan.price)
      const count = sub.plan.intervalCount || 1
      // Normalisation : ramène tout en mensuel
      switch (sub.plan.interval) {
        case 'DAILY':     return sum + (price * 30) / count
        case 'WEEKLY':    return sum + (price * 30 / 7) / count
        case 'MONTHLY':   return sum + price / count
        case 'QUARTERLY': return sum + price / (3 * count)
        case 'YEARLY':    return sum + price / (12 * count)
        default:          return sum + price
      }
    }, 0)

  // Somme des paiements attendus dans les 30 prochains jours
  const subsUpcomingRevenue = (subsUpcoming30d as Array<{ plan: { price: number | string } }>)
    .reduce((sum, sub) => sum + Number(sub.plan.price), 0)

  return {
    weekRevenue: Number(weekRevenue._sum.total ?? 0),
    monthRevenue: Number(monthRevenue._sum.total ?? 0),
    unpaidInvoices, lowStockCount, recentInvoices, monthlyRevenue,
    currentYearMonthly: enrichedCurrentYearMonthly,
    lastYearMonthly: enrichedLastYearMonthly,
    topClients, year,
    currentYTD: Number(currentYTD._sum.total ?? 0),
    lastYearYTD: Number(lastYearYTD._sum.total ?? 0),
    pendingQuotes, pendingExpenses,
    crmLeads, purchaseOrders, productionOrders, leaveRequests, activeProjects, unmatchedInvoices,
    activeApps, hasSubscriptionsApp,
    subsActiveCount: subsActiveCount as number,
    subsCurrentRevenue: Math.round(subsCurrentRevenue),
    subsUpcomingRevenue: Math.round(subsUpcomingRevenue),
  }
}

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  if (!session.user.companyId) {
    console.error('Dashboard: no companyId in session', session.user)
    redirect('/onboarding')
  }

  let data
  try {
    data = await getDashboardData(session.user.companyId)
  } catch (e) {
    console.error('Dashboard getDashboardData error:', e)
    data = {
      weekRevenue: 0,
      monthRevenue: 0,
      unpaidInvoices: { _sum: { total: 0 }, _count: 0 },
      lowStockCount: 0,
      recentInvoices: [],
      monthlyRevenue: [],
      currentYearMonthly: [],
      lastYearMonthly: [],
      topClients: [],
      year: new Date().getFullYear(),
      currentYTD: 0,
      lastYearYTD: 0,
      pendingQuotes: 0,
      pendingExpenses: 0,
      crmLeads: 0, purchaseOrders: 0, productionOrders: 0,
      leaveRequests: 0, activeProjects: 0, unmatchedInvoices: 0,
      activeApps: [] as string[], hasSubscriptionsApp: false,
      subsActiveCount: 0, subsCurrentRevenue: 0, subsUpcomingRevenue: 0,
    }
  }

  return (
    <div>
      <Header title="Tableau de bord" />
      <div className="p-4 md:p-6 space-y-6">
        {/* CA Alert Banner */}
        <CAAlertBanner currentYTD={data.currentYTD} lastYearYTD={data.lastYearYTD} />

        {/* Panel CA flexible : période + comparaison + graphique */}
        <RevenuePanel />

        {/* Alertes : impayés, devis, stock, dépenses */}
        <DashboardKPIs
          unpaidTotal={Number(data.unpaidInvoices._sum.total ?? 0)}
          unpaidCount={data.unpaidInvoices._count}
          lowStockCount={data.lowStockCount as number}
          pendingQuotes={data.pendingQuotes}
          pendingExpenses={data.pendingExpenses}
        />

        {/* Abonnements clients — si l'app est active ou s'il y a des abonnements */}
        {data.hasSubscriptionsApp && (
          <SubscriptionsKPIs
            activeCount={data.subsActiveCount}
            currentRevenue={data.subsCurrentRevenue}
            upcomingRevenue={data.subsUpcomingRevenue}
          />
        )}

        {/* KPIs modules enterprise — filtrés par apps actives */}
        <EnterpriseKPIs
          crmLeads={data.crmLeads as number}
          purchaseOrders={data.purchaseOrders as number}
          productionOrders={data.productionOrders as number}
          leaveRequests={data.leaveRequests as number}
          activeProjects={data.activeProjects as number}
          unmatchedInvoices={data.unmatchedInvoices as number}
          activeApps={data.activeApps as string[]}
        />

        {/* Comparaison année courante vs année précédente + Top clients */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RevenueComparisonChart
            currentYear={data.currentYearMonthly}
            lastYear={data.lastYearMonthly}
            year={data.year}
          />
          <TopClientsChart data={data.topClients} />
        </div>

        {/* Recent invoices */}
        <RecentInvoices invoices={data.recentInvoices} />
      </div>
    </div>
  )
}
