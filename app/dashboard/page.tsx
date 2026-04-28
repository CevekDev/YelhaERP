import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Header } from '@/components/layout/header'
import { DashboardKPIs } from '@/components/dashboard/kpis'
import { RecentInvoices } from '@/components/dashboard/recent-invoices'
import { RevenueChart } from '@/components/dashboard/revenue-chart'
import { TaxReminders } from '@/components/dashboard/tax-reminders'

export const dynamic = 'force-dynamic'

async function getDashboardData(companyId: string) {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const startOf6months = new Date(now.getFullYear(), now.getMonth() - 5, 1)

  const [
    monthRevenue,
    unpaidInvoices,
    lowStockCount,
    recentInvoices,
    monthlyRevenue,
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
      WHERE company_id = ${companyId} AND is_active = true AND stock_qty <= stock_alert
    `.then(r => Number(r[0]?.count ?? 0)),
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
  ])

  return { monthRevenue, unpaidInvoices, lowStockCount, recentInvoices, monthlyRevenue }
}

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const data = await getDashboardData(session.user.companyId)

  return (
    <div>
      <Header title="Tableau de bord" />
      <div className="p-6 space-y-6">
        <DashboardKPIs
          monthRevenue={Number(data.monthRevenue._sum.total ?? 0)}
          unpaidTotal={Number(data.unpaidInvoices._sum.total ?? 0)}
          unpaidCount={data.unpaidInvoices._count}
          lowStockCount={data.lowStockCount as number}
        />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <RevenueChart data={data.monthlyRevenue} />
          </div>
          <div>
            <TaxReminders companyId={session.user.companyId} />
          </div>
        </div>
        <RecentInvoices invoices={data.recentInvoices} />
      </div>
    </div>
  )
}
