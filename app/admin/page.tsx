'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import {
  ShieldAlert, BarChart3, Users, DollarSign,
  Search, Check, TrendingUp, Clock, Ban, Star, Gift,
  ChevronLeft, ChevronRight, Loader2, Save,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { APP_PLANS } from '@/lib/pricing/app-plans'

// ── Types ──────────────────────────────────────────────────────

interface UserRow {
  id: string; name: string; email: string; role: string; createdAt: string
  company: {
    id: string; name: string; plan: string; isBanned: boolean; isPartner: boolean
    appSubscriptions: { appId: string; status: string; planId: string }[]
    yelhaSubscription: { status: string; monthlyAmount: number } | null
  }
}

interface Stats {
  companies: { total: number; newThisMonth: number; byStatus: Record<string, number> }
  users: { total: number }
  revenue: { mrr: number; thisMonth: number; paymentsThisMonth: number; pendingPayments: number }
  recentPayments: Array<{
    id: string; amount: number; planId: string; method: string; status: string
    paidAt: string | null; createdAt: string
    subscription: { company: { id: string; name: string } } | null
  }>
}

interface PricingData {
  [appId: string]: { defaults: Record<string, number>; overrides: Record<string, number>; effective: Record<string, number> }
}

type Tab = 'stats' | 'users' | 'pricing'

// ── Helpers ────────────────────────────────────────────────────

