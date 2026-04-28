import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Header } from '@/components/layout/header'
import { DashboardKPIs } from '@/components/dashboard/kpis'
import { RecentInvoices } from '@/components/dashboard/recent-invoices'
import { RevenueChart } from '@/components/dashboard/revenue-chart'
import { RevenueComparisonChart } from '@/components/dashboard/revenue-comparison-chart'
import { TopClientsChart } from '@/components/dashboard/top-clients-chart'
import { CAAlertBanner } from '@/components/dashboard/ca-alert-banner'
import { TaxReminders } from '@/components/dashboard/tax-reminders'

export const dynamic = 'force-dynamic'

async function getDashboardData(companyId: string) {
  const now = new Date()
  const year = now.getFullYear()
  const startOfMonth = new Date(year, now.getMonth(), 1)
  const startOf6months = new Date(year, now.getMonth() - 5, 1)
  const startOfYear = new Date(year, 0, 1)
  const startOfLastYear = new Date(year - 1, 0, 1)
  const endOfLastYearSameDay = new Date(year - 1, now.getMonth(), now.getDate())

  const [
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
  ] = await Promise.all([
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
    // Stock en alerte (stock_qty <= stock_alert)
    prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*)::int as count FROM "Product"
      WHERE company_id = ${companyId} AND is_active = true AND stock_qty <= stock_alert AND stock_alert > 0
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
      SELECT TO_CHAR(issue_date, 'YYYY-MM') as month, SUM(total)::float as total
      FROM "Invoice"
      WHERE company_id = ${companyId} AND status = 'PAID' AND issue_date >= ${startOf6months}
      GROUP BY month ORDER BY month
    `,
    // CA mois par mois année courante
    prisma.$queryRaw<{ month: string; total: number }[]>`
      SELECT TO_CHAR(issue_date, 'YYYY-MM') as month, SUM(total)::float as total
      FROM "Invoice"
      WHERE company_id = ${companyId} AND status = 'PAID' AND issue_date >= ${startOfYear}
      GROUP BY month ORDER BY month
    `,
    // CA mois par mois année précédente
    prisma.$queryRaw<{ month: string; total: number }[]>`
      SELECT TO_CHAR(issue_date, 'YYYY-MM') as month, SUM(total)::float as total
      FROM "Invoice"
      WHERE company_id = ${companyId} AND status = 'PAID' AND issue_date >= ${startOfLastYear} AND issue_date < ${startOfYear}
      GROUP BY month ORDER BY month
    `,
    // Top 5 clients
    prisma.$queryRaw<{ clientName: string; total: number }[]>`
      SELECT c.name as "clientName", SUM(i.total)::float as total
      FROM "Invoice" i
      JOIN "Client" c ON i.client_id = c.id
      WHERE i.company_id = ${companyId} AND i.status = 'PAID'
        AND i.issue_date >= ${startOfYear}
      GROUP BY c.id, c.name
      ORDER BY total DESC
      LIMIT 5
    `,
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
  ])

  return {
    monthRevenue, unpaidInvoices, lowStockCount, recentInvoices, monthlyRevenue,
    currentYearMonthly, lastYearMonthly, topClients, year,
    currentYTD: Number(currentYTD._sum.total ?? 0),
    lastYearYTD: Number(lastYearYTD._sum.total ?? 0),
    pendingQuotes, pendingExpenses,
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
      monthRevenue: { _sum: { total: 0 } },
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
    }
  }

  return (
    <div>
      <Header title="Tableau de bord" />
      <div className="p-6 space-y-6">
        {/* CA Alert Banner */}
        <CAAlertBanner currentYTD={data.currentYTD} lastYearYTD={data.lastYearYTD} />

        {/* KPIs */}
        <DashboardKPIs
          monthRevenue={Number(data.monthRevenue._sum.total ?? 0)}
          unpaidTotal={Number(data.unpaidInvoices._sum.total ?? 0)}
          unpaidCount={data.unpaidInvoices._count}
          lowStockCount={data.lowStockCount as number}
          pendingQuotes={data.pendingQuotes}
          pendingExpenses={data.pendingExpenses}
        />

        {/* Charts row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <RevenueChart data={data.monthlyRevenue} />
          </div>
          <div>
            <TaxReminders companyId={session.user.companyId} />
          </div>
        </div>

        {/* Charts row 2 */}
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
