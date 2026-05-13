'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  Building2, Users, TrendingUp, ShieldCheck, Search, RefreshCw,
  DollarSign, Clock, CheckCircle2, XCircle, Gift, Zap, CreditCard,
  Save, ChevronRight, AlertCircle, BarChart3, ArrowUpRight, Loader2,
  PauseCircle, Activity,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { APPS, PLANS } from '@/lib/pricing/config'
import { APP_PLANS } from '@/lib/pricing/app-plans'

// ─── Types ───────────────────────────────────────────────────────────────────

interface SubInfo {
  id: string; status: string; planId: string; monthlyAmount: number
  billingCycle: string; currentPeriodEnd: string; extraApps: string[]
  usageEmails: number; usageApiReq: number; usageAiReq: number
}
interface Company {
  id: string; name: string; plan: string; email: string | null
  wilaya: string | null; trialEndsAt: string | null; createdAt: string
  _count: { users: number; invoices: number }
  yelhaSubscription: SubInfo | null
}
interface Payment {
  id: string; amount: number; planId: string; method: string; status: string
  paidAt: string | null; createdAt: string; ccpRef: string | null
  subscription: { company: { id: string; name: string } }
}
interface Stats {
  companies: { total: number; newThisMonth: number; byStatus: Record<string, number> }
  users: { total: number }
  revenue: { mrr: number; thisMonth: number; paymentsThisMonth: number; pendingPayments: number }
  recentPayments: Payment[]
}
interface PricingData {
  defaults: { plans: Record<string, number>; apps: Record<string, number> }
  overrides: { plans: Record<string, number>; apps: Record<string, number> }
  effective: { plans: Record<string, number>; apps: Record<string, number> }
}
interface AppPricingData {
  defaults: Record<string, number>
  overrides: Record<string, number>
  effective: Record<string, number>
}
interface AppPaymentAdmin {
  id: string; appId: string; planId: string; amount: number
  method: string; status: string; ccpRef: string | null
  createdAt: string; paidAt: string | null
  appSubscription: { companyId: string; company: { id: string; name: string; email: string | null } }
}

// ─── Constants ───────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; bg: string; dot: string }> = {
  TRIAL:    { label: 'Essai',   bg: 'bg-amber-50 text-amber-700 ring-amber-200',   dot: 'bg-amber-400' },
  ACTIVE:   { label: 'Actif',   bg: 'bg-emerald-50 text-emerald-700 ring-emerald-200', dot: 'bg-emerald-400' },
  PAST_DUE: { label: 'Impayé', bg: 'bg-red-50 text-red-700 ring-red-200',         dot: 'bg-red-400' },
  CANCELLED:{ label: 'Annulé', bg: 'bg-slate-50 text-slate-500 ring-slate-200',   dot: 'bg-slate-400' },
  PAUSED:   { label: 'Pausé',  bg: 'bg-yellow-50 text-yellow-700 ring-yellow-200', dot: 'bg-yellow-400' },
  EXPIRED:  { label: 'Expiré', bg: 'bg-red-50 text-red-600 ring-red-200',         dot: 'bg-red-300' },
}

const PLAN_EMOJI: Record<string, string> = {
  trial: '🆓', starter: '🚀', pro: '⚡', business: '🏢', enterprise: '🌐',
  TRIAL: '🆓', STARTER: '🚀', PRO: '⚡', AGENCY: '📦', BUSINESS: '🏢', ENTERPRISE: '🌐',
}

function fmt(n: number) { return n.toLocaleString('fr-DZ') + ' DA' }
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('fr-DZ', { day: '2-digit', month: 'short', year: '2-digit' })
}
function daysLeft(d: string) { return Math.max(0, Math.ceil((new Date(d).getTime() - Date.now()) / 86400000)) }

// ─── Small components ─────────────────────────────────────────────────────────

function StatusPill({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, bg: 'bg-gray-100 text-gray-600 ring-gray-200', dot: 'bg-gray-400' }
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${cfg.bg}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  )
}

