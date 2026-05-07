'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, CreditCard, Zap, AlertTriangle, Plus, X, CheckCircle, Clock, TrendingUp, Package } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PLANS, APPS, type PlanId, type AppId, isAppIncluded } from '@/lib/pricing/config'
import { formatDA } from '@/lib/algerian/format'

// ── Types ──────────────────────────────────────────────────────

interface SubscriptionData {
  id: string
  planId: PlanId
  status: 'TRIAL' | 'ACTIVE' | 'PAST_DUE' | 'EXPIRED' | 'CANCELLED' | 'PAUSED'
  billingCycle: 'MONTHLY' | 'ANNUAL'
  currentPeriodStart: string
  currentPeriodEnd: string
  trialEndsAt: string | null
  trialApps: string[]
  extraApps: string[]
  usageEmails: number
  usageApiReq: number
  usageAiReq: number
  usageResetAt: string
  payments?: Array<{
    id: string
    createdAt: string
    planId: string
    amount: number
    method: string
    status: string
  }>
}

// ── Helpers ────────────────────────────────────────────────────

const CORE_APPS: AppId[] = ['invoices', 'quotes', 'clients', 'stock', 'expenses']

function statusBadge(status: SubscriptionData['status']) {
  const map: Record<SubscriptionData['status'], { label: string; className: string }> = {
    TRIAL:    { label: 'Essai gratuit', className: 'bg-amber-100 text-amber-800 border-amber-200' },
    ACTIVE:   { label: 'Actif',         className: 'bg-green-100 text-green-800 border-green-200' },
    PAST_DUE: { label: 'Paiement dû',   className: 'bg-red-100 text-red-800 border-red-200' },
    EXPIRED:  { label: 'Expiré',        className: 'bg-slate-100 text-slate-600 border-slate-200' },
    CANCELLED:{ label: 'Résilié',       className: 'bg-slate-100 text-slate-500 border-slate-200' },
    PAUSED:   { label: 'En pause',      className: 'bg-blue-100 text-blue-700 border-blue-200' },
  }
  const s = map[status]
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${s.className}`}>
      {s.label}
    </span>
  )
}

function UsageBar({ label, used, limit, resetDate }: { label: string; used: number; limit: number; resetDate: string }) {
  const pct = limit === -1 ? 0 : Math.min(100, Math.round((used / limit) * 100))
  const color = limit === -1 ? 'bg-green-500' : pct > 90 ? 'bg-red-500' : pct > 70 ? 'bg-amber-500' : 'bg-green-500'
  const textColor = limit === -1 ? 'text-green-600' : pct > 90 ? 'text-red-600' : pct > 70 ? 'text-amber-600' : 'text-green-600'
  const displayLimit = limit === -1 ? '∞' : limit.toLocaleString('fr-DZ')
  const displayUsed = used.toLocaleString('fr-DZ')
  const reset = new Date(resetDate).toLocaleDateString('fr-DZ', { day: 'numeric', month: 'long' })

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-foreground">{label}</span>
        <span className={`font-semibold ${textColor}`}>{displayUsed} / {displayLimit}</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: limit === -1 ? '5%' : `${pct}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground">Réinitialisation le {reset}</p>
    </div>
  )
}

// ── Add App Modal ──────────────────────────────────────────────

