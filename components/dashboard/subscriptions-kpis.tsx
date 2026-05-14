import Link from 'next/link'
import { RefreshCw, UserCheck, UserX, TrendingUp, Activity } from 'lucide-react'
import { formatDA } from '@/lib/algerian/format'

interface Props {
  activeCount: number
  newThisMonth: number
  cancelledThisMonth: number
  mrr: number
}

export function SubscriptionsKPIs({ activeCount, newThisMonth, cancelledThisMonth, mrr }: Props) {
  const netNew = newThisMonth - cancelledThisMonth
  const churnRate = activeCount > 0 ? ((cancelledThisMonth / (activeCount + cancelledThisMonth)) * 100).toFixed(1) : '0.0'

  const tiles = [
    { label: 'Abonnés actifs',    value: String(activeCount),        icon: RefreshCw,  color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-950/30', isAmount: false },
    { label: 'Nouveaux ce mois',  value: String(newThisMonth),       icon: UserCheck,  color: 'text-blue-500',    bg: 'bg-blue-50 dark:bg-blue-950/30',       isAmount: false },
    { label: 'Résiliés ce mois',  value: String(cancelledThisMonth), icon: UserX,      color: 'text-rose-500',    bg: 'bg-rose-50 dark:bg-rose-950/30',       isAmount: false },
    { label: 'Net new ce mois',   value: (netNew >= 0 ? '+' : '') + netNew, icon: Activity,   color: netNew >= 0 ? 'text-emerald-500' : 'text-rose-500', bg: netNew >= 0 ? 'bg-emerald-50 dark:bg-emerald-950/30' : 'bg-rose-50 dark:bg-rose-950/30', isAmount: false },
    { label: 'MRR abonnements',   value: formatDA(mrr),              icon: TrendingUp, color: 'text-indigo-500',  bg: 'bg-indigo-50 dark:bg-indigo-950/30',   isAmount: false },
    { label: 'Taux de churn',     value: `${churnRate}%`,            icon: UserX,      color: 'text-amber-500',   bg: 'bg-amber-50 dark:bg-amber-950/30',     isAmount: false },
  ]

  return (
    <div>
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Abonnements clients</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {tiles.map(t => (
          <Link key={t.label} href="/dashboard/subscriptions"
            className="border rounded-lg p-3 flex flex-col gap-2 hover:shadow-sm transition-shadow bg-card">
            <div className={`w-8 h-8 rounded-md flex items-center justify-center ${t.bg}`}>
              <t.icon className={`w-4 h-4 ${t.color}`} />
            </div>
            <div className={`text-2xl font-bold tabular-nums ${t.label === 'Net new ce mois' ? (netNew >= 0 ? 'text-emerald-600' : 'text-rose-600') : ''}`}>
              {t.value}
            </div>
            <div className="text-xs text-muted-foreground leading-tight">{t.label}</div>
          </Link>
        ))}
      </div>
    </div>
  )
}
