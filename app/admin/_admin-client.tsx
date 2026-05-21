'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  ShieldAlert, BarChart3, Users, DollarSign, Clock,
  Search, Loader2, Save, Ban, Gift, Star, LogOut, Lock, Trash2,
  Eye, EyeOff, Tag, ChevronDown, ChevronUp, Check, X, Plus, RefreshCw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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

interface PendingPayment {
  id: string; amount: number; planId: string; billingCycle: string
  ccpRef: string | null; periodStart: string; periodEnd: string; createdAt: string
  subscription: { user: { id: string; name: string; email: string } } | null
}

interface PromoCode {
  id: string; code: string; discountType: string; discountValue: number
  planId: string | null; maxUses: number | null; usedCount: number
  expiresAt: string | null; isActive: boolean; createdAt: string
}

interface Pricing { plans: Record<string, number>; apps: Record<string, number> }

type Tab = 'stats' | 'users' | 'paiements' | 'promos' | 'pricing' | 'security'

const PLAN_OPTIONS = [
  { id: 'starter', name: 'Starter' },
  { id: 'premium', name: 'Premium' },
  { id: 'pro', name: 'Pro' },
  { id: 'agency', name: 'Agency' },
]

function fmtDA(n: number) {
  return n.toLocaleString('fr-DZ', { maximumFractionDigits: 0 }) + ' DA'
}
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('fr-DZ', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ── Stats tab ────────────────────────────────────────────────

function StatsTab() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/stats').then(r => r.json()).then(d => {
      if (d.error) { setError(d.error); setLoading(false); return }
      if (d?.companies?.byStatus) setStats(d)
      setLoading(false)
    }).catch(() => { setError('Erreur réseau'); setLoading(false) })
  }, [])

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>
  if (error) return <p className="text-sm text-destructive bg-destructive/10 rounded-xl px-4 py-3">{error}</p>
  if (!stats?.companies) return <p className="text-muted-foreground">Aucune donnée disponible.</p>

  const totalActive = stats.companies.byStatus.active ?? 0
  const totalTrial = stats.companies.byStatus.trial ?? 0
  const totalChurned = (stats.companies.byStatus.cancelled ?? 0) + (stats.companies.byStatus.expired ?? 0)
  const conversionRate = totalActive + totalTrial > 0
    ? Math.round((totalActive / (totalActive + totalTrial + totalChurned)) * 100)
    : 0
  const arpu = totalActive > 0 ? Math.round(stats.revenue.mrr / totalActive) : 0

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Utilisateurs" value={stats.companies.total} sub={`+${stats.companies.newThisMonth} ce mois`} />
        <KpiCard label="MRR" value={fmtDA(stats.revenue.mrr)} sub={`${totalActive} actifs`} />
        <KpiCard label="ARPU" value={fmtDA(arpu)} sub="Revenu moyen / utilisateur" />
        <KpiCard label="Encaissé ce mois" value={fmtDA(stats.revenue.thisMonth)} sub={`${stats.revenue.paymentsThisMonth} paiements`} />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="rounded-2xl border bg-card p-5">
          <h3 className="font-semibold text-foreground mb-4 text-sm">Répartition des comptes</h3>
          <div className="space-y-3">
            <StatusBar label="Actifs"    count={totalActive}                            total={stats.companies.total} color="bg-emerald-500" />
            <StatusBar label="Essai"     count={totalTrial}                             total={stats.companies.total} color="bg-blue-500" />
            <StatusBar label="En retard" count={stats.companies.byStatus.pastDue ?? 0}  total={stats.companies.total} color="bg-amber-500" />
            <StatusBar label="Pause"     count={stats.companies.byStatus.paused ?? 0}   total={stats.companies.total} color="bg-slate-400" />
            <StatusBar label="Annulés"   count={stats.companies.byStatus.cancelled ?? 0} total={stats.companies.total} color="bg-rose-500" />
            <StatusBar label="Expirés"   count={stats.companies.byStatus.expired ?? 0}  total={stats.companies.total} color="bg-rose-700" />
          </div>
        </div>
        <div className="rounded-2xl border bg-card p-5">
          <h3 className="font-semibold text-foreground mb-4 text-sm">Indicateurs</h3>
          <div className="space-y-3 text-sm">
            <MetricRow label="Taux de conversion (Trial → Actif)" value={`${conversionRate}%`} />
            <MetricRow label="Nouveaux comptes ce mois" value={String(stats.companies.newThisMonth)} />
            <MetricRow label="Paiements en attente" value={String(stats.revenue.pendingPayments ?? 0)} />
            <MetricRow label="Revenu ce mois" value={fmtDA(stats.revenue.thisMonth)} />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border bg-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-foreground text-sm">Paiements récents</h3>
          <span className="text-xs text-muted-foreground">{stats.recentPayments.length} derniers</span>
        </div>
        <div className="divide-y divide-border/40">
          {stats.recentPayments.length === 0 && (
            <p className="text-sm text-muted-foreground py-6 text-center">Aucun paiement enregistré.</p>
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

// ── Users tab ────────────────────────────────────────────────

function UsersTab() {
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [apiErr, setApiErr] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [grantPlan, setGrantPlan] = useState('starter')
  const [grantMonths, setGrantMonths] = useState(1)
  const [grantType, setGrantType] = useState<'free' | 'activate'>('free')
  const [acting, setActing] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    setApiErr(null)
    const params = new URLSearchParams({ page: String(page), search })
    fetch(`/api/admin/companies?${params}`).then(r => r.json()).then(d => {
      if (d.error) { setApiErr(d.error); setLoading(false); return }
      setUsers(d.companies ?? [])
      setTotal(d.total ?? 0)
      setLoading(false)
    }).catch(() => { setApiErr('Erreur réseau'); setLoading(false) })
  }, [page, search])

  useEffect(() => { load() }, [load])

  async function grant(userId: string) {
    setActing(true)
    const res = await fetch('/api/admin/grant', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ type: grantType, userId, planId: grantPlan, months: grantMonths }),
    })
    setActing(false)
    if (res.ok) { toast.success('Abonnement accordé'); setExpanded(null); load() }
    else { const d = await res.json(); toast.error(d.error ?? 'Erreur') }
  }

  async function ban(userId: string, isBanned: boolean) {
    const res = await fetch(`/api/admin/companies/${userId}/ban`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: isBanned ? 'unban' : 'ban' }),
    })
    if (res.ok) { toast.success(isBanned ? 'Compte réactivé' : 'Compte banni'); load() }
    else toast.error('Erreur')
  }

  async function deleteUser(userId: string, name: string) {
    if (!window.confirm(`Supprimer définitivement le compte de "${name}" ? Cette action est irréversible.`)) return
    const res = await fetch(`/api/admin/companies/${userId}`, { method: 'DELETE' })
    if (res.ok) { toast.success('Compte supprimé'); load() }
    else toast.error('Erreur lors de la suppression')
  }

  function toggle(id: string) {
    setExpanded(prev => prev === id ? null : id)
    setGrantPlan('starter'); setGrantMonths(1); setGrantType('free')
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

      {apiErr && <p className="text-sm text-destructive bg-destructive/10 rounded-xl px-4 py-3">{apiErr}</p>}

      {loading ? <Loader2 className="w-6 h-6 animate-spin mx-auto my-12" /> : (
        <div className="rounded-2xl border bg-card divide-y divide-border">
          {users.map(u => (
            <div key={u.id}>
              <div className="p-4 flex items-center justify-between gap-3 flex-wrap">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-foreground truncate">{u.name || u.email}</p>
                    {u.isBanned && <span className="text-[10px] bg-red-500/15 text-red-500 px-2 py-0.5 rounded-full">Banni</span>}
                    {u.isPartner && <span className="text-[10px] bg-amber-500/15 text-amber-500 px-2 py-0.5 rounded-full"><Star className="inline h-3 w-3" /> Partenaire</span>}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {u.email} · {u.plan}
                    {u.yelhaSubscription && <span className={` · ${u.yelhaSubscription.status === 'ACTIVE' ? 'text-emerald-500' : 'text-amber-500'}`}>{u.yelhaSubscription.status}</span>}
                    {' · '}{fmtDate(u.createdAt)}
                  </p>
                </div>
                <button
                  onClick={() => toggle(u.id)}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-border rounded-lg px-3 py-1.5 transition-colors"
                >
                  Gérer {expanded === u.id ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                </button>
              </div>

              {expanded === u.id && (
                <div className="px-4 pb-4 bg-muted/30 border-t border-border/40 space-y-4">
                  {/* Grant section */}
                  <div className="pt-3">
                    <p className="text-xs font-semibold text-foreground mb-2 uppercase tracking-wide">Offrir / Activer un abonnement</p>
                    <div className="flex flex-wrap gap-2 items-end">
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">Plan</label>
                        <select
                          value={grantPlan}
                          onChange={e => setGrantPlan(e.target.value)}
                          className="rounded-lg border border-border bg-background px-2 py-1.5 text-sm"
                        >
                          {PLAN_OPTIONS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">Mois</label>
                        <input
                          type="number" min={1} max={24}
                          value={grantMonths}
                          onChange={e => setGrantMonths(Math.max(1, Math.min(24, Number(e.target.value))))}
                          className="w-20 rounded-lg border border-border bg-background px-2 py-1.5 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">Type</label>
                        <select
                          value={grantType}
                          onChange={e => setGrantType(e.target.value as 'free' | 'activate')}
                          className="rounded-lg border border-border bg-background px-2 py-1.5 text-sm"
                        >
                          <option value="free">Gratuit (0 DA)</option>
                          <option value="activate">Activer (prix normal)</option>
                        </select>
                      </div>
                      <Button size="sm" onClick={() => grant(u.id)} disabled={acting} className="gap-1.5">
                        {acting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Gift className="h-3.5 w-3.5" />}
                        Confirmer
                      </Button>
                    </div>
                  </div>

                  {/* Danger zone */}
                  <div className="flex flex-wrap gap-2 pt-1 border-t border-border/40">
                    <Button
                      size="sm" variant="outline"
                      className={u.isBanned ? 'text-emerald-600 border-emerald-600/30' : 'text-amber-600 border-amber-600/30'}
                      onClick={() => ban(u.id, u.isBanned)}
                    >
                      <Ban className="h-3.5 w-3.5 mr-1" />
                      {u.isBanned ? 'Débannir' : 'Bannir'}
                    </Button>
                    <Button size="sm" variant="outline" className="text-destructive border-destructive/30" onClick={() => deleteUser(u.id, u.name || u.email)}>
                      <Trash2 className="h-3.5 w-3.5 mr-1" /> Supprimer le compte
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
          {users.length === 0 && <p className="p-8 text-center text-sm text-muted-foreground">Aucun utilisateur</p>}
        </div>
      )}

      <div className="flex justify-between text-sm text-muted-foreground">
        <span>{total} total</span>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Précédent</Button>
          <Button size="sm" variant="outline" disabled={users.length < 25} onClick={() => setPage(p => p + 1)}>Suivant</Button>
        </div>
      </div>
    </div>
  )
}

// ── Paiements en attente tab ─────────────────────────────────

function PaiementsTab() {
  const [payments, setPayments] = useState<PendingPayment[]>([])
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState<string | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    fetch('/api/admin/pending-payments').then(r => r.json()).then(d => {
      setPayments(d.payments ?? [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  async function confirm(paymentId: string) {
    setActing(paymentId)
    const res = await fetch('/api/admin/grant', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ type: 'confirm_ccp', paymentId }),
    })
    setActing(null)
    if (res.ok) { toast.success('Paiement confirmé'); load() }
    else { const d = await res.json(); toast.error(d.error ?? 'Erreur') }
  }

  async function reject(paymentId: string) {
    if (!window.confirm('Rejeter ce paiement ?')) return
    setActing(paymentId)
    const res = await fetch('/api/admin/grant', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ type: 'reject_ccp', paymentId }),
    })
    setActing(null)
    if (res.ok) { toast.success('Paiement rejeté'); load() }
    else { const d = await res.json(); toast.error(d.error ?? 'Erreur') }
  }

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-foreground">Paiements CCP en attente</h2>
        <Button size="sm" variant="outline" onClick={load} className="gap-1.5">
          <RefreshCw className="h-3.5 w-3.5" /> Actualiser
        </Button>
      </div>

      {payments.length === 0 ? (
        <div className="rounded-2xl border bg-card p-12 text-center">
          <Clock className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Aucun paiement CCP en attente.</p>
        </div>
      ) : (
        <div className="rounded-2xl border bg-card divide-y divide-border">
          {payments.map(p => (
            <div key={p.id} className="p-4 flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-foreground">{p.subscription?.user.name ?? '—'}</p>
                  <span className="text-[10px] bg-amber-500/15 text-amber-600 px-2 py-0.5 rounded-full">EN ATTENTE</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {p.subscription?.user.email} · Plan {p.planId} · {p.billingCycle}
                </p>
                <p className="text-xs text-muted-foreground">
                  Réf: <span className="font-mono font-semibold text-foreground">{p.ccpRef ?? p.id}</span>
                  {' · '}{fmtDate(p.createdAt)}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <p className="text-lg font-bold text-foreground">{fmtDA(p.amount)}</p>
                <Button size="sm" variant="outline" className="gap-1 text-emerald-600 border-emerald-600/30 hover:bg-emerald-500/10"
                  onClick={() => confirm(p.id)} disabled={acting === p.id}>
                  {acting === p.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                  Confirmer
                </Button>
                <Button size="sm" variant="outline" className="gap-1 text-destructive border-destructive/30 hover:bg-destructive/10"
                  onClick={() => reject(p.id)} disabled={acting === p.id}>
                  <X className="h-3.5 w-3.5" /> Rejeter
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Promo codes tab ───────────────────────────────────────────

function PromosTab() {
  const [codes, setCodes] = useState<PromoCode[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    code: '', discountType: 'PERCENT', discountValue: 20,
    planId: '', maxUses: '', expiresAt: '',
  })

  const load = useCallback(() => {
    setLoading(true)
    fetch('/api/admin/promo-codes').then(r => r.json()).then(d => {
      setCodes(d.codes ?? [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  function generate() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    const code = Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
    setForm(f => ({ ...f, code }))
  }

  async function create(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const body: Record<string, unknown> = {
      code: form.code.toUpperCase().trim(),
      discountType: form.discountType,
      discountValue: Number(form.discountValue),
    }
    if (form.planId) body.planId = form.planId
    if (form.maxUses) body.maxUses = Number(form.maxUses)
    if (form.expiresAt) body.expiresAt = new Date(form.expiresAt).toISOString()

    const res = await fetch('/api/admin/promo-codes', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
    setSaving(false)
    if (res.ok) {
      toast.success('Code promo créé')
      setForm({ code: '', discountType: 'PERCENT', discountValue: 20, planId: '', maxUses: '', expiresAt: '' })
      load()
    } else {
      const d = await res.json()
      toast.error(d.error ?? 'Erreur')
    }
  }

  async function toggle(id: string) {
    const res = await fetch(`/api/admin/promo-codes/${id}`, { method: 'PATCH' })
    if (res.ok) load()
    else toast.error('Erreur')
  }

  async function del(id: string, code: string) {
    if (!window.confirm(`Supprimer le code "${code}" ?`)) return
    const res = await fetch(`/api/admin/promo-codes/${id}`, { method: 'DELETE' })
    if (res.ok) { toast.success('Code supprimé'); load() }
    else toast.error('Erreur')
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Create form */}
      <form onSubmit={create} className="rounded-2xl border bg-card p-5 space-y-4">
        <div>
          <h3 className="font-bold text-foreground">Créer un code promo</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Le code sera utilisable à la page de paiement.</p>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Code</Label>
            <div className="flex gap-2">
              <Input
                value={form.code}
                onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                placeholder="EX: SUMMER25"
                className="font-mono uppercase"
                required
              />
              <Button type="button" variant="outline" size="sm" onClick={generate} title="Générer aléatoirement">
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Type de réduction</Label>
            <select
              value={form.discountType}
              onChange={e => setForm(f => ({ ...f, discountType: e.target.value }))}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="PERCENT">Pourcentage (%)</option>
              <option value="FREE_MONTHS">Mois gratuits</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <Label>{form.discountType === 'PERCENT' ? 'Réduction (%)' : 'Nombre de mois gratuits'}</Label>
            <Input
              type="number" min={1} max={form.discountType === 'PERCENT' ? 100 : 24}
              value={form.discountValue}
              onChange={e => setForm(f => ({ ...f, discountValue: Number(e.target.value) }))}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label>Plan concerné <span className="text-muted-foreground">(optionnel)</span></Label>
            <select
              value={form.planId}
              onChange={e => setForm(f => ({ ...f, planId: e.target.value }))}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="">Tous les plans</option>
              {PLAN_OPTIONS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label>Utilisations max <span className="text-muted-foreground">(optionnel)</span></Label>
            <Input
              type="number" min={1}
              value={form.maxUses}
              onChange={e => setForm(f => ({ ...f, maxUses: e.target.value }))}
              placeholder="Illimité"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Date d&apos;expiration <span className="text-muted-foreground">(optionnel)</span></Label>
            <Input
              type="datetime-local"
              value={form.expiresAt}
              onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))}
            />
          </div>
        </div>

        <Button type="submit" disabled={saving} className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Créer le code
        </Button>
      </form>

      {/* Codes list */}
      <div>
        <h3 className="font-semibold text-foreground mb-3">Codes existants</h3>
        {loading ? <Loader2 className="w-6 h-6 animate-spin mx-auto my-8" /> : codes.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8 rounded-2xl border bg-card">Aucun code promo créé.</p>
        ) : (
          <div className="rounded-2xl border bg-card divide-y divide-border">
            {codes.map(c => (
              <div key={c.id} className="p-4 flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-bold text-foreground">{c.code}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${c.isActive ? 'bg-emerald-500/15 text-emerald-600' : 'bg-muted text-muted-foreground'}`}>
                      {c.isActive ? 'Actif' : 'Inactif'}
                    </span>
                    <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                      {c.discountType === 'PERCENT' ? `-${c.discountValue}%` : `+${c.discountValue} mois`}
                    </span>
                    {c.planId && <span className="text-[10px] bg-blue-500/10 text-blue-600 px-2 py-0.5 rounded-full">{c.planId}</span>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {c.usedCount} utilisation{c.usedCount !== 1 ? 's' : ''}
                    {c.maxUses !== null && ` / ${c.maxUses}`}
                    {c.expiresAt && ` · expire ${fmtDate(c.expiresAt)}`}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => toggle(c.id)}
                    className={c.isActive ? 'text-amber-600' : 'text-emerald-600'}>
                    {c.isActive ? 'Désactiver' : 'Activer'}
                  </Button>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => del(c.id, c.code)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
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
      setPricing(d.overrides ?? { plans: {}, apps: {} })
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  async function save() {
    setSaving(true)
    const res = await fetch('/api/admin/pricing', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ plans: pricing.plans }),
    })
    setSaving(false)
    if (res.ok) toast.success('Tarifs sauvegardés')
    else toast.error('Erreur')
  }

  if (loading) return <Loader2 className="w-6 h-6 animate-spin mx-auto my-12" />

  const PLAN_KEYS: { id: string; name: string; default: number }[] = [
    { id: 'starter', name: 'Starter',  default: 990  },
    { id: 'premium', name: 'Premium',  default: 1990 },
    { id: 'pro',     name: 'Pro',      default: 2990 },
    { id: 'agency',  name: 'Agency',   default: 4990 },
  ]
  return (
    <div className="space-y-4 max-w-2xl">
      <div className="rounded-2xl border bg-card p-5 space-y-4">
        <div>
          <h3 className="font-bold text-foreground">Tarifs YelhaSubs</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Modifie les prix mensuels. Laisse vide pour le prix par défaut.</p>
        </div>
        {PLAN_KEYS.map(p => (
          <div key={p.id} className="flex items-center gap-3">
            <div className="w-32 shrink-0">
              <p className="text-sm font-medium text-foreground">{p.name}</p>
              <p className="text-xs text-muted-foreground">Défaut : {p.default.toLocaleString('fr-DZ')} DA</p>
            </div>
            <input
              type="number"
              value={pricing.plans?.[p.id] ?? ''}
              onChange={e => setPricing({ ...pricing, plans: { ...pricing.plans, [p.id]: e.target.value ? Number(e.target.value) : 0 } })}
              placeholder={`${p.default} DA / mois`}
              className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm"
            />
            <span className="text-xs text-muted-foreground shrink-0">DA/mois</span>
          </div>
        ))}
        <Button onClick={save} disabled={saving} className="w-full">
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          Sauvegarder les tarifs
        </Button>
      </div>
    </div>
  )
}

// ── Security tab ─────────────────────────────────────────────

function SecurityTab({ onLogout }: { onLogout: () => void }) {
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [shown, setShown] = useState(false)
  const [saving, setSaving] = useState(false)

  async function changePassword(e: React.FormEvent) {
    e.preventDefault()
    if (newPassword.length < 8) { toast.error('Minimum 8 caractères'); return }
    if (newPassword !== confirm) { toast.error('Les mots de passe ne correspondent pas'); return }
    setSaving(true)
    const res = await fetch('/api/admin/auth/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newPassword }),
    })
    setSaving(false)
    if (res.ok) {
      toast.success('Mot de passe modifié')
      setNewPassword('')
      setConfirm('')
    } else {
      const d = await res.json()
      toast.error(d.error ?? 'Erreur')
    }
  }

  return (
    <div className="space-y-6 max-w-md">
      <form onSubmit={changePassword} className="rounded-2xl border bg-card p-5 space-y-4">
        <div>
          <h3 className="font-bold text-foreground">Changer le mot de passe admin</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Minimum 8 caractères.</p>
        </div>
        <div className="space-y-1.5">
          <Label>Nouveau mot de passe</Label>
          <div className="relative">
            <Input
              type={shown ? 'text' : 'password'}
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="Nouveau mot de passe"
              className="pr-10"
            />
            <button type="button" onClick={() => setShown(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              {shown ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Confirmer le mot de passe</Label>
          <Input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Répéter le mot de passe" />
        </div>
        <Button type="submit" disabled={saving || !newPassword || !confirm} className="w-full">
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Lock className="h-4 w-4 mr-2" />}
          Enregistrer
        </Button>
      </form>

      <div className="rounded-2xl border bg-card p-5">
        <h3 className="font-bold text-foreground mb-1">Session</h3>
        <p className="text-xs text-muted-foreground mb-4">La session admin dure 7 jours.</p>
        <Button variant="outline" onClick={onLogout} className="gap-2">
          <LogOut className="h-4 w-4" /> Se déconnecter
        </Button>
      </div>
    </div>
  )
}

// ── Page wrapper ──────────────────────────────────────────────

export function AdminClientPage() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('stats')

  async function handleLogout() {
    await fetch('/api/admin/auth/logout', { method: 'POST' })
    router.push('/admin/login')
  }

  const tabs: Array<{ id: Tab; label: string; icon: typeof BarChart3 }> = [
    { id: 'stats',     label: 'Aperçu',     icon: BarChart3 },
    { id: 'users',     label: 'Comptes',    icon: Users },
    { id: 'paiements', label: 'Paiements',  icon: Clock },
    { id: 'promos',    label: 'Promos',     icon: Tag },
    { id: 'pricing',   label: 'Tarifs',     icon: DollarSign },
    { id: 'security',  label: 'Sécurité',   icon: Lock },
  ]

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-7 h-7 text-primary" />
            <div>
              <h1 className="text-2xl font-bold text-foreground">Admin YelhaSubs</h1>
              <p className="text-sm text-muted-foreground">Gestion globale de la plateforme</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-2 text-muted-foreground hover:text-foreground">
            <LogOut className="h-4 w-4" /> Déconnexion
          </Button>
        </div>

        <div className="flex gap-1 border-b border-border overflow-x-auto">
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

        {tab === 'stats'     && <StatsTab />}
        {tab === 'users'     && <UsersTab />}
        {tab === 'paiements' && <PaiementsTab />}
        {tab === 'promos'    && <PromosTab />}
        {tab === 'pricing'   && <PricingTab />}
        {tab === 'security'  && <SecurityTab onLogout={handleLogout} />}
      </div>
    </div>
  )
}
