'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  Building2, Users, TrendingUp, ShieldCheck, Search, RefreshCw,
  DollarSign, Clock, CheckCircle2, XCircle, PauseCircle, Gift,
  Zap, CreditCard, Save, ChevronRight, AlertCircle, BarChart3,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { APPS, PLANS } from '@/lib/pricing/config'

// ─── Types ───────────────────────────────────────────────────────────────────

interface SubInfo {
  id: string
  status: string
  planId: string
  monthlyAmount: number
  billingCycle: string
  currentPeriodEnd: string
  extraApps: string[]
  usageEmails: number
  usageApiReq: number
  usageAiReq: number
}

interface Company {
  id: string
  name: string
  plan: string
  email: string | null
  wilaya: string | null
  trialEndsAt: string | null
  createdAt: string
  _count: { users: number; invoices: number }
  yelhaSubscription: SubInfo | null
}

interface Payment {
  id: string
  amount: number
  planId: string
  method: string
  status: string
  paidAt: string | null
  createdAt: string
  ccpRef: string | null
  subscription: { company: { id: string; name: string } }
}

interface Stats {
  companies: {
    total: number
    newThisMonth: number
    byStatus: Record<string, number>
  }
  users: { total: number }
  revenue: {
    mrr: number
    thisMonth: number
    paymentsThisMonth: number
    pendingPayments: number
  }
  recentPayments: Payment[]
}

interface PricingData {
  defaults: { plans: Record<string, number>; apps: Record<string, number> }
  overrides: { plans: Record<string, number>; apps: Record<string, number> }
  effective: { plans: Record<string, number>; apps: Record<string, number> }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  TRIAL: 'bg-orange-100 text-orange-700',
  ACTIVE: 'bg-green-100 text-green-700',
  PAST_DUE: 'bg-red-100 text-red-700',
  CANCELLED: 'bg-gray-100 text-gray-500',
  PAUSED: 'bg-yellow-100 text-yellow-700',
  EXPIRED: 'bg-red-100 text-red-500',
}

const STATUS_LABELS: Record<string, string> = {
  TRIAL: 'Essai', ACTIVE: 'Actif', PAST_DUE: 'Impayé',
  CANCELLED: 'Annulé', PAUSED: 'Pausé', EXPIRED: 'Expiré',
}

const PLAN_ICONS: Record<string, string> = {
  trial: '🆓', starter: '🚀', pro: '⚡', business: '🏢', enterprise: '🌐',
}

function fmt(n: number) {
  return n.toLocaleString('fr-DZ') + ' DA'
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('fr-DZ', { day: '2-digit', month: 'short', year: '2-digit' })
}

