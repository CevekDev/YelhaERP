'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Header } from '@/components/layout/header'
import { formatDA } from '@/lib/algerian/format'
import {
  TrendingUp, Users, Clock, AlertCircle, Plus,
  ArrowRight, RefreshCw, CheckCircle2, PauseCircle, XCircle,
} from 'lucide-react'

interface StatsData {
  byStatus: { active: number; trial: number; paused: number; cancelled: number; expired: number; pending: number }
  total: number
  mrr: number
  arpu: number
  newThisMonth: number
  cancelledThisMonth: number
  upcomingRenewals: UpcomingSub[]
  trialExpiring: UpcomingSub[]
  recentSubs: RecentSub[]
}

interface UpcomingSub {
  id: string; clientName: string; planName: string; price: number; nextBilling: string; status: string
}
interface RecentSub {
  id: string; clientName: string; planName: string; price: number; status: string; createdAt: string
}

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-emerald-500',
  TRIAL: 'bg-blue-500',
  PAUSED: 'bg-amber-500',
  CANCELLED: 'bg-rose-500',
  EXPIRED: 'bg-slate-400',
  PENDING: 'bg-purple-500',
}
const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Actif', TRIAL: 'Essai', PAUSED: 'Pausé',
  CANCELLED: 'Annulé', EXPIRED: 'Expiré', PENDING: 'En attente',
}

function daysUntil(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000)
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('fr-DZ', { day: 'numeric', month: 'short' })
}

function initials(name: string) {
  return name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2)
}

