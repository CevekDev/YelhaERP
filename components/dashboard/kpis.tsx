import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, AlertCircle, Package, CreditCard, FileCheck, Receipt } from 'lucide-react'
import { formatDA } from '@/lib/algerian/format'
import Link from 'next/link'

interface KPIsProps {
  monthRevenue: number
  unpaidTotal: number
  unpaidCount: number
  lowStockCount: number
  pendingQuotes?: number
  pendingExpenses?: number
}

export function DashboardKPIs({
  monthRevenue,
  unpaidTotal,
  unpaidCount,
  lowStockCount,
  pendingQuotes = 0,
  pendingExpenses = 0,
}: KPIsProps) {
  const allKpis = [
    {
      title: 'CA du mois',
      value: formatDA(monthRevenue),
      numericValue: monthRevenue,
      icon: TrendingUp,
      color: 'text-yelha-600',
      bg: 'bg-yelha-50',
      href: '/dashboard/invoices',
    },
    {
      title: 'Impayés',
      value: formatDA(unpaidTotal),
      sub: `${unpaidCount} facture${unpaidCount > 1 ? 's' : ''}`,
      numericValue: unpaidTotal,
      icon: CreditCard,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      href: '/dashboard/invoices',
    },
    {
      title: 'Devis en attente',
      value: String(pendingQuotes),
      sub: 'Réponse client attendue',
      numericValue: pendingQuotes,
      icon: FileCheck,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      href: '/dashboard/quotes',
    },
    {
      title: 'Stock en alerte',
      value: String(lowStockCount),
      sub: 'Produit(s) sous le seuil',
      numericValue: lowStockCount,
      icon: Package,
      color: 'text-red-600',
      bg: 'bg-red-50',
      href: '/dashboard/stock',
    },
    {
      title: 'Dépenses à valider',
      value: String(pendingExpenses),
      sub: "En attente d'approbation",
      numericValue: pendingExpenses,
      icon: Receipt,
      color: 'text-orange-600',
      bg: 'bg-orange-50',
      href: '/dashboard/expenses',
    },
    {
      title: 'Rappels fiscaux',
      value: 'G50',
      sub: 'Avant le 20 du mois',
      numericValue: undefined,
      icon: AlertCircle,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      href: '/dashboard/tax',
    },
  ]

  const kpis = allKpis.filter(k => k.numericValue === undefined || k.numericValue > 0)

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
      {kpis.map((kpi) => (
        <Link key={kpi.title} href={kpi.href} className="block">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-xs font-medium text-muted-foreground leading-tight">{kpi.title}</CardTitle>
              <div className={`p-1.5 rounded-lg ${kpi.bg}`}>
                <kpi.icon className={`h-3.5 w-3.5 ${kpi.color}`} />
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-xl font-bold da-amount">{kpi.value}</p>
              {'sub' in kpi && kpi.sub && <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">{kpi.sub}</p>}
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  )
}