function daysLeft(d: string) {
  const diff = new Date(d).getTime() - Date.now()
  return Math.max(0, Math.ceil(diff / 86400000))
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, sub, color }: {
  icon: React.ElementType; label: string; value: string | number; sub?: string; color: string
}) {
  return (
    <div className="bg-white rounded-xl border p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-sm text-muted-foreground">{label}</p>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {STATUS_LABELS[status] ?? status}
    </span>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function AdminPanel() {
  const { data: session, status } = useSession()
  const router = useRouter()

  // data
  const [stats, setStats] = useState<Stats | null>(null)
  const [companies, setCompanies] = useState<Company[]>([])
  const [compTotal, setCompTotal] = useState(0)
  const [compPage, setCompPage] = useState(1)
  const [pricing, setPricing] = useState<PricingData | null>(null)
  const [editedPrices, setEditedPrices] = useState<{ plans: Record<string, number>; apps: Record<string, number> } | null>(null)

  // filters
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  // loading states
  const [loadingStats, setLoadingStats] = useState(true)
  const [loadingCompanies, setLoadingCompanies] = useState(true)
  const [loadingPricing, setLoadingPricing] = useState(true)
  const [savingPricing, setSavingPricing] = useState(false)

  // dialogs
  const [grantDialog, setGrantDialog] = useState<{ company: Company; type: 'free' | 'activate' } | null>(null)
  const [grantPlanId, setGrantPlanId] = useState('pro')
  const [grantMonths, setGrantMonths] = useState(1)
  const [granting, setGranting] = useState(false)
  const [confirmCcpId, setConfirmCcpId] = useState<string | null>(null)
  const [confirmingCcp, setConfirmingCcp] = useState(false)

  const isSuperAdmin = session?.user?.isSuperAdmin === true

  useEffect(() => {
    if (status === 'unauthenticated') { router.push('/login'); return }
    if (status === 'authenticated' && !isSuperAdmin) { router.push('/dashboard'); return }
  }, [status, isSuperAdmin, router])

  const fetchStats = useCallback(async () => {
    setLoadingStats(true)
    const r = await fetch('/api/admin/stats')
    if (r.ok) { const d = await r.json(); setStats(d.data) }
    setLoadingStats(false)
  }, [])

  const fetchCompanies = useCallback(async () => {
    setLoadingCompanies(true)
    const params = new URLSearchParams({ page: String(compPage) })
    if (search) params.set('search', search)
    if (statusFilter) params.set('status', statusFilter)
    const r = await fetch('/api/admin/companies?' + params)
    if (r.ok) {
      const d = await r.json()
      setCompanies(d.data?.companies ?? [])
      setCompTotal(d.data?.total ?? 0)
    }
    setLoadingCompanies(false)
  }, [compPage, search, statusFilter])

  const fetchPricing = useCallback(async () => {
    setLoadingPricing(true)
    const r = await fetch('/api/admin/pricing')
    if (r.ok) {
      const d = await r.json()
      setPricing(d.data)
      setEditedPrices({
        plans: { ...d.data.effective.plans },
        apps: { ...d.data.effective.apps },
      })
    }
    setLoadingPricing(false)
  }, [])

  useEffect(() => {
    if (status === 'authenticated' && isSuperAdmin) {
      fetchStats()
      fetchCompanies()
      fetchPricing()
    }
  }, [status, isSuperAdmin, fetchStats, fetchCompanies, fetchPricing])

  useEffect(() => {
    if (status === 'authenticated' && isSuperAdmin) fetchCompanies()
  }, [compPage, search, statusFilter, fetchCompanies, status, isSuperAdmin])

  // ── Actions ──────────────────────────────────────────────────────────────

  const handleChangePlan = async (companyId: string, plan: string) => {
    const r = await fetch('/api/admin/companies', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ companyId, plan }),
    })
    if (r.ok) { toast.success('Plan mis à jour'); fetchCompanies() }
    else toast.error('Erreur lors de la mise à jour')
  }

  const handleGrant = async () => {
    if (!grantDialog) return
    setGranting(true)
    const r = await fetch('/api/admin/grant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        companyId: grantDialog.company.id,
        type: grantDialog.type,
        planId: grantPlanId,
        months: grantMonths,
      }),
    })
    setGranting(false)
    if (r.ok) {
      toast.success(grantDialog.type === 'free' ? 'Abonnement gratuit accordé !' : 'Abonnement activé !')
      setGrantDialog(null)
      fetchCompanies()
      fetchStats()
    } else {
      const d = await r.json()
      toast.error(d.error ?? 'Erreur')
    }
  }

  const handleConfirmCcp = async () => {
    if (!confirmCcpId) return
    setConfirmingCcp(true)
    const r = await fetch('/api/admin/grant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'confirm_ccp', paymentId: confirmCcpId }),
    })
    setConfirmingCcp(false)
    if (r.ok) {
      toast.success('Paiement CCP confirmé, abonnement activé !')
      setConfirmCcpId(null)
      fetchStats()
      fetchCompanies()
    } else {
      toast.error('Erreur lors de la confirmation')
    }
  }

  const handleSavePricing = async () => {
    if (!editedPrices) return
    setSavingPricing(true)
    const r = await fetch('/api/admin/pricing', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editedPrices),
    })
    setSavingPricing(false)
    if (r.ok) { toast.success('Tarification sauvegardée !'); fetchPricing() }
    else toast.error('Erreur lors de la sauvegarde')
  }

  // ── Guard ─────────────────────────────────────────────────────────────────

  if (status === 'loading' || (status === 'authenticated' && !isSuperAdmin)) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Chargement...</div>
  }

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <div className="bg-white border-b px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-yelha-500 rounded-xl flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight">Panneau Admin — YelhaERP</h1>
            <p className="text-xs text-muted-foreground">{session?.user?.email}</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => { fetchStats(); fetchCompanies() }}>
          <RefreshCw className="w-3.5 h-3.5 mr-2" />Actualiser
        </Button>
      </div>

      <div className="max-w-screen-2xl mx-auto p-6">
        <Tabs defaultValue="overview">
          <TabsList className="mb-6">
            <TabsTrigger value="overview"><BarChart3 className="w-4 h-4 mr-1.5" />Aperçu</TabsTrigger>
            <TabsTrigger value="companies"><Building2 className="w-4 h-4 mr-1.5" />Entreprises</TabsTrigger>
            <TabsTrigger value="pricing"><DollarSign className="w-4 h-4 mr-1.5" />Tarification</TabsTrigger>
            <TabsTrigger value="payments"><CreditCard className="w-4 h-4 mr-1.5" />Paiements</TabsTrigger>
          </TabsList>

          {/* ═══════════════════════ TAB 1 — APERÇU ═══════════════════════ */}
          <TabsContent value="overview" className="space-y-6">
            {loadingStats ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="bg-white rounded-xl border p-5 h-24 animate-pulse" />
                ))}
              </div>
            ) : stats ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <StatCard icon={Building2} label="Entreprises" value={stats.companies.total} sub={`+${stats.companies.newThisMonth} ce mois`} color="bg-blue-50 text-blue-600" />
                  <StatCard icon={CheckCircle2} label="Actifs" value={stats.companies.byStatus.active ?? 0} color="bg-green-50 text-green-600" />
                  <StatCard icon={Clock} label="En essai" value={stats.companies.byStatus.trial ?? 0} color="bg-orange-50 text-orange-600" />
                  <StatCard icon={XCircle} label="Annulés / Expirés" value={(stats.companies.byStatus.cancelled ?? 0) + (stats.companies.byStatus.expired ?? 0)} color="bg-red-50 text-red-500" />
                  <StatCard icon={Users} label="Utilisateurs" value={stats.users.total} color="bg-purple-50 text-purple-600" />
                  <StatCard icon={TrendingUp} label="MRR" value={fmt(stats.revenue.mrr)} color="bg-yelha-50 text-yelha-600" />
                  <StatCard icon={DollarSign} label="Encaissé ce mois" value={fmt(stats.revenue.thisMonth)} sub={`${stats.revenue.paymentsThisMonth} paiements`} color="bg-emerald-50 text-emerald-600" />
                  <StatCard icon={AlertCircle} label="Paiements en attente" value={stats.revenue.pendingPayments} color="bg-amber-50 text-amber-600" />
                </div>

                {/* Distribution statuts */}
                <div className="bg-white rounded-xl border p-6">
                  <h2 className="font-semibold mb-4">Distribution des abonnements</h2>
                  <div className="flex flex-wrap gap-3">
                    {Object.entries(stats.companies.byStatus).map(([k, v]) => (
                      <div key={k} className="flex items-center gap-2 bg-muted/40 rounded-lg px-4 py-2">
                        <StatusBadge status={k.toUpperCase()} />
                        <span className="font-bold text-lg">{v}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recent payments */}
                <div className="bg-white rounded-xl border overflow-hidden">
                  <div className="px-5 py-4 border-b font-semibold flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-muted-foreground" />
                    Paiements récents
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/30 border-b">
                        <tr>
                          <th className="text-left px-4 py-3 font-medium">Entreprise</th>
                          <th className="text-left px-4 py-3 font-medium">Plan</th>
                          <th className="text-left px-4 py-3 font-medium">Montant</th>
                          <th className="text-left px-4 py-3 font-medium">Méthode</th>
                          <th className="text-left px-4 py-3 font-medium">Statut</th>
                          <th className="text-left px-4 py-3 font-medium">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.recentPayments.map(p => (
                          <tr key={p.id} className="border-t hover:bg-muted/10">
                            <td className="px-4 py-3 font-medium">{p.subscription.company.name}</td>
                            <td className="px-4 py-3 text-muted-foreground">{PLAN_ICONS[p.planId]} {p.planId}</td>
                            <td className="px-4 py-3 font-medium">{fmt(p.amount)}</td>
                            <td className="px-4 py-3">
                              <span className="text-xs bg-slate-100 rounded px-2 py-0.5">{p.method}</span>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`text-xs font-medium rounded-full px-2 py-0.5 ${p.status === 'PAID' || p.status === 'SUCCEEDED' ? 'bg-green-100 text-green-700' : p.status === 'PENDING' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-600'}`}>
                                {p.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-xs text-muted-foreground">{fmtDate(p.createdAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : null}
          </TabsContent>

          {/* ═══════════════════════ TAB 2 — ENTREPRISES ═══════════════════════ */}
          <TabsContent value="companies" className="space-y-4">
            {/* Filters */}
            <div className="bg-white rounded-xl border p-4 flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher une entreprise..."
                  value={search}
                  onChange={e => { setSearch(e.target.value); setCompPage(1) }}
                  className="pl-9 h-9"
                />
              </div>
              <Select value={statusFilter || 'ALL'} onValueChange={v => { setStatusFilter(v === 'ALL' ? '' : v); setCompPage(1) }}>
                <SelectTrigger className="h-9 w-44">
                  <SelectValue placeholder="Tous les statuts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tous les statuts</SelectItem>
                  <SelectItem value="TRIAL">Essai</SelectItem>
                  <SelectItem value="ACTIVE">Actif</SelectItem>
                  <SelectItem value="PAST_DUE">Impayé</SelectItem>
                  <SelectItem value="PAUSED">Pausé</SelectItem>
                  <SelectItem value="CANCELLED">Annulé</SelectItem>
                  <SelectItem value="EXPIRED">Expiré</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-sm text-muted-foreground">{compTotal} résultat{compTotal !== 1 ? 's' : ''}</span>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border overflow-hidden">
              {loadingCompanies ? (
                <div className="py-16 text-center text-muted-foreground">Chargement...</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/30 border-b">
                      <tr>
                        <th className="text-left px-4 py-3 font-medium">Entreprise</th>
                        <th className="text-left px-4 py-3 font-medium">Statut</th>
                        <th className="text-left px-4 py-3 font-medium">Plan</th>
                        <th className="text-left px-4 py-3 font-medium">Revenu</th>
                        <th className="text-left px-4 py-3 font-medium">Utilisateurs</th>
                        <th className="text-left px-4 py-3 font-medium">Fin période</th>
                        <th className="text-left px-4 py-3 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {companies.map(c => {
                        const sub = c.yelhaSubscription
                        const subStatus = sub?.status ?? 'TRIAL'
                        return (
                          <tr key={c.id} className="border-t hover:bg-muted/10">
                            <td className="px-4 py-3">
                              <p className="font-medium">{c.name}</p>
                              <p className="text-xs text-muted-foreground">{c.email ?? '—'}</p>
                              <p className="text-xs text-muted-foreground font-mono">{c.id.slice(0, 8)}…</p>
                            </td>
                            <td className="px-4 py-3"><StatusBadge status={subStatus} /></td>
                            <td className="px-4 py-3">
                              <Select
                                value={c.plan}
                                onValueChange={plan => handleChangePlan(c.id, plan)}
                              >
                                <SelectTrigger className="h-8 w-36 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {['TRIAL','STARTER','PRO','AGENCY','BUSINESS','ENTERPRISE'].map(p => (
                                    <SelectItem key={p} value={p}>{PLAN_ICONS[p.toLowerCase()]} {p}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="px-4 py-3 font-medium">
                              {sub ? (sub.monthlyAmount === 0 ? <span className="text-green-600 font-medium">Gratuit</span> : fmt(sub.monthlyAmount)) : '—'}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">{c._count.users}</td>
                            <td className="px-4 py-3 text-xs text-muted-foreground">
                              {sub?.currentPeriodEnd ? (
                                <div>
                                  <p>{fmtDate(sub.currentPeriodEnd)}</p>
                                  <p className={daysLeft(sub.currentPeriodEnd) < 7 ? 'text-red-500' : 'text-muted-foreground'}>
                                    {daysLeft(sub.currentPeriodEnd)}j restants
                                  </p>
                                </div>
                              ) : '—'}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 px-2 text-xs gap-1"
                                  onClick={() => { setGrantDialog({ company: c, type: 'free' }); setGrantPlanId(sub?.planId ?? 'pro'); setGrantMonths(1) }}
                                >
                                  <Gift className="w-3 h-3" />Gratuit
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 px-2 text-xs gap-1 text-green-700 border-green-200 hover:bg-green-50"
                                  onClick={() => { setGrantDialog({ company: c, type: 'activate' }); setGrantPlanId(sub?.planId ?? 'pro'); setGrantMonths(1) }}
                                >
                                  <Zap className="w-3 h-3" />Activer
                                </Button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                      {companies.length === 0 && (
                        <tr><td colSpan={7} className="py-12 text-center text-muted-foreground">Aucune entreprise trouvée</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pagination */}
              {compTotal > 25 && (
                <div className="border-t px-4 py-3 flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">Page {compPage} sur {Math.ceil(compTotal / 25)}</p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" disabled={compPage === 1} onClick={() => setCompPage(p => p - 1)}>Précédent</Button>
                    <Button size="sm" variant="outline" disabled={compPage >= Math.ceil(compTotal / 25)} onClick={() => setCompPage(p => p + 1)}>Suivant</Button>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          {/* ═══════════════════════ TAB 3 — TARIFICATION ═══════════════════════ */}
          <TabsContent value="pricing" className="space-y-6">
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-3 flex items-center gap-3 text-sm text-amber-800">
              <AlertCircle className="w-4 h-4 shrink-0" />
              Les prix modifiés s'appliquent aux nouveaux abonnements. Les abonnements existants conservent leur montant actuel.
            </div>

            {loadingPricing || !editedPrices ? (
              <div className="grid md:grid-cols-2 gap-6">
                {[...Array(2)].map((_, i) => <div key={i} className="bg-white rounded-xl border p-6 h-64 animate-pulse" />)}
              </div>
            ) : (
              <>
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Plans */}
                  <div className="bg-white rounded-xl border overflow-hidden">
                    <div className="px-5 py-4 border-b font-semibold bg-muted/20">
                      Abonnements (DA / mois)
                    </div>
                    <div className="p-5 space-y-4">
                      {Object.entries(PLANS).filter(([id]) => id !== 'trial').map(([id, plan]) => (
                        <div key={id} className="flex items-center gap-3">
                          <span className="text-lg">{PLAN_ICONS[id]}</span>
                          <div className="flex-1">
                            <p className="text-sm font-medium">{plan.name}</p>
                            <p className="text-xs text-muted-foreground">{plan.description}</p>
                          </div>
                          <div className="flex items-center gap-1">
                            <Input
                              type="number"
                              min={0}
                              value={editedPrices.plans[id] ?? 0}
                              onChange={e => setEditedPrices(prev => prev ? {
                                ...prev,
                                plans: { ...prev.plans, [id]: Number(e.target.value) }
                              } : prev)}
                              className="w-28 h-8 text-sm text-right"
                            />
                            <span className="text-xs text-muted-foreground">DA</span>
                          </div>
                          {pricing && editedPrices.plans[id] !== pricing.defaults.plans[id] && (
                            <ChevronRight className="w-3 h-3 text-yelha-500" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Apps */}
                  <div className="bg-white rounded-xl border overflow-hidden">
                    <div className="px-5 py-4 border-b font-semibold bg-muted/20">
                      Applications extras (DA / mois)
                    </div>
                    <div className="p-5 space-y-3">
                      {Object.entries(APPS).filter(([, a]) => !a.core).map(([id, app]) => (
                        <div key={id} className="flex items-center gap-3">
                          <span className="text-base">{app.icon}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{app.name}</p>
                          </div>
                          <div className="flex items-center gap-1">
                            <Input
                              type="number"
                              min={0}
                              value={editedPrices.apps[id] ?? 0}
                              onChange={e => setEditedPrices(prev => prev ? {
                                ...prev,
                                apps: { ...prev.apps, [id]: Number(e.target.value) }
                              } : prev)}
                              className="w-24 h-8 text-sm text-right"
                            />
                            <span className="text-xs text-muted-foreground">DA</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (pricing) setEditedPrices({ plans: { ...pricing.defaults.plans }, apps: { ...pricing.defaults.apps } })
                    }}
                  >
                    Réinitialiser aux valeurs par défaut
                  </Button>
                  <Button onClick={handleSavePricing} disabled={savingPricing} className="gap-2">
                    <Save className="w-4 h-4" />
                    {savingPricing ? 'Sauvegarde...' : 'Sauvegarder les prix'}
                  </Button>
                </div>
              </>
            )}
          </TabsContent>

          {/* ═══════════════════════ TAB 4 — PAIEMENTS ═══════════════════════ */}
          <TabsContent value="payments">
            <div className="bg-white rounded-xl border overflow-hidden">
              <div className="px-5 py-4 border-b font-semibold flex items-center justify-between">
                <span className="flex items-center gap-2"><CreditCard className="w-4 h-4 text-muted-foreground" />Paiements récents</span>
                {stats && stats.revenue.pendingPayments > 0 && (
                  <span className="text-xs bg-amber-100 text-amber-700 rounded-full px-2.5 py-0.5 font-medium">
                    {stats.revenue.pendingPayments} en attente
                  </span>
                )}
              </div>
              {loadingStats ? (
                <div className="py-16 text-center text-muted-foreground">Chargement...</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/30 border-b">
                      <tr>
                        <th className="text-left px-4 py-3 font-medium">Entreprise</th>
                        <th className="text-left px-4 py-3 font-medium">Plan</th>
                        <th className="text-left px-4 py-3 font-medium">Montant</th>
                        <th className="text-left px-4 py-3 font-medium">Méthode</th>
                        <th className="text-left px-4 py-3 font-medium">Réf.</th>
                        <th className="text-left px-4 py-3 font-medium">Statut</th>
                        <th className="text-left px-4 py-3 font-medium">Date</th>
                        <th className="text-left px-4 py-3 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats?.recentPayments.map(p => (
                        <tr key={p.id} className="border-t hover:bg-muted/10">
                          <td className="px-4 py-3 font-medium">{p.subscription.company.name}</td>
                          <td className="px-4 py-3 text-muted-foreground">{PLAN_ICONS[p.planId]} {p.planId}</td>
                          <td className="px-4 py-3 font-medium">{fmt(p.amount)}</td>
                          <td className="px-4 py-3">
                            <span className={`text-xs rounded px-2 py-0.5 ${p.method === 'CCP' ? 'bg-blue-100 text-blue-700' : p.method.startsWith('ADMIN') ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-700'}`}>
                              {p.method}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs font-mono text-muted-foreground">
                            {p.ccpRef ?? p.id.slice(0, 8)}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-xs font-medium rounded-full px-2 py-0.5 ${p.status === 'PAID' || p.status === 'SUCCEEDED' ? 'bg-green-100 text-green-700' : p.status === 'PENDING' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-600'}`}>
                              {p.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">{fmtDate(p.createdAt)}</td>
                          <td className="px-4 py-3">
                            {p.status === 'PENDING' && p.method === 'CCP' && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs text-green-700 border-green-200 hover:bg-green-50"
                                onClick={() => setConfirmCcpId(p.id)}
                              >
                                <CheckCircle2 className="w-3 h-3 mr-1" />Confirmer CCP
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* ─── Dialog : Offrir gratuit / Activer ───────────────────────────────── */}
      <Dialog open={!!grantDialog} onOpenChange={() => setGrantDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {grantDialog?.type === 'free' ? <Gift className="w-5 h-5 text-purple-500" /> : <Zap className="w-5 h-5 text-green-500" />}
              {grantDialog?.type === 'free' ? 'Offrir un abonnement gratuit' : 'Activer l\'abonnement'}
            </DialogTitle>
          </DialogHeader>
          {grantDialog && (
            <div className="space-y-4 py-2">
              <div className="bg-muted/30 rounded-lg px-4 py-3">
                <p className="font-medium">{grantDialog.company.name}</p>
                <p className="text-xs text-muted-foreground">Statut actuel : {grantDialog.company.yelhaSubscription?.status ?? 'TRIAL'}</p>
              </div>

              <div className="space-y-2">
                <Label>Plan à activer</Label>
                <Select value={grantPlanId} onValueChange={setGrantPlanId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(PLANS).filter(([id]) => id !== 'trial').map(([id, p]) => (
                      <SelectItem key={id} value={id}>{PLAN_ICONS[id]} {p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Durée (mois)</Label>
                <Select value={String(grantMonths)} onValueChange={v => setGrantMonths(Number(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 6, 12, 24].map(m => (
                      <SelectItem key={m} value={String(m)}>{m} mois{m === 12 ? ' — 1 an' : m === 24 ? ' — 2 ans' : ''}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {grantDialog.type === 'free' && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg px-4 py-3 text-sm text-purple-800">
                  L'abonnement sera activé avec un montant de <strong>0 DA</strong> pour {grantMonths} mois.
                </div>
              )}
              {grantDialog.type === 'activate' && (
                <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-800">
                  L'abonnement sera activé sur le plan <strong>{PLANS[grantPlanId as keyof typeof PLANS]?.name}</strong> pour {grantMonths} mois.
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setGrantDialog(null)}>Annuler</Button>
            <Button
              onClick={handleGrant}
              disabled={granting}
              className={grantDialog?.type === 'free' ? 'bg-purple-600 hover:bg-purple-700' : ''}
            >
              {granting ? 'En cours...' : grantDialog?.type === 'free' ? 'Offrir gratuitement' : 'Activer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Dialog : Confirmer paiement CCP ─────────────────────────────────── */}
      <Dialog open={!!confirmCcpId} onOpenChange={() => setConfirmCcpId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              Confirmer le paiement CCP
            </DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <p className="text-sm text-muted-foreground mb-3">
              Confirmez-vous avoir reçu le virement CCP pour ce paiement ? L'abonnement sera automatiquement activé.
            </p>
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
              Cette action est irréversible. Assurez-vous que le virement est bien reçu avant de confirmer.
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmCcpId(null)}>Annuler</Button>
            <Button onClick={handleConfirmCcp} disabled={confirmingCcp} className="bg-green-600 hover:bg-green-700">
              {confirmingCcp ? 'Confirmation...' : 'Confirmer la réception'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
