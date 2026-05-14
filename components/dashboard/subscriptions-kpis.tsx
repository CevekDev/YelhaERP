import Link from 'next/link'
import { RefreshCw, UserCheck, UserX, TrendingUp } from 'lucide-react'
import { formatDA } from '@/lib/algerian/format'

interface Props {
  activeCount: number
  newThisMonth: number
  cancelledThisMonth: number
  mrr: number
}

export function SubscriptionsKPIs({ activeCount, newThisMonth, cancelledThisMonth, mrr }: Props) {
  const tiles = [
    { label: 'Abonnements actifs',     value: activeCount,         href: '/dashboard/subscriptions',         icon: RefreshCw,  color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-950/30', isAmount: false },
    { label: 'Nouveaux ce mois',        value: newThisMonth,        href: '/dashboard/subscriptions',         icon: UserCheck,  color: 'text-blue-500',    bg: 'bg-blue-50 dark:bg-blue-950/30',       isAmount: false },
    { label: 'Résiliés ce mois',        value: cancelledThisMonth,  href: '/dashboard/subscriptions',         icon: UserX,      color: 'text-rose-500',    bg: 'bg-rose-50 dark:bg-rose-950/30',       isAmount: false },
    { label: 'MRR abonnements',         value: mrr,                 href: '/dashboard/subscriptions',         icon: TrendingUp, color: 'text-indigo-500',  bg: 'bg-indigo-50 dark:bg-indigo-950/30',   isAmount: true  },
  ]

  return (
    <div>
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Abonnements clients</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {tiles.map(t => (
          <Link key={t.label} href={t.href}
            className="border rounded-lg p-3 flex flex-col gap-2 hover:shadow-sm transition-shadow bg-card">
            <div className={`w-8 h-8 rounded-md flex items-center justify-center ${t.bg}`}>
              <t.icon className={`w-4 h-4 ${t.color}`} />
            </div>
            <div className="text-2xl font-bold tabular-nums">
              {t.isAmount ? formatDA(t.value) : t.value}
            </div>
            <div className="text-xs text-muted-foreground leading-tight">{t.label}</div>
          </Link>
        ))}
      </div>
    </div>
  )
}