function AddAppModal({
  sub,
  onAdd,
}: {
  sub: SubscriptionData
  onAdd: (appId: AppId) => Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState<AppId | null>(null)

  const planId = sub.planId
  const activeSet = new Set<string>([
    ...CORE_APPS,
    ...sub.extraApps,
    ...sub.trialApps,
    ...(Object.keys(APPS) as AppId[]).filter(a => isAppIncluded(planId, a)),
  ])
  const available = (Object.keys(APPS) as AppId[]).filter(a => !activeSet.has(a) && !CORE_APPS.includes(a))

  if (available.length === 0) return null

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} className="gap-1.5">
        <Plus className="h-3.5 w-3.5" />Ajouter une app
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setOpen(false)}>
          <div className="bg-background border border-border rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h3 className="font-semibold text-lg">Ajouter une application</h3>
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-4 space-y-2 max-h-96 overflow-y-auto">
              {available.map(appId => {
                const app = APPS[appId]
                return (
                  <div key={appId} className="flex items-center justify-between p-3 rounded-xl border border-border hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{app.icon}</span>
                      <div>
                        <p className="text-sm font-medium">{app.name}</p>
                        <p className="text-xs text-muted-foreground">{app.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-3">
                      <span className="text-xs font-semibold da-amount text-foreground">
                        {app.price === 0 ? 'Gratuit' : `+${formatDA(app.price)}/mois`}
                      </span>
                      <Button
                        size="sm"
                        disabled={loading === appId}
                        onClick={async () => {
                          setLoading(appId)
                          await onAdd(appId)
                          setLoading(null)
                          setOpen(false)
                        }}
                      >
                        {loading === appId ? '...' : 'Ajouter'}
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ── Cancel Dialog ──────────────────────────────────────────────

function CancelDialog({ onConfirm }: { onConfirm: (reason: string) => Promise<void> }) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)

  return (
    <>
      <Button variant="destructive" size="sm" onClick={() => setOpen(true)}>
        Résilier mon abonnement
      </Button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background rounded-xl border border-border shadow-2xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-foreground mb-2">Résilier votre abonnement ?</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Cette action est irréversible. Vos données seront conservées 30 jours après la résiliation.
              Votre accès prendra fin à la fin de la période en cours.
            </p>
            <div className="mb-4">
              <label className="text-sm font-medium text-foreground block mb-1.5">Raison (optionnel)</label>
              <textarea
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="Dites-nous pourquoi vous partez…"
                rows={3}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" size="sm" onClick={() => setOpen(false)}>Annuler</Button>
              <Button
                variant="destructive" size="sm"
                disabled={loading}
                onClick={async () => {
                  setLoading(true)
                  await onConfirm(reason)
                  setLoading(false)
                  setOpen(false)
                }}
              >
                {loading ? 'Résiliation…' : 'Confirmer la résiliation'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ── Main Page ──────────────────────────────────────────────────

export default function BillingPage() {
  const [sub, setSub] = useState<SubscriptionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [removingApp, setRemovingApp] = useState<AppId | null>(null)

  useEffect(() => {
    fetch('/api/billing/subscription')
      .then(r => r.json())
      .then(d => {
        if (d.subscription) setSub(d.subscription)
        else setError("Impossible de charger l'abonnement.")
      })
      .catch(() => setError('Erreur réseau.'))
      .finally(() => setLoading(false))
  }, [])

  const handleAddApp = async (appId: AppId) => {
    const res = await fetch('/api/billing/subscription', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ addApps: [appId] }),
    })
    const d = await res.json()
    if (d.subscription) setSub(d.subscription)
  }

  const handleRemoveApp = async (appId: AppId) => {
    setRemovingApp(appId)
    const res = await fetch('/api/billing/subscription', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ removeApps: [appId] }),
    })
    const d = await res.json()
    if (d.subscription) setSub(d.subscription)
    setRemovingApp(null)
  }

  const handleCancel = async (reason: string) => {
    await fetch('/api/billing/cancel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    })
    window.location.reload()
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[300px]">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">Chargement de votre abonnement…</p>
        </div>
      </div>
    )
  }

  if (error || !sub) {
    return (
      <div className="p-6">
        <nav className="text-sm text-muted-foreground"><Link href="/dashboard/settings" className="hover:text-foreground">Paramètres</Link> / Facturation</nav>
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
          <p className="text-red-700 font-medium">{error || 'Abonnement introuvable'}</p>
        </div>
      </div>
    )
  }

  const planId = sub.planId
  const plan = PLANS[planId]
  const periodStart = new Date(sub.currentPeriodStart)
  const periodEnd = new Date(sub.currentPeriodEnd)
  const now = new Date()
  const totalDays = Math.max(1, Math.round((periodEnd.getTime() - periodStart.getTime()) / 86400000))
  const elapsedDays = Math.max(0, Math.round((now.getTime() - periodStart.getTime()) / 86400000))
  const progressPct = Math.min(100, Math.round((elapsedDays / totalDays) * 100))

  // Classify active apps
  const includedApps = (Object.keys(APPS) as AppId[]).filter(a => isAppIncluded(planId, a))
  const extraActiveApps = sub.extraApps.filter(a => !CORE_APPS.includes(a as AppId) && !includedApps.includes(a as AppId)) as AppId[]
  const trialActiveApps = sub.status === 'TRIAL' ? sub.trialApps as AppId[] : []

  const limits = plan.limits

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('fr-DZ', { day: 'numeric', month: 'long', year: 'numeric' })

  const methodLabel: Record<string, string> = {
    CHARGILY: 'Chargily Pay',
    CCP: 'Virement CCP',
    CARD: 'Carte bancaire',
    CASH: 'Espèces',
    FREE: 'Gratuit',
  }

  const paymentStatusBadge = (s: string) => {
    if (s === 'PAID' || s === 'SUCCEEDED') return <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded-full"><CheckCircle className="h-3 w-3" />Payé</span>
    if (s === 'PENDING') return <span className="text-xs font-medium text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">En attente</span>
    return <span className="text-xs font-medium text-red-700 bg-red-100 px-2 py-0.5 rounded-full">Échoué</span>
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-4xl">
      <nav className="text-sm text-muted-foreground"><Link href="/dashboard/settings" className="hover:text-foreground">Paramètres</Link> / Facturation</nav>

      <div className="flex items-center gap-3">
        <Link href="/dashboard/settings">
          <Button variant="outline" size="sm"><ArrowLeft className="w-4 h-4" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Abonnement & facturation</h1>
          <p className="text-muted-foreground text-sm">Gérez votre plan, vos apps et vos paiements</p>
        </div>
      </div>

      {/* ── 1. Plan actuel ── */}
      <section className="rounded-2xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <CreditCard className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-lg">Plan actuel</h2>
              <p className="text-muted-foreground text-sm">{plan.name} — {plan.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {statusBadge(sub.status)}
            {plan.price > 0 && (
              <span className="text-sm font-semibold da-amount">{formatDA(plan.price)}/mois</span>
            )}
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-4 text-sm">
          <div className="bg-muted/40 rounded-xl p-3">
            <p className="text-xs text-muted-foreground mb-0.5">Cycle de facturation</p>
            <p className="font-medium">{sub.billingCycle === 'ANNUAL' ? 'Annuel' : 'Mensuel'}</p>
          </div>
          <div className="bg-muted/40 rounded-xl p-3">
            <p className="text-xs text-muted-foreground mb-0.5">
              {sub.status === 'TRIAL' ? 'Fin de l\'essai' : 'Prochaine facturation'}
            </p>
            <p className="font-medium">
              {sub.status === 'TRIAL' && sub.trialEndsAt
                ? formatDate(sub.trialEndsAt)
                : formatDate(sub.currentPeriodEnd)}
            </p>
          </div>
          <div className="bg-muted/40 rounded-xl p-3">
            <p className="text-xs text-muted-foreground mb-0.5">Période</p>
            <p className="font-medium">{formatDate(sub.currentPeriodStart)} → {formatDate(sub.currentPeriodEnd)}</p>
          </div>
        </div>

        {/* Period progress bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Début</span>
            <span className="font-medium text-foreground">{progressPct}% écoulé ({elapsedDays}/{totalDays} jours)</span>
            <span>Fin</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progressPct}%` }} />
          </div>
        </div>
      </section>

      {/* ── 2. Usage du mois ── */}
      <section className="rounded-2xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-center gap-3 mb-1">
          <TrendingUp className="h-5 w-5 text-muted-foreground" />
          <h2 className="font-semibold text-lg">Usage du mois</h2>
        </div>
        <div className="grid sm:grid-cols-2 gap-6">
          <UsageBar
            label="Emails envoyés"
            used={sub.usageEmails ?? 0}
            limit={limits.emails}
            resetDate={sub.usageResetAt ?? new Date().toISOString()}
          />
          <UsageBar
            label="Requêtes API"
            used={sub.usageApiReq ?? 0}
            limit={limits.apiRequests}
            resetDate={sub.usageResetAt ?? new Date().toISOString()}
          />
          <UsageBar
            label="Requêtes IA"
            used={sub.usageAiReq ?? 0}
            limit={limits.aiRequests}
            resetDate={sub.usageResetAt ?? new Date().toISOString()}
          />
        </div>
      </section>

      {/* ── 3. Apps actives ── */}
      <section className="rounded-2xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Package className="h-5 w-5 text-muted-foreground" />
            <h2 className="font-semibold text-lg">Applications actives</h2>
          </div>
          <AddAppModal sub={sub} onAdd={handleAddApp} />
        </div>

        <div className="flex flex-wrap gap-2">
          {/* Core apps */}
          {CORE_APPS.map(appId => (
            <span
              key={appId}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200"
            >
              <span>{APPS[appId].icon}</span>
              {APPS[appId].name}
              <span className="text-slate-400 text-[10px] ml-0.5">✓ Inclus</span>
            </span>
          ))}

          {/* Plan-included apps */}
          {includedApps.map(appId => (
            <span
              key={appId}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200"
            >
              <span>{APPS[appId].icon}</span>
              {APPS[appId].name}
            </span>
          ))}

          {/* Extra (à la carte) apps */}
          {extraActiveApps.map(appId => (
            <span
              key={appId}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200"
            >
              <span>{APPS[appId].icon}</span>
              {APPS[appId].name}
              <span className="da-amount text-[10px] text-green-600">+{formatDA(APPS[appId].price)}</span>
              <button
                onClick={() => handleRemoveApp(appId)}
                disabled={removingApp === appId}
                className="ml-0.5 text-green-600 hover:text-red-600 transition-colors disabled:opacity-40"
                title="Retirer cette app"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}

          {/* Trial apps */}
          {trialActiveApps.map(appId => (
            <span
              key={appId}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 border border-purple-200"
            >
              <span>{APPS[appId]?.icon}</span>
              {APPS[appId]?.name}
              <span className="text-purple-500 text-[10px] ml-0.5">Essai</span>
            </span>
          ))}
        </div>
      </section>

      {/* ── 4. Changer de plan ── */}
      <section className="rounded-2xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-center gap-3 mb-1">
          <Zap className="h-5 w-5 text-muted-foreground" />
          <h2 className="font-semibold text-lg">Changer de plan</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {(Object.keys(PLANS) as PlanId[]).map(pid => {
            const p = PLANS[pid]
            const isCurrent = pid === planId
            return (
              <div
                key={pid}
                className={`relative rounded-xl border-2 p-3 text-center transition-all ${isCurrent ? 'border-primary bg-primary/5 shadow-sm' : 'border-border hover:border-border/80'}`}
              >
                {isCurrent && (
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap">
                    Plan actuel
                  </span>
                )}
                <p className="font-semibold text-sm mb-1">{p.name}</p>
                <p className="text-xs text-muted-foreground mb-2">
                  {p.price === 0 ? 'Gratuit' : <span className="da-amount">{formatDA(p.price)}/mois</span>}
                </p>
                {!isCurrent && (
                  <Link href={`/subscriptions/checkout?plan=${pid}`}>
                    <Button size="sm" variant="outline" className="w-full text-xs h-7">
                      Passer →
                    </Button>
                  </Link>
                )}
              </div>
            )
          })}
        </div>
      </section>

      {/* ── 5. Historique des paiements ── */}
      {sub.payments && sub.payments.length > 0 && (
        <section className="rounded-2xl border border-border bg-card p-5 space-y-4">
          <div className="flex items-center gap-3 mb-1">
            <Clock className="h-5 w-5 text-muted-foreground" />
            <h2 className="font-semibold text-lg">Historique des paiements</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground border-b border-border">
                  <th className="pb-2 pr-4 font-medium">Date</th>
                  <th className="pb-2 pr-4 font-medium">Plan</th>
                  <th className="pb-2 pr-4 font-medium">Montant</th>
                  <th className="pb-2 pr-4 font-medium">Méthode</th>
                  <th className="pb-2 font-medium">Statut</th>
                </tr>
              </thead>
              <tbody>
                {sub.payments.map((p, i) => (
                  <tr key={p.id} className={`${i > 0 ? 'border-t border-border' : ''}`}>
                    <td className="py-2.5 pr-4 text-foreground">
                      {new Date(p.createdAt).toLocaleDateString('fr-DZ', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="py-2.5 pr-4 font-medium">{p.planId}</td>
                    <td className="py-2.5 pr-4 da-amount font-semibold">{formatDA(p.amount)}</td>
                    <td className="py-2.5 pr-4 text-muted-foreground">{methodLabel[p.method] ?? p.method}</td>
                    <td className="py-2.5">{paymentStatusBadge(p.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ── 6. Danger zone ── */}
      <section className="rounded-2xl border-2 border-red-200 bg-red-50/30 p-5 space-y-3">
        <div className="flex items-center gap-2 text-red-700">
          <AlertTriangle className="h-5 w-5" />
          <h2 className="font-semibold text-lg">Zone dangereuse</h2>
        </div>
        <p className="text-sm text-red-600">
          La résiliation mettra fin à votre accès à la fin de la période en cours. Vos données sont conservées
          30 jours puis supprimées définitivement.
        </p>
        <CancelDialog onConfirm={handleCancel} />
      </section>
    </div>
  )
}
