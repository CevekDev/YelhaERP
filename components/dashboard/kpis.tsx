import { TrendingUp, CreditCard, FileCheck, Package, Receipt, CalendarDays, Calendar } from 'lucide-react'
import { formatDA } from '@/lib/algerian/format'
import Link from 'next/link'

interface KPIsProps {
  weekRevenue: number
  monthRevenue: number
  yearRevenue: number
  unpaidTotal: number
  unpaidCount: number
  lowStockCount: number
  pendingQuotes?: number
  pendingExpenses?: number
}

export function DashboardKPIs({
  weekRevenue,
  monthRevenue,
  yearRevenue,
  unpaidTotal,
  unpaidCount,
  lowStockCount,
  pendingQuotes = 0,
  pendingExpenses = 0,
}: KPIsProps) {
  const caTiles = [
    {
      title: 'CA cette semaine',
      value: formatDA(weekRevenue),
      icon: CalendarDays,
      color: 'text-yelha-600',
      bg: 'bg-yelha-50 dark:bg-yelha-950/30',
      href: '/dashboard/invoices',
    },
    {
      title: 'CA ce mois',
      value: formatDA(monthRevenue),
      icon: TrendingUp,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50 dark:bg-emerald-950/30',
      href: '/dashboard/invoices',
    },
    {
      title: "CA cette année",
      value: formatDA(yearRevenue),
      icon: Calendar,
      color: 'text-blue-600',
      bg: 'bg-blue-50 dark:bg-blue-950/30',
      href: '/dashboard/invoices',
    },
  ]

  const alertTiles = [
    {
      show: unpaidTotal > 0,
      title: 'Impayés',
      value: formatDA(unpaidTotal),
      sub: `${unpaidCount} facture${unpaidCount > 1 ? 's' : ''}`,
      icon: CreditCard,
      color: 'text-amber-600',
      bg: 'bg-amber-50 dark:bg-amber-950/30',
      href: '/dashboard/invoices',
    },
    {
      show: pendingQuotes > 0,
      title: 'Devis en attente',
      value: String(pendingQuotes),
      sub: 'Réponse client attendue',
      icon: FileCheck,
      color: 'text-violet-600',
      bg: 'bg-violet-50 dark:bg-violet-950/30',
      href: '/dashboard/quotes',
    },
    {
      show: lowStockCount > 0,
      title: 'Stock en alerte',
      value: String(lowStockCount),
      sub: 'Produit(s) sous le seuil',
      icon: Package,
      color: 'text-red-600',
      bg: 'bg-red-50 dark:bg-red-950/30',
      href: '/dashboard/stock',
    },
    {
      show: pendingExpenses > 0,
      title: 'Dépenses à valider',
      value: String(pendingExpenses),
      sub: "En attente d'approbation",
      icon: Receipt,
      color: 'text-orange-600',
      bg: 'bg-orange-50 dark:bg-orange-950/30',
      href: '/dashboard/expenses',
    },
  ].filter(t => t.show)

  return (
    <div className="space-y-4">
      {/* CA : toujours affiché */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {caTiles.map(t => (
          <Link key={t.title} href={t.href} className="block">
            <div className="border rounded-xl p-4 bg-card hover:shadow-md transition-shadow flex items-center gap-4">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${t.bg}`}>
                <t.icon className={`w-5 h-5 ${t.color}`} />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">{t.title}</p>
                <p className="text-xl font-bold da-amount tabular-nums truncate">{t.value}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Alertes : uniquement si valeur > 0 */}
      {alertTiles.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {alertTiles.map(t => (
            <Link key={t.title} href={t.href} className="block">
              <div className="border rounded-lg p-3 bg-card hover:shadow-sm transition-shadow flex flex-col gap-2">
                <div className={`w-8 h-8 rounded-md flex items-center justify-center ${t.bg}`}>
                  <t.icon className={`w-4 h-4 ${t.color}`} />
                </div>
                <p className="text-2xl font-bold tabular-nums">{t.value}</p>
                <div>
                  <p className="text-xs font-medium">{t.title}</p>
                  {'sub' in t && <p className="text-[11px] text-muted-foreground leading-tight">{t.sub}</p>}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
