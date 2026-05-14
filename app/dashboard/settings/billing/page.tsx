'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, CreditCard, AlertTriangle, CheckCircle, Clock,
  TrendingUp, X, RefreshCw, Zap, Package,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { APPS, type AppId } from '@/lib/pricing/config'
import { formatDA } from '@/lib/algerian/format'

// ── Types ──────────────────────────────────────────────────────

interface SubscriptionData {
  id: string
  planId: string
  status: 'TRIAL' | 'ACTIVE' | 'PAST_DUE' | 'EXPIRED' | 'CANCELLED' | 'PAUSED'
  billingCycle: 'MONTHLY' | 'ANNUAL'
  currentPeriodStart: string
  currentPeriodEnd: string
  trialEndsAt: string | null
  trialApps: string[]
  extraApps: string[]
  appTrialsEndsAt: Record<string, string>
  usageEmails: number
  usageApiReq: number
  usageAiReq: number
  usageResetAt: string
  limitEmails: number
  limitApiReq: number
  limitAiReq: number
  payments?: Array<{
    id: string
    createdAt: string
    planId: string
    amount: number
    method: string
    status: string
  }>
}

interface PaymentRow {
  id: string
  createdAt: string
  planId: string
  appId?: string
  amount: number
  method: string
  status: string
}

type AppStatus = 'trial' | 'active' | 'expired'

interface AppEntry {
  appId: AppId
  status: AppStatus
  trialEndsAt?: string
  daysLeft?: number
}

interface AppSubRecord {
  appId: string
  effectiveStatus: string
  trialEndsAt: string | null
  currentPeriodEnd: string
  planId: string
  monthlyAmount: number
}

// ── Helpers ────────────────────────────────────────────────────

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('fr-DZ', { day: 'numeric', month: 'long', year: 'numeric' })
}

function daysLeft(isoDate: string) {
  return Math.max(0, Math.ceil((new Date(isoDate).getTime() - Date.now()) / 86400000))
}

// ── Usage bar ──────────────────────────────────────────────────

function UsageBar({ label, used, limit, resetDate }: { label: string; used: number; limit: number; resetDate: string }) {
  const pct = limit <= 0 ? 0 : Math.min(100, Math.round((used / limit) * 100))
  const color = pct > 90 ? 'bg-red-500' : pct > 70 ? 'bg-amber-500' : 'bg-green-500'
  const textColor = pct > 90 ? 'text-red-600' : pct > 70 ? 'text-amber-600' : 'text-green-600'
  const displayLimit = limit <= 0 ? '∞' : limit.toLocaleString('fr-DZ')
  const reset = new Date(resetDate).toLocaleDateString('fr-DZ', { day: 'numeric', month: 'long' })

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-foreground">{label}</span>
        <span className={`font-semibold ${textColor}`}>{used.toLocaleString('fr-DZ')} / {displayLimit}</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <p className="text-xs text-muted-foreground">Réinitialisation le {reset}</p>
    </div>
  )
}

// ── App subscription card ──────────────────────────────────────

