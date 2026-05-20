'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { formatDA } from '@/lib/algerian/format'
import { Plus } from 'lucide-react'

/* ── Types ── */
interface StatsData {
  byStatus: { active: number; trial: number; paused: number; cancelled: number; expired: number; pending: number }
  total: number; mrr: number; arpu: number; newThisMonth: number; cancelledThisMonth: number
  upcomingRenewals: UpcomingSub[]
  trialExpiring: UpcomingSub[]
  recentSubs: RecentSub[]
}
interface UpcomingSub { id: string; clientName: string; planName: string; price: number; nextBilling: string; status: string }
interface RecentSub   { id: string; clientName: string; planName: string; price: number; status: string; createdAt: string }

function daysUntil(d: string) { return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000) }
function initials(n: string)  { return n.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2) }
function daysLabel(days: number) {
  if (days <= 0) return "aujourd'hui"
  if (days === 1) return 'demain'
  if (days < 7)  return `dans ${days} jours`
  return `dans ${Math.round(days / 7)} sem.`
}

export default function OverviewPage() {
  const [data, setData] = useState<StatsData | null>(null)

  useEffect(() => {
    fetch('/api/subscriptions/stats')
      .then(r => r.json())
      .then(d => setData(d.data ?? d))
  }, [])

  const rows = data ? [...(data.upcomingRenewals ?? []), ...(data.trialExpiring ?? [])].slice(0, 8) : []
  const churnRate = data && data.total > 0
    ? ((data.cancelledThisMonth / data.total) * 100).toFixed(1)
    : '0.0'

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-white">Abonnements</h1>
          <p className="text-sm text-white/40 mt-0.5">
            {data
              ? `${data.byStatus.active} actifs · ${data.upcomingRenewals.length} à renouveler cette semaine`
              : 'Chargement…'}
          </p>
        </div>
        <Link
          href="/dashboard/subscriptions/new"
          className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white font-medium px-4 py-2 rounded-lg text-sm transition-colors"
        >
          <Plus className="w-4 h-4" /> Nouveau
        </Link>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-3 gap-4">
        <KpiCard
          label="MRR"
          value={data ? formatDA(data.mrr) : '—'}
          trend={data ? `+${data.newThisMonth} ce mois` : ''}
          trendUp
        />
        <KpiCard
          label="Actifs"
          value={data ? String(data.byStatus.active) : '—'}
          trend={data ? `+${data.newThisMonth}` : ''}
          trendUp
        />
        <KpiCard
          label="Churn"
          value={data ? `${churnRate}%` : '—'}
          trend={data ? `-${data.cancelledThisMonth} ce mois` : ''}
          trendUp={false}
        />
      </div>

      {/* Upcoming renewals list */}
      <div className="rounded-xl border border-white/[0.07] overflow-hidden">
        {rows.length === 0 && !data && (
          <div className="py-16 text-center">
            <div className="w-8 h-8 border-2 border-white/20 border-t-emerald-400 rounded-full animate-spin mx-auto" />
          </div>
        )}
        {rows.length === 0 && data && (
          <div className="py-16 text-center text-sm text-white/30">
            Aucun renouvellement à venir cette semaine
          </div>
        )}
        {rows.map((s, i) => {
          const days = s.nextBilling ? daysUntil(s.nextBilling) : null
          return (
            <Link
              key={s.id}
              href="/dashboard/subscriptions"
              className={`flex items-center gap-4 px-5 py-3.5 hover:bg-white/[0.03] transition-colors ${i !== 0 ? 'border-t border-white/[0.05]' : ''}`}
            >
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-[11px] font-semibold shrink-0 text-white/60">
                {initials(s.clientName)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white/90 truncate">{s.clientName}</p>
                <p className="text-[12px] text-white/35 truncate">{s.planName}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-semibold text-white">{formatDA(s.price)}</p>
                {days !== null && (
                  <p className={`text-[11px] ${days <= 1 ? 'text-rose-400' : 'text-white/35'}`}>
                    {daysLabel(days)}
                  </p>
                )}
              </div>
            </Link>
          )
        })}
      </div>

      {/* Secondary stats */}
      {data && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatPill label="En essai"  value={data.byStatus.trial}   color="text-blue-400" />
          <StatPill label="Pausés"    value={data.byStatus.paused}  color="text-amber-400" />
          <StatPill label="Expirés"   value={data.byStatus.expired} color="text-white/30" />
          <StatPill label="Total"     value={data.total}            color="text-white/60" />
        </div>
      )}
    </div>
  )
}

function KpiCard({ label, value, trend, trendUp }: { label: string; value: string; trend: string; trendUp: boolean }) {
  return (
    <div className="bg-white/[0.03] border border-white/[0.07] rounded-xl p-5">
      <p className="text-[11px] font-semibold text-white/35 uppercase tracking-widest mb-3">{label}</p>
      <p className="text-2xl font-bold tracking-tight text-white">{value}</p>
      {trend && (
        <p className={`text-[12px] mt-1.5 font-medium ${trendUp ? 'text-emerald-400' : 'text-rose-400'}`}>
          {trend}
        </p>
      )}
    </div>
  )
}

function StatPill({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl px-4 py-3">
      <p className={`text-xl font-bold ${color}`}>{value}</p>
      <p className="text-[11px] text-white/30 mt-0.5">{label}</p>
    </div>
  )
}