function KpiCard({ icon: Icon, label, value, sub, gradient, trend }: {
  icon: React.ElementType; label: string; value: string | number
  sub?: string; gradient: string; trend?: string
}) {
  return (
    <div className="relative bg-white rounded-2xl border border-slate-100 p-6 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <div className={`absolute top-0 right-0 w-28 h-28 rounded-full opacity-[0.07] -translate-y-8 translate-x-8 ${gradient}`} />
      <div className={`inline-flex p-2.5 rounded-xl mb-4 ${gradient}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <p className="text-2xl font-bold text-slate-900 tracking-tight">{value}</p>
      <p className="text-sm text-slate-500 mt-0.5">{label}</p>
      {(sub || trend) && (
        <div className="flex items-center gap-1 mt-2">
          {trend && <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500" />}
          <p className="text-xs text-slate-400">{sub ?? trend}</p>
        </div>
      )}
    </div>
  )
}

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-slate-100 rounded-xl ${className}`} />
}

function ErrorBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-5 py-4 text-sm text-red-700">
      <AlertCircle className="w-4 h-4 shrink-0" />
      <span className="flex-1">{message}</span>
      <Button size="sm" variant="outline" onClick={onRetry} className="text-red-700 border-red-200 hover:bg-red-100 h-7">
        Réessayer
      </Button>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function AdminPanel() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [stats, setStats] = useState<Stats | null>(null)
  const [statsError, setStatsError] = useState('')
  const [companies, setCompanies] = useState<Company[]>([])
  const [compTotal, setCompTotal] = useState(0)
  const [compPage, setCompPage] = useState(1)
  const [companiesError, setCompaniesError] = useState('')
  const [pricing, setPricing] = useState<PricingData | null>(null)
  const [editedPrices, setEditedPrices] = useState<{ plans: Record<string, number>; apps: Record<string, number> } | null>(null)

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const [loadingStats, setLoadingStats] = useState(true)
  const [loadingCompanies, setLoadingCompanies] = useState(true)
  const [loadingPricing, setLoadingPricing] = useState(true)
  const [savingPricing, setSavingPricing] = useState(false)

  const [appPricing, setAppPricing] = useState<Record<string, AppPricingData> | null>(null)
  const [editedAppPrices, setEditedAppPrices] = useState<Record<string, Record<string, number>>>({})
  const [savingAppPricing, setSavingAppPricing] = useState<string | null>(null)
  const [loadingAppPricing, setLoadingAppPricing] = useState(true)
  const [appPayments, setAppPayments] = useState<AppPaymentAdmin[]>([])
  const [loadingAppPayments, setLoadingAppPayments] = useState(true)
  const [confirmAppPaymentId, setConfirmAppPaymentId] = useState<string | null>(null)
  const [confirmingAppPayment, setConfirmingAppPayment] = useState(false)
  const [appGrantDialog, setAppGrantDialog] = useState<{ company: Company; type: 'free' | 'activate' } | null>(null)
  const [appGrantAppId, setAppGrantAppId] = useState('subscriptions')
  const [appGrantPlanId, setAppGrantPlanId] = useState('starter')
  const [appGrantMonths, setAppGrantMonths] = useState(1)
  const [appGranting, setAppGranting] = useState(false)

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
    setStatsError('')
    try {
      const r = await fetch('/api/admin/stats')
      if (!r.ok) { const d = await r.json(); throw new Error(d.error ?? `Erreur ${r.status}`) }
      const d = await r.json()
      setStats(d.data)
    } catch (e: unknown) {
      setStatsError(e instanceof Error ? e.message : 'Erreur inconnue')
    }
    setLoadingStats(false)
  }, [])

  const fetchCompanies = useCallback(async () => {
    setLoadingCompanies(true)
    setCompaniesError('')
    try {
      const params = new URLSearchParams({ page: String(compPage) })
      if (search) params.set('search', search)
      if (statusFilter) params.set('status', statusFilter)
      const r = await fetch('/api/admin/companies?' + params)
      if (!r.ok) { const d = await r.json(); throw new Error(d.error ?? `Erreur ${r.status}`) }
      const d = await r.json()
      setCompanies(d.data?.companies ?? [])
      setCompTotal(d.data?.total ?? 0)
    } catch (e: unknown) {
      setCompaniesError(e instanceof Error ? e.message : 'Erreur inconnue')
    }
    setLoadingCompanies(false)
  }, [compPage, search, statusFilter])

  const fetchPricing = useCallback(async () => {
    setLoadingPricing(true)
    try {
      const r = await fetch('/api/admin/pricing')
      if (r.ok) {
        const d = await r.json()
        setPricing(d.data)
        setEditedPrices({ plans: { ...d.data.effective.plans }, apps: { ...d.data.effective.apps } })
      }
    } catch { /* silent */ }
    setLoadingPricing(false)
  }, [])

  const fetchAppPricing = useCallback(async () => {
    setLoadingAppPricing(true)
    try {
      const r = await fetch('/api/admin/app-pricing')
      if (r.ok) {
        const d = await r.json()
        setAppPricing(d.data)
        const edited: Record<string, Record<string, number>> = {}
        for (const [appId, data] of Object.entries(d.data as Record<string, AppPricingData>)) {
          edited[appId] = { ...data.effective }
        }
        setEditedAppPrices(edited)
      }
    } catch { /* silent */ }
    setLoadingAppPricing(false)
  }, [])

  const fetchAppPayments = useCallback(async () => {
    setLoadingAppPayments(true)
    try {
      const r = await fetch('/api/admin/app-payments?status=PENDING')
      if (r.ok) { const d = await r.json(); setAppPayments(d.data?.payments ?? []) }
    } catch { /* silent */ }
    setLoadingAppPayments(false)
  }, [])

  const handleSaveAppPricing = async (appId: string) => {
    setSavingAppPricing(appId)
    const r = await fetch('/api/admin/app-pricing', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appId, prices: editedAppPrices[appId] }),
    })
    setSavingAppPricing(null)
    if (r.ok) { toast.success('Prix sauvegardés !'); fetchAppPricing() }
    else toast.error('Erreur sauvegarde')
  }

  const handleConfirmAppPayment = async () => {
    if (!confirmAppPaymentId) return
    setConfirmingAppPayment(true)
    const r = await fetch('/api/admin/app-grant', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'confirm_payment', paymentId: confirmAppPaymentId }),
    })
    setConfirmingAppPayment(false)
    if (r.ok) { toast.success('Paiement confirmé, abonnement activé !'); setConfirmAppPaymentId(null); fetchAppPayments() }
    else toast.error('Erreur lors de la confirmation')
  }

  const handleAppGrant = async () => {
    if (!appGrantDialog) return
    setAppGranting(true)
    const r = await fetch('/api/admin/app-grant', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: appGrantDialog.type,
        companyId: appGrantDialog.company.id,
        appId: appGrantAppId,
        planId: appGrantPlanId,
        months: appGrantMonths,
      }),
    })
    setAppGranting(false)
    if (r.ok) {
      toast.success(appGrantDialog.type === 'free' ? 'Pack offert !' : 'Pack activé !')
      setAppGrantDialog(null)
    } else {
      const d = await r.json(); toast.error(d.error ?? 'Erreur')
    }
  }

  useEffect(() => {
    if (status === 'authenticated' && isSuperAdmin) { fetchStats(); fetchCompanies(); fetchPricing(); fetchAppPricing(); fetchAppPayments() }
  }, [status, isSuperAdmin, fetchStats, fetchCompanies, fetchPricing, fetchAppPricing, fetchAppPayments])

  useEffect(() => {
    if (status === 'authenticated' && isSuperAdmin) fetchCompanies()
  }, [compPage, search, statusFilter, fetchCompanies, status, isSuperAdmin])

  const handleChangePlan = async (companyId: string, plan: string) => {
    const r = await fetch('/api/admin/companies', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ companyId, plan }),
    })
    if (r.ok) { toast.success('Plan mis à jour'); fetchCompanies() }
    else toast.error('Erreur lors de la mise à jour')
  }

  const handleGrant = async () => {
    if (!grantDialog) return
    setGranting(true)
    const r = await fetch('/api/admin/grant', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ companyId: grantDialog.company.id, type: grantDialog.type, planId: grantPlanId, months: grantMonths }),
    })
    setGranting(false)
    if (r.ok) {
      toast.success(grantDialog.type === 'free' ? 'Abonnement gratuit accordé !' : 'Abonnement activé !')
      setGrantDialog(null); fetchCompanies(); fetchStats()
    } else {
      const d = await r.json(); toast.error(d.error ?? 'Erreur')
    }
  }

  const handleConfirmCcp = async () => {
    if (!confirmCcpId) return
    setConfirmingCcp(true)
    const r = await fetch('/api/admin/grant', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'confirm_ccp', paymentId: confirmCcpId }),
    })
    setConfirmingCcp(false)
    if (r.ok) { toast.success('Paiement confirmé, abonnement activé !'); setConfirmCcpId(null); fetchStats(); fetchCompanies() }
    else toast.error('Erreur lors de la confirmation')
  }

  const handleSavePricing = async () => {
    if (!editedPrices) return
    setSavingPricing(true)
    const r = await fetch('/api/admin/pricing', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editedPrices),
    })
    setSavingPricing(false)
    if (r.ok) { toast.success('Tarification sauvegardée !'); fetchPricing() }
    else toast.error('Erreur lors de la sauvegarde')
  }

  if (status === 'loading' || (status === 'authenticated' && !isSuperAdmin)) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-500">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Vérification des accès...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">

      {/* ── Header ── */}
      <div className="bg-white border-b border-slate-100 sticky top-0 z-20 shadow-sm">
        <div className="max-w-screen-2xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-yelha-500 to-yelha-600 rounded-xl flex items-center justify-center shadow-sm">
              <ShieldCheck className="w-4.5 h-4.5 text-white" />
            </div>
            <div>
              <p className="font-semibold text-slate-900 text-sm leading-none">Panneau Admin</p>
              <p className="text-xs text-slate-400 mt-0.5">{session?.user?.email}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => { fetchStats(); fetchCompanies() }}
            className="gap-2 text-slate-600 border-slate-200">
            <RefreshCw className="w-3.5 h-3.5" />Actualiser
          </Button>
        </div>
      </div>

      <div className="max-w-screen-2xl mx-auto px-6 py-8">
        <Tabs defaultValue="overview">

          {/* Tab list */}
          <TabsList className="mb-8 bg-white border border-slate-200 p-1 rounded-xl shadow-sm h-auto gap-1">
            {[
              { value: 'overview',   icon: BarChart3,   label: 'Aperçu' },
              { value: 'companies',  icon: Building2,   label: 'Entreprises' },
              { value: 'pricing',    icon: DollarSign,  label: 'Tarification ERP' },
              { value: 'apps',       icon: Zap,         label: 'Applications' },
              { value: 'payments',   icon: CreditCard,  label: 'Paiements' },
            ].map(t => (
              <TabsTrigger key={t.value} value={t.value}
                className="gap-2 px-4 py-2.5 rounded-lg text-sm data-[state=active]:bg-slate-900 data-[state=active]:text-white data-[state=active]:shadow-sm transition-all">
                <t.icon className="w-3.5 h-3.5" />{t.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* ═══ APERÇU ═══════════════════════════════════════════════════════ */}
          <TabsContent value="overview" className="space-y-6">
            {statsError && <ErrorBanner message={statsError} onRetry={fetchStats} />}

            {/* KPI grid */}
            {loadingStats ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-36" />)}
              </div>
            ) : stats ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <KpiCard icon={Building2}    label="Entreprises"      value={stats.companies.total}            gradient="bg-blue-500"    sub={`+${stats.companies.newThisMonth} ce mois`} />
                  <KpiCard icon={CheckCircle2} label="Abonnements actifs" value={stats.companies.byStatus.active ?? 0} gradient="bg-emerald-500" />
                  <KpiCard icon={Clock}        label="En période d'essai" value={stats.companies.byStatus.trial ?? 0}  gradient="bg-amber-500"  />
                  <KpiCard icon={XCircle}      label="Annulés / Expirés"  value={(stats.companies.byStatus.cancelled ?? 0) + (stats.companies.byStatus.expired ?? 0)} gradient="bg-rose-500" />
                  <KpiCard icon={Users}        label="Utilisateurs total"  value={stats.users.total}              gradient="bg-violet-500"  />
                  <KpiCard icon={Activity}     label="MRR estimé"         value={fmt(stats.revenue.mrr)}         gradient="bg-yelha-500"   trend="Revenus récurrents" />
                  <KpiCard icon={DollarSign}   label="Encaissé ce mois"   value={fmt(stats.revenue.thisMonth)}   gradient="bg-teal-500"    sub={`${stats.revenue.paymentsThisMonth} paiements`} />
                  <KpiCard icon={AlertCircle}  label="Paiements en attente" value={stats.revenue.pendingPayments} gradient="bg-orange-500" />
                </div>

                {/* Status distribution */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                  <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-slate-400" />Distribution des abonnements
                  </h3>
                  <div className="flex flex-wrap gap-3">
                    {Object.entries(stats.companies.byStatus).filter(([, v]) => v > 0).map(([k, v]) => (
                      <div key={k} className="flex items-center gap-3 bg-slate-50 rounded-xl px-4 py-3 border border-slate-100">
                        <StatusPill status={k.toUpperCase()} />
                        <span className="font-bold text-xl text-slate-800">{v}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recent payments */}
                {stats.recentPayments.length > 0 && (
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-slate-400" />
                      <span className="font-semibold text-slate-800">Paiements récents</span>
                    </div>
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 border-b border-slate-100">
                        <tr>
                          {['Entreprise','Plan','Montant','Méthode','Statut','Date'].map(h => (
                            <th key={h} className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {stats.recentPayments.map(p => (
                          <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                            <td className="px-5 py-3.5 font-medium text-slate-800">{p.subscription.company.name}</td>
                            <td className="px-5 py-3.5 text-slate-500">{PLAN_EMOJI[p.planId]} {p.planId}</td>
                            <td className="px-5 py-3.5 font-semibold text-slate-800">{fmt(p.amount)}</td>
                            <td className="px-5 py-3.5">
                              <span className="text-xs bg-slate-100 text-slate-600 rounded-lg px-2.5 py-1 font-medium">{p.method}</span>
                            </td>
                            <td className="px-5 py-3.5">
                              <span className={`text-xs font-medium rounded-full px-2.5 py-1 ${p.status === 'PAID' || p.status === 'SUCCEEDED' ? 'bg-emerald-50 text-emerald-700' : p.status === 'PENDING' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-600'}`}>
                                {p.status}
                              </span>
                            </td>
                            <td className="px-5 py-3.5 text-xs text-slate-400">{fmtDate(p.createdAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            ) : !statsError ? (
              <div className="flex items-center justify-center h-48 text-slate-400 text-sm">Aucune donnée</div>
            ) : null}
          </TabsContent>

          {/* ═══ ENTREPRISES ══════════════════════════════════════════════════ */}
          <TabsContent value="companies" className="space-y-4">

            {/* Filters */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input placeholder="Rechercher par nom ou email..." value={search}
                  onChange={e => { setSearch(e.target.value); setCompPage(1) }}
                  className="pl-10 h-9 bg-slate-50 border-slate-200 focus:bg-white" />
              </div>
              <Select value={statusFilter || 'ALL'} onValueChange={v => { setStatusFilter(v === 'ALL' ? '' : v); setCompPage(1) }}>
                <SelectTrigger className="h-9 w-44 bg-slate-50 border-slate-200">
                  <SelectValue placeholder="Tous les statuts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tous les statuts</SelectItem>
                  {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-sm text-slate-400 ml-auto">{compTotal} entreprise{compTotal !== 1 ? 's' : ''}</span>
            </div>

            {companiesError && <ErrorBanner message={companiesError} onRetry={fetchCompanies} />}

            {/* Table */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              {loadingCompanies ? (
                <div className="p-6 space-y-3">
                  {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14" />)}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr>
                        {['Entreprise','Statut','Plan','Revenu / mois','Utilisateurs','Fin période','Actions'].map(h => (
                          <th key={h} className="text-left px-5 py-3.5 text-xs font-medium text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {companies.map(c => {
                        const sub = c.yelhaSubscription
                        const days = sub?.currentPeriodEnd ? daysLeft(sub.currentPeriodEnd) : null
                        return (
                          <tr key={c.id} className="hover:bg-slate-50/60 transition-colors group">
                            <td className="px-5 py-4">
                              <p className="font-semibold text-slate-800">{c.name}</p>
                              <p className="text-xs text-slate-400 mt-0.5">{c.email ?? '—'}</p>
                            </td>
                            <td className="px-5 py-4">
                              <StatusPill status={sub?.status ?? 'TRIAL'} />
                            </td>
                            <td className="px-5 py-4">
                              <Select value={c.plan} onValueChange={plan => handleChangePlan(c.id, plan)}>
                                <SelectTrigger className="h-8 w-36 text-xs bg-slate-50 border-slate-200">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {['TRIAL','STARTER','PRO','AGENCY','BUSINESS','ENTERPRISE'].map(p => (
                                    <SelectItem key={p} value={p}>{PLAN_EMOJI[p]} {p}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="px-5 py-4">
                              {sub ? (
                                sub.monthlyAmount === 0
                                  ? <span className="inline-flex items-center gap-1 text-xs font-semibold text-purple-600 bg-purple-50 px-2.5 py-1 rounded-lg"><Gift className="w-3 h-3" />Gratuit</span>
                                  : <span className="font-semibold text-slate-800">{fmt(sub.monthlyAmount)}</span>
                              ) : <span className="text-slate-400">—</span>}
                            </td>
                            <td className="px-5 py-4 text-slate-600">{c._count.users}</td>
                            <td className="px-5 py-4">
                              {sub?.currentPeriodEnd ? (
                                <div>
                                  <p className="text-xs text-slate-600">{fmtDate(sub.currentPeriodEnd)}</p>
                                  <p className={`text-xs font-medium mt-0.5 ${days !== null && days < 7 ? 'text-red-500' : 'text-slate-400'}`}>
                                    {days}j restants
                                  </p>
                                </div>
                              ) : <span className="text-slate-400">—</span>}
                            </td>
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-1.5">
                                <Button size="sm" variant="outline"
                                  className="h-7 px-2.5 text-xs gap-1 border-purple-200 text-purple-700 hover:bg-purple-50"
                                  onClick={() => { setGrantDialog({ company: c, type: 'free' }); setGrantPlanId(sub?.planId ?? 'pro'); setGrantMonths(1) }}>
                                  <Gift className="w-3 h-3" />Gratuit
                                </Button>
                                <Button size="sm" variant="outline"
                                  className="h-7 px-2.5 text-xs gap-1 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                                  onClick={() => { setGrantDialog({ company: c, type: 'activate' }); setGrantPlanId(sub?.planId ?? 'pro'); setGrantMonths(1) }}>
                                  <Zap className="w-3 h-3" />Activer
                                </Button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                      {companies.length === 0 && !loadingCompanies && (
                        <tr>
                          <td colSpan={7} className="py-16 text-center">
                            <Building2 className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                            <p className="text-slate-400 text-sm">Aucune entreprise trouvée</p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {compTotal > 25 && (
                <div className="border-t border-slate-100 px-5 py-3.5 flex items-center justify-between bg-slate-50/50">
                  <p className="text-xs text-slate-500">Page {compPage} / {Math.ceil(compTotal / 25)}</p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="h-7 text-xs" disabled={compPage === 1} onClick={() => setCompPage(p => p - 1)}>← Précédent</Button>
                    <Button size="sm" variant="outline" className="h-7 text-xs" disabled={compPage >= Math.ceil(compTotal / 25)} onClick={() => setCompPage(p => p + 1)}>Suivant →</Button>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          {/* ═══ TARIFICATION ════════════════════════════════════════════════ */}
          <TabsContent value="pricing" className="space-y-6">
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-3.5 flex items-center gap-3 text-sm text-amber-800">
              <AlertCircle className="w-4 h-4 shrink-0" />
              Les prix modifiés s'appliquent aux nouveaux abonnements uniquement.
            </div>

            {loadingPricing || !editedPrices ? (
              <div className="grid md:grid-cols-2 gap-6">
                <Skeleton className="h-96" /><Skeleton className="h-96" />
              </div>
            ) : (
              <>
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Plans */}
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/80">
                      <h3 className="font-semibold text-slate-800">Abonnements</h3>
                      <p className="text-xs text-slate-400 mt-0.5">Prix mensuel en DA</p>
                    </div>
                    <div className="p-6 space-y-5">
                      {Object.entries(PLANS).filter(([id]) => id !== 'trial').map(([id, plan]) => {
                        const isModified = pricing && editedPrices.plans[id] !== pricing.defaults.plans[id]
                        return (
                          <div key={id} className="flex items-center gap-4">
                            <span className="text-2xl">{PLAN_EMOJI[id]}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-slate-800">{plan.name}</p>
                              <p className="text-xs text-slate-400 truncate">{plan.description}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              {isModified && <ChevronRight className="w-3.5 h-3.5 text-yelha-500" />}
                              <div className="relative">
                                <Input type="number" min={0}
                                  value={editedPrices.plans[id] ?? 0}
                                  onChange={e => setEditedPrices(prev => prev ? { ...prev, plans: { ...prev.plans, [id]: Number(e.target.value) } } : prev)}
                                  className={`w-28 h-9 text-sm text-right pr-10 ${isModified ? 'border-yelha-300 bg-yelha-50' : 'bg-slate-50'}`}
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">DA</span>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Apps */}
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/80">
                      <h3 className="font-semibold text-slate-800">Applications extras</h3>
                      <p className="text-xs text-slate-400 mt-0.5">Prix par module / mois</p>
                    </div>
                    <div className="p-6 space-y-4">
                      {Object.entries(APPS).filter(([, a]) => !a.core).map(([id, app]) => {
                        const isModified = pricing && editedPrices.apps[id] !== pricing.defaults.apps[id]
                        return (
                          <div key={id} className="flex items-center gap-3">
                            <span className="text-xl w-7 text-center">{app.icon}</span>
                            <p className="flex-1 text-sm font-medium text-slate-700 truncate">{app.name}</p>
                            <div className="flex items-center gap-2">
                              {isModified && <ChevronRight className="w-3 h-3 text-yelha-500" />}
                              <div className="relative">
                                <Input type="number" min={0}
                                  value={editedPrices.apps[id] ?? 0}
                                  onChange={e => setEditedPrices(prev => prev ? { ...prev, apps: { ...prev.apps, [id]: Number(e.target.value) } } : prev)}
                                  className={`w-24 h-8 text-sm text-right pr-8 ${isModified ? 'border-yelha-300 bg-yelha-50' : 'bg-slate-50'}`}
                                />
                                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">DA</span>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <Button variant="outline" onClick={() => { if (pricing) setEditedPrices({ plans: { ...pricing.defaults.plans }, apps: { ...pricing.defaults.apps } }) }}
                    className="text-slate-600 border-slate-200">
                    Réinitialiser par défaut
                  </Button>
                  <Button onClick={handleSavePricing} disabled={savingPricing}
                    className="gap-2 bg-slate-900 hover:bg-slate-800 text-white">
                    {savingPricing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Sauvegarder les prix
                  </Button>
                </div>
              </>
            )}
          </TabsContent>

          {/* ═══ APPLICATIONS ════════════════════════════════════════════════ */}
          <TabsContent value="apps" className="space-y-6">
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-3.5 flex items-center gap-3 text-sm text-amber-800">
              <AlertCircle className="w-4 h-4 shrink-0" />
              Ces prix s'appliquent aux abonnements indépendants par application (hors plan ERP global).
            </div>

            {/* Paiements CCP apps en attente */}
            {!loadingAppPayments && appPayments.length > 0 && (
              <div className="bg-white rounded-2xl border border-amber-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-amber-100 bg-amber-50/50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-500" />
                    <span className="font-semibold text-slate-800">Paiements CCP en attente</span>
                  </div>
                  <span className="text-xs bg-amber-100 text-amber-700 rounded-full px-3 py-1 font-semibold">
                    {appPayments.length} en attente
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr>
                        {['Entreprise','App','Plan','Montant','Référence','Date','Action'].map(h => (
                          <th key={h} className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {appPayments.map(p => (
                        <tr key={p.id} className="hover:bg-slate-50/60">
                          <td className="px-5 py-3.5 font-semibold text-slate-800">{p.appSubscription.company.name}</td>
                          <td className="px-5 py-3.5">
                            <span className="text-xs bg-indigo-50 text-indigo-700 rounded-lg px-2.5 py-1 font-medium">{p.appId}</span>
                          </td>
                          <td className="px-5 py-3.5 text-slate-600">{p.planId}</td>
                          <td className="px-5 py-3.5 font-bold text-slate-800">{fmt(p.amount)}</td>
                          <td className="px-5 py-3.5">
                            <code className="text-xs font-mono text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">{p.ccpRef ?? '—'}</code>
                          </td>
                          <td className="px-5 py-3.5 text-xs text-slate-400">{fmtDate(p.createdAt)}</td>
                          <td className="px-5 py-3.5">
                            <Button size="sm" variant="outline"
                              className="h-7 text-xs gap-1 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                              onClick={() => setConfirmAppPaymentId(p.id)}>
                              <CheckCircle2 className="w-3 h-3" />Confirmer
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Éditeur de prix par app */}
            {loadingAppPricing ? (
              <div className="grid md:grid-cols-2 gap-6">
                <Skeleton className="h-72" />
              </div>
            ) : appPricing ? (
              <div className="grid md:grid-cols-2 gap-6">
                {Object.entries(APP_PLANS).map(([appId, appConfig]) => {
                  const data = appPricing[appId]
                  const edited = editedAppPrices[appId] ?? {}
                  return (
                    <div key={appId} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                      <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/80">
                        <h3 className="font-semibold text-slate-800">{appConfig.appName}</h3>
                        <p className="text-xs text-slate-400 mt-0.5">Prix par plan en DA/mois</p>
                      </div>
                      <div className="p-6 space-y-4">
                        {Object.entries(appConfig.plans).filter(([id]) => id !== 'trial').map(([planId, plan]) => {
                          const isModified = data && edited[planId] !== data.defaults[planId]
                          return (
                            <div key={planId} className="flex items-center gap-4">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-slate-800">{(plan as { name: string }).name}</p>
                                <p className="text-xs text-slate-400">{(plan as { description: string }).description}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                {isModified && <ChevronRight className="w-3.5 h-3.5 text-yelha-500" />}
                                <div className="relative">
                                  <Input type="number" min={0}
                                    value={edited[planId] ?? (plan as { price: number }).price}
                                    onChange={e => setEditedAppPrices(prev => ({
                                      ...prev,
                                      [appId]: { ...(prev[appId] ?? {}), [planId]: Number(e.target.value) },
                                    }))}
                                    className={`w-28 h-9 text-sm text-right pr-10 ${isModified ? 'border-yelha-300 bg-yelha-50' : 'bg-slate-50'}`}
                                  />
                                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">DA</span>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                      <div className="px-6 pb-5 flex gap-3">
                        <Button variant="outline" size="sm" className="text-slate-600 border-slate-200 flex-1"
                          onClick={() => {
                            if (data) setEditedAppPrices(prev => ({ ...prev, [appId]: { ...data.defaults } }))
                          }}>
                          Réinitialiser
                        </Button>
                        <Button size="sm" className="gap-1.5 bg-slate-900 hover:bg-slate-800 text-white flex-1"
                          disabled={savingAppPricing === appId}
                          onClick={() => handleSaveAppPricing(appId)}>
                          {savingAppPricing === appId ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                          Sauvegarder
                        </Button>
                      </div>

                      {/* Offrir / Activer un pack pour une entreprise */}
                      <div className="px-6 pb-6 border-t border-slate-100 pt-4">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Accorder un pack à une entreprise</p>
                        <div className="flex gap-2 flex-wrap">
                          <Button size="sm" variant="outline"
                            className="gap-1.5 border-purple-200 text-purple-700 hover:bg-purple-50"
                            onClick={() => { setAppGrantDialog({ company: companies[0] ?? { id: '', name: '', plan: '', email: null, wilaya: null, trialEndsAt: null, createdAt: '', _count: { users: 0, invoices: 0 }, yelhaSubscription: null }, type: 'free' }); setAppGrantAppId(appId); setAppGrantPlanId('starter') }}>
                            <Gift className="w-3 h-3" />Offrir gratuit
                          </Button>
                          <Button size="sm" variant="outline"
                            className="gap-1.5 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                            onClick={() => { setAppGrantDialog({ company: companies[0] ?? { id: '', name: '', plan: '', email: null, wilaya: null, trialEndsAt: null, createdAt: '', _count: { users: 0, invoices: 0 }, yelhaSubscription: null }, type: 'activate' }); setAppGrantAppId(appId); setAppGrantPlanId('starter') }}>
                            <Zap className="w-3 h-3" />Activer (payé)
                          </Button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : null}
          </TabsContent>

          {/* ═══ PAIEMENTS ═══════════════════════════════════════════════════ */}
          <TabsContent value="payments">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-slate-400" />
                  <span className="font-semibold text-slate-800">Historique des paiements</span>
                </div>
                {stats && stats.revenue.pendingPayments > 0 && (
                  <span className="text-xs bg-amber-100 text-amber-700 rounded-full px-3 py-1 font-semibold">
                    {stats.revenue.pendingPayments} en attente
                  </span>
                )}
              </div>

              {loadingStats ? (
                <div className="p-6 space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr>
                        {['Entreprise','Plan','Montant','Méthode','Référence','Statut','Date','Actions'].map(h => (
                          <th key={h} className="text-left px-5 py-3.5 text-xs font-medium text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {stats?.recentPayments.map(p => (
                        <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-5 py-4 font-semibold text-slate-800">{p.subscription.company.name}</td>
                          <td className="px-5 py-4 text-slate-500">{PLAN_EMOJI[p.planId]} {p.planId}</td>
                          <td className="px-5 py-4 font-semibold text-slate-800">{fmt(p.amount)}</td>
                          <td className="px-5 py-4">
                            <span className={`text-xs rounded-lg px-2.5 py-1 font-medium ${p.method === 'CCP' ? 'bg-blue-50 text-blue-700' : p.method.startsWith('ADMIN') ? 'bg-purple-50 text-purple-700' : 'bg-slate-100 text-slate-600'}`}>
                              {p.method}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-xs font-mono text-slate-400">{p.ccpRef ?? p.id.slice(0, 10)}</td>
                          <td className="px-5 py-4">
                            <span className={`text-xs font-semibold rounded-full px-2.5 py-1 ${p.status === 'PAID' || p.status === 'SUCCEEDED' ? 'bg-emerald-50 text-emerald-700' : p.status === 'PENDING' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-600'}`}>
                              {p.status}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-xs text-slate-400 whitespace-nowrap">{fmtDate(p.createdAt)}</td>
                          <td className="px-5 py-4">
                            {p.status === 'PENDING' && p.method === 'CCP' && (
                              <Button size="sm" variant="outline"
                                className="h-7 text-xs gap-1 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                                onClick={() => setConfirmCcpId(p.id)}>
                                <CheckCircle2 className="w-3 h-3" />Confirmer
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                      {!stats?.recentPayments.length && (
                        <tr>
                          <td colSpan={8} className="py-16 text-center">
                            <CreditCard className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                            <p className="text-slate-400 text-sm">Aucun paiement</p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* ── Dialog : Offrir / Activer ──────────────────────────────────────── */}
      <Dialog open={!!grantDialog} onOpenChange={() => setGrantDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${grantDialog?.type === 'free' ? 'bg-purple-100' : 'bg-emerald-100'}`}>
                {grantDialog?.type === 'free' ? <Gift className="w-4 h-4 text-purple-600" /> : <Zap className="w-4 h-4 text-emerald-600" />}
              </div>
              {grantDialog?.type === 'free' ? 'Offrir un abonnement gratuit' : "Activer l'abonnement"}
            </DialogTitle>
          </DialogHeader>

          {grantDialog && (
            <div className="space-y-4 pt-1">
              <div className="bg-slate-50 rounded-xl px-4 py-3 border border-slate-100">
                <p className="font-semibold text-slate-800">{grantDialog.company.name}</p>
                <p className="text-xs text-slate-500 mt-0.5">Statut actuel : <StatusPill status={grantDialog.company.yelhaSubscription?.status ?? 'TRIAL'} /></p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-slate-600">Plan</Label>
                  <Select value={grantPlanId} onValueChange={setGrantPlanId}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(PLANS).filter(([id]) => id !== 'trial').map(([id, p]) => (
                        <SelectItem key={id} value={id}>{PLAN_EMOJI[id]} {p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-slate-600">Durée</Label>
                  <Select value={String(grantMonths)} onValueChange={v => setGrantMonths(Number(v))}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[1,2,3,6,12,24].map(m => (
                        <SelectItem key={m} value={String(m)}>{m} mois{m === 12 ? ' (1 an)' : m === 24 ? ' (2 ans)' : ''}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className={`rounded-xl px-4 py-3 text-sm border ${grantDialog.type === 'free' ? 'bg-purple-50 border-purple-100 text-purple-800' : 'bg-emerald-50 border-emerald-100 text-emerald-800'}`}>
                {grantDialog.type === 'free'
                  ? <>Plan <strong>{PLANS[grantPlanId as keyof typeof PLANS]?.name}</strong> — <strong>0 DA</strong> pendant {grantMonths} mois</>
                  : <>Plan <strong>{PLANS[grantPlanId as keyof typeof PLANS]?.name}</strong> activé pour {grantMonths} mois</>
                }
              </div>
            </div>
          )}

          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={() => setGrantDialog(null)} className="flex-1">Annuler</Button>
            <Button onClick={handleGrant} disabled={granting} className={`flex-1 gap-2 ${grantDialog?.type === 'free' ? 'bg-purple-600 hover:bg-purple-700' : 'bg-emerald-600 hover:bg-emerald-700'} text-white`}>
              {granting ? <Loader2 className="w-4 h-4 animate-spin" /> : grantDialog?.type === 'free' ? <Gift className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
              {grantDialog?.type === 'free' ? 'Offrir gratuitement' : 'Activer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog : App Grant ────────────────────────────────────────────── */}
      <Dialog open={!!appGrantDialog} onOpenChange={() => setAppGrantDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${appGrantDialog?.type === 'free' ? 'bg-purple-100' : 'bg-emerald-100'}`}>
                {appGrantDialog?.type === 'free' ? <Gift className="w-4 h-4 text-purple-600" /> : <Zap className="w-4 h-4 text-emerald-600" />}
              </div>
              {appGrantDialog?.type === 'free' ? 'Offrir un pack app gratuit' : 'Activer un pack app'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <div className="space-y-2">
              <Label className="text-xs font-medium text-slate-600">Entreprise</Label>
              <Select
                value={appGrantDialog?.company.id ?? ''}
                onValueChange={id => {
                  const c = companies.find(c => c.id === id)
                  if (c && appGrantDialog) setAppGrantDialog({ ...appGrantDialog, company: c })
                }}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Choisir une entreprise" /></SelectTrigger>
                <SelectContent>
                  {companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-medium text-slate-600">Plan</Label>
                <Select value={appGrantPlanId} onValueChange={setAppGrantPlanId}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {appGrantAppId in APP_PLANS && Object.entries(APP_PLANS[appGrantAppId as keyof typeof APP_PLANS].plans)
                      .filter(([id]) => id !== 'trial')
                      .map(([id, p]) => (
                        <SelectItem key={id} value={id}>{(p as { name: string }).name}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium text-slate-600">Durée</Label>
                <Select value={String(appGrantMonths)} onValueChange={v => setAppGrantMonths(Number(v))}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[1,2,3,6,12].map(m => <SelectItem key={m} value={String(m)}>{m} mois</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={() => setAppGrantDialog(null)} className="flex-1">Annuler</Button>
            <Button onClick={handleAppGrant} disabled={appGranting || !appGrantDialog?.company.id}
              className={`flex-1 gap-2 ${appGrantDialog?.type === 'free' ? 'bg-purple-600 hover:bg-purple-700' : 'bg-emerald-600 hover:bg-emerald-700'} text-white`}>
              {appGranting ? <Loader2 className="w-4 h-4 animate-spin" /> : appGrantDialog?.type === 'free' ? <Gift className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
              {appGrantDialog?.type === 'free' ? 'Offrir' : 'Activer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog : Confirmer paiement App CCP ─────────────────────────── */}
      <Dialog open={!!confirmAppPaymentId} onOpenChange={() => setConfirmAppPaymentId(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              Confirmer le paiement CCP (App)
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-3">
            <p className="text-sm text-slate-600">Confirmez-vous avoir reçu le virement CCP pour l'abonnement application ?</p>
            <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-xs text-amber-700">
              Cette action est irréversible. Vérifiez la réception du virement avant de confirmer.
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmAppPaymentId(null)} className="flex-1">Annuler</Button>
            <Button onClick={handleConfirmAppPayment} disabled={confirmingAppPayment}
              className="flex-1 gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
              {confirmingAppPayment ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Confirmer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog : Confirmer CCP ─────────────────────────────────────────── */}
      <Dialog open={!!confirmCcpId} onOpenChange={() => setConfirmCcpId(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              Confirmer le paiement CCP
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-3">
            <p className="text-sm text-slate-600">Confirmez-vous avoir reçu le virement CCP ? L'abonnement sera activé automatiquement.</p>
            <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-xs text-amber-700">
              Cette action est irréversible. Vérifiez la réception du virement avant de confirmer.
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmCcpId(null)} className="flex-1">Annuler</Button>
            <Button onClick={handleConfirmCcp} disabled={confirmingCcp}
              className="flex-1 gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
              {confirmingCcp ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Confirmer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
