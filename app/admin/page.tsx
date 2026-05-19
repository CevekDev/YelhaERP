'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import {
  ShieldAlert, BarChart3, Users, DollarSign,
  Search, Loader2, Save, Ban, Gift, Star,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

// ── Types ────────────────────────────────────────────────────

interface UserRow {
  id: string; name: string; email: string; plan: string; isBanned: boolean; isPartner: boolean; createdAt: string
  yelhaSubscription: { status: string; monthlyAmount: number } | null
}

interface Stats {
  companies: { total: number; newThisMonth: number; byStatus: Record<string, number> }
  users: { total: number }
  revenue: { mrr: number; thisMonth: number; paymentsThisMonth: number; pendingPayments: number }
  recentPayments: Array<{
    id: string; amount: number; planId: string; method: string; status: string
    paidAt: string | null; createdAt: string
    subscription: { user: { id: string; name: string } } | null
  }>
}

// Helper - on parle d'utilisateurs (= companies en DB pour le multi-tenant).
function labelUsers(n: number) {
  return n === 1 ? '1 utilisateur' : `${n} utilisateurs`
}

interface Pricing { plans: Record<string, number>; apps: Record<string, number> }

type Tab = 'stats' | 'users' | 'pricing'

// ── Helpers ────────────────────────────────────────────────────

