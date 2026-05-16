import Link from 'next/link'
import { Users, TrendingUp, CalendarClock } from 'lucide-react'
import { formatDA } from '@/lib/algerian/format'

interface Props {
  activeCount: number
  currentRevenue: number
  upcomingRevenue: number
}

export function SubscriptionsKPIs({ activeCount, currentRevenue, upcomingRevenue }: Props) {
  const tiles = [
    {
      label: 'Abonnés actifs',
      value: String(activeCount),
      icon: Users,
      color: 'text-emerald-500',
      bg:    'bg-emerald-50 dark:bg-emerald-950/30',
    },
    {
      label: 'Chiffre d\'affaires actuel',
      sub:   'par mois (MRR)',
      value: formatDA(currentRevenue),
      icon: TrendingUp,
      color: 'text-indigo-500',
      bg:    'bg-indigo-50 dark:bg-indigo-950/30',
    },
    {
      label: 'Chiffre d\'affaires à venir',
      sub:   'sur les 30 prochains jours',
      value: formatDA(upcomingRevenue),
      icon: CalendarClock,
      color: 'text-amber-500',
      bg:    'bg-amber-50 dark:bg-amber-950/30',
    },
  ]

  return (
    <div>
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
        Abonnements clients
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {tiles.map(t => (
          <Link
            key={t.label}
            href="/dashboard/subscriptions"
            className="border rounded-lg p-4 flex flex-col gap-2 hover:shadow-sm transition-shadow bg-card"
          >
            <div className={`w-8 h-8 rounded-md flex items-center justify-center ${t.bg}`}>
              <t.icon className={`w-4 h-4 ${t.color}`} />
            </div>
            <div className="text-2xl font-bold tabular-nums da-amount">{t.value}</div>
            <div className="text-xs text-muted-foreground leading-tight">
              {t.label}
              {t.sub && <span className="block text-[10px] opacity-70 mt-0.5">{t.sub}</span>}
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
