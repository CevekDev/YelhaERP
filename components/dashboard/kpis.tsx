import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, AlertCircle, Package, CreditCard } from 'lucide-react'
import { formatDA } from '@/lib/algerian/format'

interface KPIsProps {
  monthRevenue: number
  unpaidTotal: number
  unpaidCount: number
  lowStockCount: number
}

export function DashboardKPIs({ monthRevenue, unpaidTotal, unpaidCount, lowStockCount }: KPIsProps) {
  const kpis = [
    {
      title: 'CA du mois',
      value: formatDA(monthRevenue),
      icon: TrendingUp,
      color: 'text-yelha-600',
      bg: 'bg-yelha-50',
    },
    {
      title: 'Impayés',
      value: formatDA(unpaidTotal),
      sub: `${unpaidCount} facture${unpaidCount > 1 ? 's' : ''}`,
      icon: CreditCard,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    },
    {
      title: 'Stock en alerte',
      value: String(lowStockCount),
      sub: lowStockCount > 0 ? 'Produit(s) sous le seuil' : 'Tout est OK',
      icon: Package,
      color: lowStockCount > 0 ? 'text-red-600' : 'text-yelha-600',
      bg: lowStockCount > 0 ? 'bg-red-50' : 'bg-yelha-50',
    },
    {
      title: 'Rappels fiscaux',
      value: 'G50',
      sub: 'Avant le 20 du mois',
      icon: AlertCircle,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {kpis.map((kpi) => (
        <Card key={kpi.title}>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">{kpi.title}</CardTitle>
            <div className={`p-2 rounded-lg ${kpi.bg}`}>
              <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold da-amount">{kpi.value}</p>
            {kpi.sub && <p className="text-xs text-muted-foreground mt-1">{kpi.sub}</p>}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