function fmtDA(n: number) {
  return n.toLocaleString('fr-DZ', { maximumFractionDigits: 0 }) + ' DA'
}
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('fr-DZ', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ── Stats tab ──────────────────────────────────────────────────

function StatsTab() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/stats').then(r => r.json()).then(d => {
      setStats(d.data ?? d)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>
  if (!stats) return <p className="text-muted-foreground">Aucune donnée disponible.</p>

  const totalActive = (stats.companies.byStatus.active ?? 0)
  const totalTrial = (stats.companies.byStatus.trial ?? 0)
  const totalChurned = (stats.companies.byStatus.cancelled ?? 0) + (stats.companies.byStatus.expired ?? 0)
  const conversionRate = totalActive + totalTrial > 0
    ? Math.round((totalActive / (totalActive + totalTrial + totalChurned)) * 100)
    : 0
  const arpu = totalActive > 0 ? Math.round(stats.revenue.mrr / totalActive) : 0

  return (
    <div className="space-y-6">
      {/* KPI principaux */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Utilisateurs" value={stats.companies.total} sub={`+${stats.companies.newThisMonth} ce mois`} />
        <KpiCard label="MRR" value={fmtDA(stats.revenue.mrr)} sub={`${labelUsers(totalActive)} actifs`} />
        <KpiCard label="ARPU" value={fmtDA(arpu)} sub="Revenu moyen / utilisateur" />
        <KpiCard label="Encaissé ce mois" value={fmtDA(stats.revenue.thisMonth)} sub={`${stats.revenue.paymentsThisMonth} paiements`} />
      </div>

      {/* Répartition statuts */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="rounded-2xl border bg-card p-5">
          <h3 className="font-semibold text-foreground mb-4 text-sm">Répartition des comptes</h3>
          <div className="space-y-3">
            <StatusBar label="Actifs"    count={totalActive}                       total={stats.companies.total} color="bg-emerald-500" />
            <StatusBar label="Essai"     count={totalTrial}                        total={stats.companies.total} color="bg-blue-500" />
            <StatusBar label="En retard" count={stats.companies.byStatus.pastDue ?? 0} total={stats.companies.total} color="bg-amber-500" />
            <StatusBar label="Pause"     count={stats.companies.byStatus.paused ?? 0}  total={stats.companies.total} color="bg-slate-400" />
            <StatusBar label="Annulés"   count={stats.companies.byStatus.cancelled ?? 0} total={stats.companies.total} color="bg-rose-500" />
            <StatusBar label="Expirés"   count={stats.companies.byStatus.expired ?? 0} total={stats.companies.total} color="bg-rose-700" />
          </div>
        </div>

        <div className="rounded-2xl border bg-card p-5">
          <h3 className="font-semibold text-foreground mb-4 text-sm">Indicateurs</h3>
          <div className="space-y-3 text-sm">
            <MetricRow label="Taux de conversion (Trial → Actif)" value={`${conversionRate}%`} />
            <MetricRow label="Nouveaux comptes ce mois" value={String(stats.companies.newThisMonth)} />
            <MetricRow label="Paiements PENDING" value={String(stats.revenue.pendingPayments ?? 0)} />
            <MetricRow label="Total revenu cumulé" value={fmtDA(stats.revenue.thisMonth)} />
          </div>
        </div>
      </div>

      {/* Paiements récents */}
      <div className="rounded-2xl border bg-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-foreground text-sm">Paiements récents</h3>
          <span className="text-xs text-muted-foreground">{stats.recentPayments.length} derniers</span>
        </div>
        <div className="divide-y divide-border/40">
          {stats.recentPayments.length === 0 && (
            <p className="text-sm text-muted-foreground py-6 text-center">Aucun paiement enregistré pour l&apos;instant.</p>
          )}
          {stats.recentPayments.slice(0, 10).map(p => (
            <div key={p.id} className="flex items-center justify-between py-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground truncate">{p.subscription?.user.name ?? '—'}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{p.planId} · {p.method} · {fmtDate(p.paidAt ?? p.createdAt)}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-semibold text-foreground">{fmtDA(p.amount)}</p>
                <p className={`text-[11px] font-medium ${p.status === 'PAID' || p.status === 'SUCCEEDED' ? 'text-emerald-500' : 'text-amber-500'}`}>{p.status}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function StatusBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? (count / total) * 100 : 0
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium text-foreground">{count}</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={`h-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-border/40 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold text-foreground">{value}</span>
    </div>
  )
}

function KpiCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-2xl border bg-card p-4">
      <p className="text-xs text-muted-foreground font-medium uppercase">{label}</p>
      <p className="text-2xl font-black text-foreground mt-1">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  )
}

// ── Users tab ──────────────────────────────────────────────────

function UsersTab() {
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)

  const load = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), search })
    fetch(`/api/admin/companies?${params}`).then(r => r.json()).then(d => {
      setUsers(d.data?.companies ?? d.companies ?? [])
      setTotal(d.data?.total ?? d.total ?? 0)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [page, search])

  useEffect(() => { load() }, [load])

  async function grant(userId: string, planId: string) {
    const res = await fetch('/api/admin/grant', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ type: 'free', userId, planId, months: 12 }),
    })
    if (res.ok) { toast.success('Plan offert'); load() } else toast.error('Erreur')
  }

  async function ban(userId: string, isBanned: boolean) {
    const res = await fetch(`/api/admin/companies/${userId}/ban`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: isBanned ? 'unban' : 'ban' }),
    })
    if (res.ok) { toast.success(isBanned ? 'Compte réactivé' : 'Compte banni'); load() } else toast.error('Erreur')
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <input
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1) }}
          placeholder="Recherche (nom, email)…"
          className="w-full rounded-xl border border-border bg-card pl-10 pr-4 py-2 text-sm"
        />
      </div>

      {loading ? <Loader2 className="w-6 h-6 animate-spin mx-auto my-12" /> : (
        <div className="rounded-2xl border bg-card divide-y divide-border">
          {users.map(u => (
            <div key={u.id} className="p-4 flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-foreground truncate">{u.name || u.email}</p>
                  {u.isBanned && <span className="text-[10px] bg-red-500/15 text-red-500 px-2 py-0.5 rounded-full">Banni</span>}
                  {u.isPartner && <span className="text-[10px] bg-amber-500/15 text-amber-500 px-2 py-0.5 rounded-full"><Star className="inline h-3 w-3" /> Partenaire</span>}
                </div>
                <p className="text-xs text-muted-foreground">{u.email} · {u.plan} · inscrit {fmtDate(u.createdAt)}</p>
              </div>
              <div className="flex items-center gap-1.5">
                <Button size="sm" variant="outline" onClick={() => grant(u.id, 'starter')}>
                  <Gift className="h-3.5 w-3.5 mr-1" /> Offrir 12 mois
                </Button>
                <Button size="sm" variant="ghost" className={u.isBanned ? 'text-green-500' : 'text-destructive'} onClick={() => ban(u.id, u.isBanned)}>
                  <Ban className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
          {users.length === 0 && <p className="p-8 text-center text-sm text-muted-foreground">Aucune entreprise</p>}
        </div>
      )}

      <div className="flex justify-between text-sm text-muted-foreground">
        <span>{total} total</span>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Précédent</Button>
          <Button size="sm" variant="outline" disabled={users.length < 20} onClick={() => setPage(p => p + 1)}>Suivant</Button>
        </div>
      </div>
    </div>
  )
}

// ── Pricing tab ────────────────────────────────────────────────

function PricingTab() {
  const [pricing, setPricing] = useState<Pricing>({ plans: {}, apps: {} })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/admin/pricing').then(r => r.json()).then(d => {
      setPricing(d.data?.overrides ?? d.overrides ?? { plans: {}, apps: {} })
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  async function save() {
    setSaving(true)
    const res = await fetch('/api/admin/pricing', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ overrides: pricing }),
    })
    setSaving(false)
    if (res.ok) toast.success('Tarifs sauvegardés')
    else toast.error('Erreur')
  }

  if (loading) return <Loader2 className="w-6 h-6 animate-spin mx-auto my-12" />

  const PLAN_KEYS = ['starter', 'pro', 'agency', 'business', 'enterprise']
  return (
    <div className="space-y-4 max-w-2xl">
      <div className="rounded-2xl border bg-card p-5 space-y-3">
        <h3 className="font-bold text-foreground">Tarifs YelhaSubs</h3>
        <p className="text-xs text-muted-foreground">Override les prix mensuels par défaut. Laisse vide pour garder le prix code.</p>
        {PLAN_KEYS.map(p => (
          <div key={p} className="flex items-center gap-3">
            <label className="w-28 text-sm capitalize text-foreground">{p}</label>
            <input
              type="number"
              value={pricing.plans?.[p] ?? ''}
              onChange={e => setPricing({ ...pricing, plans: { ...pricing.plans, [p]: e.target.value ? Number(e.target.value) : 0 } })}
              placeholder="DA / mois"
              className="flex-1 rounded-xl border border-border bg-card px-3 py-2 text-sm"
            />
          </div>
        ))}
        <Button onClick={save} disabled={saving} className="w-full mt-3">
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          Sauvegarder
        </Button>
      </div>
    </div>
  )
}