function AppSubCard({
  entry,
  onCancel,
  cancelling,
}: {
  entry: AppEntry
  onCancel: (appId: AppId) => void
  cancelling: boolean
}) {
  const app = APPS[entry.appId]
  const [showConfirm, setShowConfirm] = useState(false)

  const statusChip = entry.status === 'trial'
    ? <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
        <Clock className="h-3 w-3" />
        Essai — {entry.daysLeft}j restant{entry.daysLeft !== 1 ? 's' : ''}
      </span>
    : entry.status === 'active'
    ? <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700 border border-green-200">
        <CheckCircle className="h-3 w-3" />Actif
      </span>
    : <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
        Expiré
      </span>

  return (
    <div className={`relative rounded-2xl border-2 p-5 flex flex-col gap-3 transition-all ${
      entry.status === 'active'   ? 'border-green-200 bg-green-50/30' :
      entry.status === 'trial'    ? 'border-amber-200 bg-amber-50/20' :
                                    'border-slate-200 bg-slate-50/50 opacity-60'
    }`}>
      {/* Header */}
      <div className="flex items-start gap-3">
        <span className="text-3xl">{app.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-slate-900 text-base">{app.name}</div>
          <div className="text-xs text-slate-500 mt-0.5">{app.description}</div>
        </div>
        {statusChip}
      </div>

      {/* Info */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-500">
          {entry.status === 'trial'
            ? `Expire le ${fmtDate(entry.trialEndsAt!)}`
            : entry.status === 'active'
            ? `${formatDA(app.price)}/mois`
            : 'Essai expiré'}
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1 border-t border-black/5">
        {entry.status === 'trial' && (
          <Link href={`/subscriptions/checkout?app=${entry.appId}`} className="flex-1">
            <Button size="sm" className="w-full gap-1.5 text-xs">
              <Zap className="h-3.5 w-3.5" />Activer — {formatDA(app.price)}/mois
            </Button>
          </Link>
        )}
        {entry.status === 'active' && (
          <Link href={`/subscriptions/checkout?app=${entry.appId}&renew=1`} className="flex-1">
            <Button size="sm" variant="outline" className="w-full gap-1.5 text-xs">
              <RefreshCw className="h-3.5 w-3.5" />Renouveler
            </Button>
          </Link>
        )}

        {/* Cancel */}
        {!showConfirm ? (
          <Button
            size="sm"
            variant="ghost"
            className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-2"
            onClick={() => setShowConfirm(true)}
          >
            <X className="h-3.5 w-3.5 mr-1" />Résilier
          </Button>
        ) : (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-red-600 font-medium">Confirmer ?</span>
            <Button
              size="sm"
              variant="destructive"
              className="text-xs h-7 px-2"
              disabled={cancelling}
              onClick={() => { onCancel(entry.appId); setShowConfirm(false) }}
            >
              {cancelling ? '…' : 'Oui'}
            </Button>
            <Button size="sm" variant="ghost" className="text-xs h-7 px-2" onClick={() => setShowConfirm(false)}>Non</Button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────

export default function BillingPage() {
  const [sub, setSub] = useState<SubscriptionData | null>(null)
  const [appSubs, setAppSubs] = useState<AppSubRecord[]>([])
  const [appPayments, setAppPayments] = useState<PaymentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [cancelling, setCancelling] = useState<AppId | null>(null)

  function loadSub() {
    Promise.all([
      fetch('/api/billing/subscription').then(r => r.json()),
      fetch('/api/app-billing/subscriptions').then(r => r.json()).catch(() => ({})),
      fetch('/api/app-billing/payments').then(r => r.json()).catch(() => ({})),
    ]).then(([oldD, newD, pmtD]) => {
      if (oldD.subscription) setSub(oldD.subscription)
      else setError("Impossible de charger l'abonnement.")
      setAppSubs(newD?.data?.subscriptions ?? newD?.subscriptions ?? [])
      setAppPayments(pmtD?.data?.payments ?? pmtD?.payments ?? [])
    }).catch(() => setError('Erreur réseau.')).finally(() => setLoading(false))
  }

  useEffect(() => { loadSub() }, [])

  // Cancel / stop trial or subscription for an app
  async function handleCancel(appId: AppId) {
    setCancelling(appId)
    await fetch(`/api/billing/app-trial/${appId}`, { method: 'DELETE' })
    loadSub()
    setCancelling(null)
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[300px]">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error || !sub) {
    return (
      <div className="p-6">
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
          <p className="text-red-700 font-medium">{error || 'Abonnement introuvable'}</p>
        </div>
      </div>
    )
  }

  // Build app entries — new AppSubscription records take priority over old system
  const appTrialsEndsAt = (sub.appTrialsEndsAt as Record<string, string>) ?? {}
  const newSubMap = new Map(appSubs.map(s => [s.appId, s]))

  const oldEntries: AppEntry[] = [
    ...sub.extraApps
      .filter(id => APPS[id as AppId] && !APPS[id as AppId].core)
      .map(id => ({ appId: id as AppId, status: 'active' as AppStatus })),
    ...sub.trialApps
      .filter(id => APPS[id as AppId] && !sub.extraApps.includes(id))
      .map(id => {
        const endDate = appTrialsEndsAt[id]
        const left = endDate ? daysLeft(endDate) : 0
        return {
          appId: id as AppId,
          status: (left > 0 ? 'trial' : 'expired') as AppStatus,
          trialEndsAt: endDate,
          daysLeft: left,
        }
      }),
  ]

  // Merge: new system overrides old; add new entries not in old system
  const seen = new Set<string>()
  const entries: AppEntry[] = oldEntries.map(e => {
    seen.add(e.appId)
    const n = newSubMap.get(e.appId)
    if (!n) return e
    if (n.effectiveStatus === 'ACTIVE') return { appId: e.appId, status: 'active' }
    if (n.effectiveStatus === 'TRIAL') {
      const left = n.trialEndsAt ? daysLeft(n.trialEndsAt) : 0
      return { appId: e.appId, status: left > 0 ? 'trial' : 'expired', trialEndsAt: n.trialEndsAt ?? undefined, daysLeft: left }
    }
    return e
  })
  // Add apps only in the new system (e.g. gifted directly without old trial)
  for (const n of appSubs) {
    if (seen.has(n.appId) || !APPS[n.appId as AppId]) continue
    if (n.effectiveStatus === 'ACTIVE') {
      entries.push({ appId: n.appId as AppId, status: 'active' })
    } else if (n.effectiveStatus === 'TRIAL') {
      const left = n.trialEndsAt ? daysLeft(n.trialEndsAt) : 0
      entries.push({ appId: n.appId as AppId, status: left > 0 ? 'trial' : 'expired', trialEndsAt: n.trialEndsAt ?? undefined, daysLeft: left })
    }
  }

  const methodLabel: Record<string, string> = {
    CHARGILY: 'Chargily Pay', CCP: 'Virement CCP', CARD: 'Carte bancaire', CASH: 'Espèces', FREE: 'Gratuit',
    ADMIN_GIFT: 'Offert', ADMIN_FREE: 'Gratuit (admin)', ADMIN_ACTIVATE: 'WhatsApp / CCP',
  }

  // Merge old and new payment records, newest first
  const allPayments: PaymentRow[] = [
    ...(appPayments.map(p => ({ id: p.id, createdAt: p.createdAt, planId: p.planId, appId: p.appId, amount: p.amount, method: p.method, status: p.status }))),
    ...(sub.payments ?? []).map(p => ({ id: p.id, createdAt: p.createdAt, planId: p.planId, amount: p.amount, method: p.method, status: p.status })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-4xl">
      {/* Breadcrumb */}
      <nav className="text-sm text-muted-foreground">
        <Link href="/dashboard/settings" className="hover:text-foreground">Paramètres</Link> / Abonnement
      </nav>

      {/* Title */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard/settings">
          <Button variant="outline" size="sm"><ArrowLeft className="w-4 h-4" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Abonnement</h1>
          <p className="text-muted-foreground text-sm">Gérez vos modules et paiements</p>
        </div>
      </div>

      {/* ── Mes abonnements ── */}
      <section className="rounded-2xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Package className="h-5 w-5 text-muted-foreground" />
          <h2 className="font-semibold text-lg">Mes abonnements</h2>
        </div>

        {entries.length === 0 ? (
          <div className="text-center py-10 space-y-3">
            <div className="text-4xl">📦</div>
            <p className="text-slate-500 text-sm font-medium">Aucun module souscrit pour l'instant</p>
            <p className="text-xs text-slate-400">Rendez-vous dans Applications pour essayer gratuitement pendant 15 jours.</p>
            <Link href="/dashboard/settings/modules">
              <Button variant="outline" size="sm" className="mt-2">Voir les applications →</Button>
            </Link>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {entries.map(entry => (
              <AppSubCard
                key={entry.appId}
                entry={entry}
                onCancel={handleCancel}
                cancelling={cancelling === entry.appId}
              />
            ))}
          </div>
        )}
      </section>

      {/* ── 3. Usage ── */}
      <section className="rounded-2xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <TrendingUp className="h-5 w-5 text-muted-foreground" />
          <h2 className="font-semibold text-lg">Usage du mois</h2>
        </div>
        <div className="grid sm:grid-cols-2 gap-6">
          <UsageBar label="Emails envoyés"  used={sub.usageEmails ?? 0} limit={sub.limitEmails ?? 50}   resetDate={sub.usageResetAt ?? new Date().toISOString()} />
          <UsageBar label="Requêtes API"    used={sub.usageApiReq ?? 0} limit={sub.limitApiReq ?? 500}  resetDate={sub.usageResetAt ?? new Date().toISOString()} />
          <UsageBar label="Requêtes IA"     used={sub.usageAiReq ?? 0}  limit={sub.limitAiReq ?? 15}   resetDate={sub.usageResetAt ?? new Date().toISOString()} />
        </div>
      </section>

      {/* ── 4. Historique paiements ── */}
      {allPayments.length > 0 && (
        <section className="rounded-2xl border border-border bg-card p-5 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <CreditCard className="h-5 w-5 text-muted-foreground" />
            <h2 className="font-semibold text-lg">Historique des paiements</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground border-b border-border">
                  <th className="pb-2 pr-4 font-medium">Date</th>
                  <th className="pb-2 pr-4 font-medium">Module</th>
                  <th className="pb-2 pr-4 font-medium">Montant</th>
                  <th className="pb-2 pr-4 font-medium">Méthode</th>
                  <th className="pb-2 font-medium">Statut</th>
                </tr>
              </thead>
              <tbody>
                {allPayments.map((p, i) => (
                  <tr key={p.id} className={i > 0 ? 'border-t border-border' : ''}>
                    <td className="py-2.5 pr-4">{new Date(p.createdAt).toLocaleDateString('fr-DZ', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                    <td className="py-2.5 pr-4 font-medium">{p.appId ? `${p.appId} — ${p.planId}` : p.planId}</td>
                    <td className="py-2.5 pr-4 da-amount font-semibold">{p.amount === 0 ? '—' : formatDA(p.amount)}</td>
                    <td className="py-2.5 pr-4 text-muted-foreground">{methodLabel[p.method] ?? p.method}</td>
                    <td className="py-2.5">
                      {(p.status === 'PAID' || p.status === 'SUCCEEDED')
                        ? <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded-full"><CheckCircle className="h-3 w-3" />Payé</span>
                        : p.status === 'PENDING'
                        ? <span className="text-xs font-medium text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">En attente</span>
                        : <span className="text-xs font-medium text-red-700 bg-red-100 px-2 py-0.5 rounded-full">Échoué</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ── 5. Danger zone ── */}
      <section className="rounded-2xl border-2 border-red-200 bg-red-50/30 p-5 space-y-3">
        <div className="flex items-center gap-2 text-red-700">
          <AlertTriangle className="h-5 w-5" />
          <h2 className="font-semibold">Zone dangereuse</h2>
        </div>
        <p className="text-sm text-red-600">
          Pour résilier l'ensemble de votre compte, contactez-nous à{' '}
          <a href="mailto:cvkdev@outlook.fr" className="underline font-medium">cvkdev@outlook.fr</a>.
          Vos données sont conservées 30 jours après la résiliation.
        </p>
      </section>
    </div>
  )
}