function fmtDA(n: number) {
  return n.toLocaleString('fr-DZ', { maximumFractionDigits: 0 }) + ' DA'
}
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('fr-DZ', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ── Gift dialog ────────────────────────────────────────────────

function GiftDialog({ target, onClose, onDone }: {
  target: { id: string; name: string }
  onClose: () => void
  onDone: () => void
}) {
  const [appId, setAppId]   = useState(Object.keys(APP_PLANS)[0] ?? '')
  const [planId, setPlanId] = useState('')
  const [months, setMonths] = useState(1)
  const [loading, setLoading] = useState(false)

  const appConfig = APP_PLANS[appId as keyof typeof APP_PLANS]
  const paidPlans = appConfig ? Object.values(appConfig.plans).filter((p: { id: string }) => p.id !== 'trial') : []

  useEffect(() => { setPlanId(paidPlans[0]?.id ?? '') }, [appId])

  async function submit() {
    if (!planId) return
    setLoading(true)
    const res = await fetch('/api/admin/app-grant', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'gift', companyId: target.id, appId, planId, months }),
    })
    const d = await res.json()
    setLoading(false)
    if (res.ok) { toast.success('Abonnement offert + email envoyé ✓'); onDone(); onClose() }
    else toast.error(d.error ?? 'Erreur')
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-2 mb-6">
          <Gift className="w-5 h-5 text-amber-400" />
          <h3 className="font-bold text-white">Offrir un abonnement</h3>
          <span className="text-zinc-500 text-sm ml-1">— {target.name}</span>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider block mb-2">Application</label>
            <select value={appId} onChange={e => setAppId(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-500">
              {Object.entries(APP_PLANS).map(([id, cfg]) => (
                <option key={id} value={id}>{cfg.appName}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider block mb-2">Plan</label>
            <select value={planId} onChange={e => setPlanId(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-500">
              {paidPlans.map((p: { id: string; name: string; price: number }) => (
                <option key={p.id} value={p.id}>{p.name} — {fmtDA(p.price)}/mois</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider block mb-2">Durée</label>
            <select value={months} onChange={e => setMonths(Number(e.target.value))}
              className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-500">
              {[1,2,3,6,12].map(m => <option key={m} value={m}>{m} mois</option>)}
            </select>
          </div>
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-xs text-amber-300">
            🎁 Le client recevra un email et sera rappelé 2 jours avant la fin.
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <Button variant="outline" className="flex-1 border-zinc-700 text-zinc-300 hover:bg-zinc-800" onClick={onClose}>Annuler</Button>
          <Button className="flex-1 bg-amber-500 hover:bg-amber-600 text-black font-semibold" onClick={submit} disabled={loading || !planId}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : '🎁 Offrir'}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ── Stats tab ──────────────────────────────────────────────────

function StatsTab() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/stats')
      .then(r => r.json())
      .then(d => setStats(d.data ?? d))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-zinc-500" /></div>
  if (!stats) return null

  const kpis = [
    { label: 'Comptes',      value: stats.companies.total,                sub: `+${stats.companies.newThisMonth} ce mois`,       icon: Users,      color: 'text-blue-400' },
    { label: 'MRR',          value: fmtDA(stats.revenue.mrr),             sub: 'Abonnements actifs',                             icon: TrendingUp, color: 'text-emerald-400' },
    { label: 'Ce mois',      value: fmtDA(stats.revenue.thisMonth),       sub: `${stats.revenue.paymentsThisMonth} paiements`,   icon: DollarSign, color: 'text-indigo-400' },
    { label: 'En attente',   value: stats.revenue.pendingPayments,        sub: 'Paiements CCP',                                  icon: Clock,      color: 'text-amber-400' },
    { label: 'Utilisateurs', value: stats.users.total,                    sub: 'Comptes actifs',                                 icon: Users,      color: 'text-purple-400' },
    { label: 'Actifs',       value: stats.companies.byStatus.active ?? 0, sub: `Trial: ${stats.companies.byStatus.trial ?? 0}`,  icon: Check,      color: 'text-emerald-400' },
  ]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {kpis.map(k => (
          <div key={k.label} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">{k.label}</span>
              <k.icon className={`w-4 h-4 ${k.color}`} />
            </div>
            <div className="text-2xl font-bold text-white">{k.value}</div>
            <div className="text-xs text-zinc-500 mt-1">{k.sub}</div>
          </div>
        ))}
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-800">
          <h3 className="font-semibold text-white text-sm">Paiements récents</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-zinc-500 border-b border-zinc-800">
                <th className="text-left px-5 py-3 font-medium">Entreprise</th>
                <th className="text-left px-5 py-3 font-medium">Plan</th>
                <th className="text-left px-5 py-3 font-medium">Montant</th>
                <th className="text-left px-5 py-3 font-medium">Méthode</th>
                <th className="text-left px-5 py-3 font-medium">Statut</th>
                <th className="text-left px-5 py-3 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {stats.recentPayments.map(p => (
                <tr key={p.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                  <td className="px-5 py-3 font-medium text-white">{p.subscription?.company.name ?? '—'}</td>
                  <td className="px-5 py-3 text-zinc-400">{p.planId}</td>
                  <td className="px-5 py-3 font-semibold text-emerald-400">{fmtDA(p.amount)}</td>
                  <td className="px-5 py-3 text-zinc-400 text-xs">{p.method}</td>
                  <td className="px-5 py-3">
                    {p.status === 'PAID' || p.status === 'SUCCEEDED'
                      ? <span className="text-xs bg-emerald-500/15 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20">Payé</span>
                      : <span className="text-xs bg-amber-500/15 text-amber-400 px-2 py-0.5 rounded-full border border-amber-500/20">En attente</span>}
                  </td>
                  <td className="px-5 py-3 text-zinc-500 text-xs">{fmtDate(p.paidAt ?? p.createdAt)}</td>
                </tr>
              ))}
              {stats.recentPayments.length === 0 && (
                <tr><td colSpan={6} className="py-12 text-center text-zinc-600 text-sm">Aucun paiement</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ── Users tab ──────────────────────────────────────────────────

function UsersTab() {
  const [users, setUsers] = useState<UserRow[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState<string | null>(null)
  const [giftTarget, setGiftTarget] = useState<{ id: string; name: string } | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    fetch(`/api/admin/users?page=${page}&search=${encodeURIComponent(search)}`)
      .then(r => r.json())
      .then(d => { const data = d.data ?? d; setUsers(data.users ?? []); setTotal(data.total ?? 0) })
      .finally(() => setLoading(false))
  }, [page, search])

  useEffect(() => { load() }, [load])

  async function toggleBan(u: UserRow) {
    setActing(u.id)
    const action = u.company.isBanned ? 'unban' : 'ban'
    const res = await fetch(`/api/admin/companies/${u.company.id}/ban`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })
    if (res.ok) { toast.success(action === 'ban' ? 'Compte banni' : 'Compte débanni'); load() }
    else toast.error('Erreur')
    setActing(null)
  }

  async function togglePartner(u: UserRow) {
    setActing(u.id)
    const action = u.company.isPartner ? 'demote' : 'promote'
    const res = await fetch(`/api/admin/companies/${u.company.id}/partner`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })
    if (res.ok) { toast.success(action === 'promote' ? '⭐ Promu partenaire' : 'Statut partenaire retiré'); load() }
    else toast.error('Erreur')
    setActing(null)
  }

  const ROLE_LABELS: Record<string, string> = {
    OWNER: 'Propriétaire', ADMIN: 'Admin', ACCOUNTANT: 'Comptable', EMPLOYEE: 'Employé', READONLY: 'Lecture',
  }

  const totalPages = Math.ceil(total / 30)

  return (
    <div className="space-y-4">
      {giftTarget && <GiftDialog target={giftTarget} onClose={() => setGiftTarget(null)} onDone={load} />}

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="Rechercher un utilisateur…"
            className="w-full bg-zinc-900 border border-zinc-800 text-white rounded-xl pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:border-indigo-500"
          />
        </div>
        <span className="text-sm text-zinc-500">{total} utilisateur{total !== 1 ? 's' : ''}</span>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-zinc-600" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-zinc-500 border-b border-zinc-800">
                  <th className="text-left px-5 py-3 font-medium">Utilisateur</th>
                  <th className="text-left px-5 py-3 font-medium">Rôle</th>
                  <th className="text-left px-5 py-3 font-medium">Entreprise</th>
                  <th className="text-left px-5 py-3 font-medium">Abonnement</th>
                  <th className="text-left px-5 py-3 font-medium">Apps actives</th>
                  <th className="text-left px-5 py-3 font-medium">Inscrit</th>
                  <th className="text-right px-5 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} className={`border-b border-zinc-800/50 hover:bg-zinc-800/20 ${u.company.isBanned ? 'opacity-60' : ''}`}>
                    <td className="px-5 py-3">
                      <div className="font-medium text-white">{u.name}</div>
                      <div className="text-xs text-zinc-500">{u.email}</div>
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-xs bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded-full">{ROLE_LABELS[u.role] ?? u.role}</span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="font-medium text-zinc-300">{u.company.name}</div>
                      <div className="flex gap-1 mt-0.5">
                        {u.company.isBanned  && <span className="text-[10px] text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded">Banni</span>}
                        {u.company.isPartner && <span className="text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">Partenaire</span>}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-zinc-400 text-xs">
                      {u.company.yelhaSubscription?.status ?? '—'}
                      {u.company.yelhaSubscription?.monthlyAmount ? ` · ${fmtDA(u.company.yelhaSubscription.monthlyAmount)}` : ''}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex flex-wrap gap-1">
                        {u.company.appSubscriptions.map(s => (
                          <span key={s.appId} className={`text-[10px] px-1.5 py-0.5 rounded border ${
                            s.status === 'ACTIVE'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : 'bg-zinc-800 text-zinc-500 border-zinc-700'
                          }`}>
                            {APP_PLANS[s.appId as keyof typeof APP_PLANS]?.appName ?? s.appId}
                          </span>
                        ))}
                        {u.company.appSubscriptions.length === 0 && <span className="text-zinc-600 text-xs">—</span>}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-zinc-500 text-xs">{fmtDate(u.createdAt)}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {acting === u.id ? (
                          <Loader2 className="w-4 h-4 animate-spin text-zinc-500" />
                        ) : (
                          <>
                            <button
                              onClick={() => setGiftTarget({ id: u.company.id, name: u.company.name })}
                              title="Offrir un abonnement"
                              className="p-1.5 rounded-lg text-zinc-500 hover:text-amber-400 hover:bg-amber-500/10 transition-colors"
                            >
                              <Gift className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => togglePartner(u)}
                              title={u.company.isPartner ? 'Retirer partenaire' : 'Promouvoir partenaire'}
                              className={`p-1.5 rounded-lg transition-colors ${u.company.isPartner ? 'text-amber-400 bg-amber-500/10' : 'text-zinc-500 hover:text-amber-400 hover:bg-amber-500/10'}`}
                            >
                              <Star className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => toggleBan(u)}
                              title={u.company.isBanned ? 'Débannir' : 'Bannir'}
                              className={`p-1.5 rounded-lg transition-colors ${u.company.isBanned ? 'text-red-400 bg-red-500/10' : 'text-zinc-500 hover:text-red-400 hover:bg-red-500/10'}`}
                            >
                              <Ban className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr><td colSpan={7} className="py-16 text-center text-zinc-600 text-sm">Aucun utilisateur trouvé</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-zinc-500">Page {page} / {totalPages}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="border-zinc-800 text-zinc-400 hover:bg-zinc-800"><ChevronLeft className="w-4 h-4" /></Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="border-zinc-800 text-zinc-400 hover:bg-zinc-800"><ChevronRight className="w-4 h-4" /></Button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Pricing tab ────────────────────────────────────────────────

function PricingTab() {
  const [data, setData] = useState<PricingData | null>(null)
  const [edits, setEdits] = useState<Record<string, Record<string, string>>>({})
  const [saving, setSaving] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/app-pricing').then(r => r.json()).then(d => {
      const result = d.data ?? d
      setData(result)
      const initial: Record<string, Record<string, string>> = {}
      for (const [appId, cfg] of Object.entries(result as PricingData)) {
        initial[appId] = {}
        for (const [planId, price] of Object.entries(cfg.effective)) {
          if (planId !== 'trial') initial[appId][planId] = String(price)
        }
      }
      setEdits(initial)
    }).catch(() => {})
  }, [])

  async function savePricing(appId: string) {
    setSaving(appId)
    const prices: Record<string, number> = {}
    for (const [planId, val] of Object.entries(edits[appId] ?? {})) {
      const n = parseInt(val, 10)
      if (!isNaN(n) && n >= 0) prices[planId] = n
    }
    const res = await fetch('/api/admin/app-pricing', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appId, prices }),
    })
    setSaving(null)
    if (res.ok) toast.success(`Tarification ${appId} sauvegardée`)
    else toast.error('Erreur lors de la sauvegarde')
  }

  if (!data) return <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-zinc-600" /></div>

  return (
    <div className="space-y-6">
      {Object.entries(data).map(([appId, cfg]) => {
        const appConfig = APP_PLANS[appId as keyof typeof APP_PLANS]
        const paidPlans = Object.entries(cfg.effective).filter(([id]) => id !== 'trial')

        return (
          <div key={appId} className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
              <div>
                <h3 className="font-semibold text-white">{appConfig?.appName ?? appId}</h3>
                <p className="text-xs text-zinc-500 mt-0.5">Prix des abonnements en DA/mois</p>
              </div>
              <Button size="sm" onClick={() => savePricing(appId)} disabled={saving === appId}
                className="bg-indigo-600 hover:bg-indigo-700 text-white">
                {saving === appId ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-3.5 h-3.5 mr-1" />Sauvegarder</>}
              </Button>
            </div>
            <div className="p-5">
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {paidPlans.map(([planId, effectivePrice]) => {
                  const planConfig = appConfig?.plans[planId as keyof typeof appConfig.plans] as { name: string; price: number } | undefined
                  const defaultPrice = cfg.defaults[planId] ?? 0
                  const currentEdit = edits[appId]?.[planId] ?? String(effectivePrice)
                  const hasOverride = cfg.overrides[planId] !== undefined

                  return (
                    <div key={planId} className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-white text-sm">{planConfig?.name ?? planId}</span>
                        {hasOverride && (
                          <span className="text-[10px] bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 px-1.5 py-0.5 rounded-full">Modifié</span>
                        )}
                      </div>
                      <div>
                        <label className="text-xs text-zinc-500 block mb-1.5">Prix DA/mois</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number" min="0"
                            value={currentEdit}
                            onChange={e => setEdits(prev => ({
                              ...prev,
                              [appId]: { ...(prev[appId] ?? {}), [planId]: e.target.value },
                            }))}
                            className="w-full bg-zinc-900 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                          />
                          <span className="text-zinc-600 text-xs shrink-0">DA</span>
                        </div>
                      </div>
                      <p className="text-xs text-zinc-600">Défaut : {fmtDA(defaultPrice)}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'stats',   label: 'Vue d\'ensemble', icon: BarChart3 },
  { id: 'users',   label: 'Utilisateurs',    icon: Users },
  { id: 'pricing', label: 'Tarification',    icon: DollarSign },
]

export default function AdminPage() {
  const { data: session } = useSession()
  const [tab, setTab] = useState<Tab>('stats')

  if (!session) return null

  if (!session.user?.isSuperAdmin) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center gap-4">
        <ShieldAlert className="h-12 w-12 text-red-500" />
        <p className="text-white text-lg font-semibold">Accès réservé aux super-administrateurs</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="border-b border-zinc-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
              <ShieldAlert className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <h1 className="font-bold text-white">Administration</h1>
              <p className="text-xs text-zinc-500">YelhaERP — Panneau de contrôle</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-full px-3 py-1.5">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs text-zinc-400">{session.user.name}</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center gap-1 mb-6 bg-zinc-900 border border-zinc-800 rounded-xl p-1 w-fit">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === t.id
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'
              }`}>
              <t.icon className="w-4 h-4" />
              <span className="hidden sm:block">{t.label}</span>
            </button>
          ))}
        </div>

        {tab === 'stats'   && <StatsTab />}
        {tab === 'users'   && <UsersTab />}
        {tab === 'pricing' && <PricingTab />}
      </div>
    </div>
  )
}