// ── Page wrapper ───────────────────────────────────────────────

export default function AdminPage() {
  const { data: session, status } = useSession()
  const [tab, setTab] = useState<Tab>('stats')

  if (status === 'loading') return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin" /></div>

  if (!session?.user?.isSuperAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="max-w-md text-center space-y-3">
          <ShieldAlert className="w-12 h-12 mx-auto text-destructive" />
          <h1 className="text-xl font-bold text-foreground">Accès refusé</h1>
          <p className="text-sm text-muted-foreground">Cette page est réservée aux super administrateurs.</p>
        </div>
      </div>
    )
  }

  const tabs: Array<{ id: Tab; label: string; icon: typeof BarChart3 }> = [
    { id: 'stats',   label: 'Aperçu',      icon: BarChart3 },
    { id: 'users',   label: 'Utilisateurs', icon: Users },
    { id: 'pricing', label: 'Tarifs',      icon: DollarSign },
  ]

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-6">
        <div className="flex items-center gap-3">
          <ShieldAlert className="w-7 h-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Admin YelhaSubs</h1>
            <p className="text-sm text-muted-foreground">Gestion globale de la plateforme</p>
          </div>
        </div>

        <div className="flex gap-2 border-b border-border overflow-x-auto">
          {tabs.map(t => {
            const active = t.id === tab
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  active ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <t.icon className="h-4 w-4" />
                {t.label}
              </button>
            )
          })}
        </div>

        {tab === 'stats' && <StatsTab />}
        {tab === 'users' && <UsersTab />}
        {tab === 'pricing' && <PricingTab />}
      </div>
    </div>
  )
}