export default function OverviewPage() {
  const [data, setData] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/subscriptions/stats')
      .then(r => r.json())
      .then(d => { setData(d.data ?? d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-white">
      <Header title="Vue d'ensemble" />

      <div className="pt-14 md:pt-0 px-4 md:px-8 py-8 max-w-7xl mx-auto space-y-8">

        {/* ── Top bar ── */}
        <div className="flex items-center justify-between pt-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Vue d&apos;ensemble</h1>
            <p className="text-sm text-white/40 mt-0.5">Toutes vos statistiques en un coup d&apos;œil</p>
          </div>
          <Link
            href="/dashboard/subscriptions/new"
            className="inline-flex items-center gap-2 bg-white text-[#0a0a0b] hover:bg-white/90 font-medium px-4 py-2 rounded-lg text-sm transition-colors"
          >
            <Plus className="w-4 h-4" /> Nouvel abonnement
          </Link>
        </div>

        {loading ? <LoadingSkeleton /> : data ? <Content data={data} /> : (
          <p className="text-white/40 text-sm">Impossible de charger les statistiques.</p>
        )}
      </div>
    </div>
  )
}

function Content({ data }: { data: StatsData }) {
  const total = data.total || 1

  return (
    <div className="space-y-6">
      {/* ── KPI row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          icon={<TrendingUp className="w-4 h-4 text-emerald-400" />}
          label="MRR"
          value={formatDA(data.mrr)}
          sub={`ARPU ${formatDA(data.arpu)}`}
          accent="emerald"
        />
        <KpiCard
          icon={<CheckCircle2 className="w-4 h-4 text-emerald-400" />}
          label="Actifs"
          value={String(data.byStatus.active)}
          sub={`+${data.newThisMonth} ce mois`}
          accent="emerald"
        />
        <KpiCard
          icon={<Clock className="w-4 h-4 text-blue-400" />}
          label="En essai"
          value={String(data.byStatus.trial)}
          sub="périodes d'essai"
          accent="blue"
        />
        <KpiCard
          icon={<AlertCircle className="w-4 h-4 text-amber-400" />}
          label="À renouveler"
          value={String(data.upcomingRenewals.length + data.trialExpiring.length)}
          sub="dans les 7 jours"
          accent="amber"
        />
      </div>

      {/* ── Middle row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Répartition */}
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5 space-y-4">
          <p className="text-xs font-semibold text-white/40 uppercase tracking-wider">Répartition</p>
          <div className="space-y-2.5">
            {[
              { key: 'active',    label: 'Actifs',         count: data.byStatus.active },
              { key: 'trial',     label: 'En essai',       count: data.byStatus.trial },
              { key: 'paused',    label: 'Pausés',         count: data.byStatus.paused },
              { key: 'pending',   label: 'En attente',     count: data.byStatus.pending },
              { key: 'cancelled', label: 'Annulés',        count: data.byStatus.cancelled },
              { key: 'expired',   label: 'Expirés',        count: data.byStatus.expired },
            ].filter(s => s.count > 0).map(s => (
              <div key={s.key}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-white/60">{s.label}</span>
                  <span className="font-medium">{s.count}</span>
                </div>
                <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                  <div
                    className={`h-full ${STATUS_COLORS[s.key.toUpperCase()] ?? 'bg-slate-400'} transition-all`}
                    style={{ width: `${Math.round((s.count / total) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="pt-2 border-t border-white/[0.06] flex justify-between text-xs text-white/40">
            <span>Total</span>
            <span className="font-semibold text-white">{data.total}</span>
          </div>
        </div>

        {/* Renouvellements à venir */}
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-white/40 uppercase tracking-wider">Renouvellements · 7j</p>
            <span className="text-xs text-emerald-400 font-medium">{data.upcomingRenewals.length}</span>
          </div>
          {data.upcomingRenewals.length === 0 ? (
            <p className="text-xs text-white/30 py-4 text-center">Aucun dans les 7 prochains jours</p>
          ) : (
            <div className="space-y-2">
              {data.upcomingRenewals.map(s => (
                <SubRow key={s.id} sub={s} />
              ))}
            </div>
          )}
          {data.upcomingRenewals.length > 0 && (
            <Link href="/dashboard/subscriptions?status=ACTIVE" className="flex items-center gap-1 text-xs text-white/40 hover:text-white transition-colors pt-1">
              Voir tous <ArrowRight className="w-3 h-3" />
            </Link>
          )}
        </div>

        {/* Essais expirant */}
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-white/40 uppercase tracking-wider">Essais expirant · 7j</p>
            <span className="text-xs text-blue-400 font-medium">{data.trialExpiring.length}</span>
          </div>
          {data.trialExpiring.length === 0 ? (
            <p className="text-xs text-white/30 py-4 text-center">Aucun essai n&apos;expire cette semaine</p>
          ) : (
            <div className="space-y-2">
              {data.trialExpiring.map(s => (
                <SubRow key={s.id} sub={s} accent="blue" />
              ))}
            </div>
          )}
          {data.trialExpiring.length > 0 && (
            <Link href="/dashboard/subscriptions?status=TRIAL" className="flex items-center gap-1 text-xs text-white/40 hover:text-white transition-colors pt-1">
              Voir tous <ArrowRight className="w-3 h-3" />
            </Link>
          )}
        </div>
      </div>

      {/* ── Recent ── */}
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <p className="text-xs font-semibold text-white/40 uppercase tracking-wider">Derniers abonnements</p>
          <Link href="/dashboard/subscriptions" className="flex items-center gap-1 text-xs text-white/40 hover:text-white transition-colors">
            Tous voir <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="divide-y divide-white/[0.04]">
          {data.recentSubs.length === 0 ? (
            <p className="text-xs text-white/30 py-8 text-center">Aucun abonnement encore</p>
          ) : data.recentSubs.map(s => (
            <Link key={s.id} href={`/dashboard/subscriptions`} className="flex items-center gap-4 px-5 py-3.5 hover:bg-white/[0.02] transition-colors">
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-[11px] font-semibold shrink-0">
                {initials(s.clientName)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{s.clientName}</p>
                <p className="text-xs text-white/40 truncate">{s.planName} · {fmtDate(s.createdAt)}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-semibold">{formatDA(s.price)}</p>
                <StatusBadge status={s.status} />
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* ── Quick actions ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pb-8">
        {[
          { href: '/dashboard/subscriptions/new',     label: 'Nouvel abonnement',  icon: Plus },
          { href: '/dashboard/subscriptions/plans',   label: 'Gérer les plans',    icon: Users },
          { href: '/dashboard/subscriptions',         label: 'Tous les abonnements', icon: RefreshCw },
          { href: '/dashboard/subscriptions/settings', label: 'Paramètres emails',  icon: AlertCircle },
        ].map(a => (
          <Link
            key={a.href}
            href={a.href}
            className="flex flex-col items-center gap-2 p-4 bg-white/[0.03] border border-white/[0.06] rounded-xl text-xs text-white/60 hover:bg-white/[0.06] hover:text-white transition-all text-center"
          >
            <a.icon className="w-5 h-5" />
            {a.label}
          </Link>
        ))}
      </div>
    </div>
  )
}

function KpiCard({ icon, label, value, sub, accent }: {
  icon: React.ReactNode; label: string; value: string; sub: string
  accent: 'emerald' | 'blue' | 'amber'
}) {
  const glows = { emerald: 'bg-emerald-500/10', blue: 'bg-blue-500/10', amber: 'bg-amber-500/10' }
  return (
    <div className={`relative overflow-hidden rounded-xl border border-white/[0.06] p-5 ${glows[accent]}`}>
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <p className="text-xs font-semibold text-white/40 uppercase tracking-wider">{label}</p>
      </div>
      <p className="text-2xl font-bold tracking-tight">{value}</p>
      <p className="text-xs text-white/40 mt-1">{sub}</p>
    </div>
  )
}

function SubRow({ sub, accent = 'emerald' }: { sub: UpcomingSub; accent?: string }) {
  const days = sub.nextBilling ? daysUntil(sub.nextBilling) : null
  const urgent = days !== null && days <= 1
  return (
    <div className="flex items-center gap-3">
      <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-semibold shrink-0">
        {initials(sub.clientName)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium truncate">{sub.clientName}</p>
        <p className="text-[10px] text-white/40 truncate">{sub.planName}</p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-xs font-semibold">{formatDA(sub.price)}</p>
        {days !== null && (
          <p className={`text-[10px] ${urgent ? 'text-rose-400' : 'text-white/40'}`}>
            {days === 0 ? "aujourd'hui" : `J-${days}`}
          </p>
        )}
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    ACTIVE: 'text-emerald-400', TRIAL: 'text-blue-400', PAUSED: 'text-amber-400',
    CANCELLED: 'text-rose-400', EXPIRED: 'text-white/30', PENDING: 'text-purple-400',
  }
  return <p className={`text-[10px] font-medium ${colors[status] ?? 'text-white/40'}`}>{STATUS_LABELS[status] ?? status}</p>
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 bg-white/[0.04] rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-48 bg-white/[0.04] rounded-xl" />
        ))}
      </div>
      <div className="h-64 bg-white/[0.04] rounded-xl" />
    </div>
  )
}
