'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, CheckCircle, Clock, XCircle, Zap,
  RefreshCw, X, AlertTriangle, Loader2, Package,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

// ── Types ──────────────────────────────────────────────────────

interface AppSub {
  id: string
  appId: string
  appName: string
  planId: string
  planName: string
  planFeatures: string[]
  status: string
  effectiveStatus: string
  trialEndsAt: string | null
  currentPeriodStart: string
  currentPeriodEnd: string
  monthlyAmount: number
}

// ── Helpers ────────────────────────────────────────────────────

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('fr-DZ', { day: 'numeric', month: 'long', year: 'numeric' })
}

function daysLeft(isoDate: string) {
  return Math.max(0, Math.ceil((new Date(isoDate).getTime() - Date.now()) / 86400000))
}

function fmtDA(n: number) {
  return n.toLocaleString('fr-DZ', { maximumFractionDigits: 0 }) + ' DA'
}

// ── Status badge ───────────────────────────────────────────────

function StatusBadge({ status, trialEndsAt }: { status: string; trialEndsAt: string | null }) {
  if (status === 'TRIAL') {
    const days = trialEndsAt ? daysLeft(trialEndsAt) : 0
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
        <Clock className="h-3 w-3" />
        Essai — {days}j restant{days !== 1 ? 's' : ''}
      </span>
    )
  }
  if (status === 'ACTIVE') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full bg-green-100 text-green-700 border border-green-200">
        <CheckCircle className="h-3 w-3" />Actif
      </span>
    )
  }
  if (status === 'CANCELLED') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
        <XCircle className="h-3 w-3" />Résilié
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full bg-red-100 text-red-600 border border-red-200">
      <XCircle className="h-3 w-3" />Expiré
    </span>
  )
}

// ── App subscription card ──────────────────────────────────────

function SubCard({ sub, onCancel, cancelling }: {
  sub: AppSub
  onCancel: (appId: string) => void
  cancelling: boolean
}) {
  const [confirmCancel, setConfirmCancel] = useState(false)
  const es = sub.effectiveStatus
  const isTrial  = es === 'TRIAL'
  const isActive = es === 'ACTIVE'
  const isOver   = es === 'EXPIRED' || es === 'CANCELLED'

  const borderCls = isActive ? 'border-green-200 bg-green-50/30'
    : isTrial  ? 'border-amber-200 bg-amber-50/20'
    : 'border-slate-200 bg-slate-50/40 opacity-70'

  return (
    <div className={`rounded-2xl border-2 p-5 space-y-4 transition-all ${borderCls}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-bold text-slate-900 text-base">{sub.appName}</p>
          <p className="text-sm text-slate-500 mt-0.5">
            Plan <span className="font-semibold text-slate-700">{sub.planName}</span>
            {sub.monthlyAmount > 0 && <span className="ml-1">· {fmtDA(sub.monthlyAmount)}/mois</span>}
          </p>
        </div>
        <StatusBadge status={es} trialEndsAt={sub.trialEndsAt} />
      </div>

      {/* Dates */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        {isTrial && sub.trialEndsAt && (
          <div className="col-span-2 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
            <p className="text-amber-700 font-medium">Expire le {fmtDate(sub.trialEndsAt)}</p>
            <p className="text-amber-500 text-xs mt-0.5">Activez un plan pour ne pas perdre vos données</p>
          </div>
        )}
        {isActive && (
          <>
            <div className="bg-slate-50 rounded-xl px-3 py-2.5">
              <p className="text-xs text-slate-400">Début</p>
              <p className="font-medium text-slate-700 text-xs mt-0.5">{fmtDate(sub.currentPeriodStart)}</p>
            </div>
            <div className="bg-slate-50 rounded-xl px-3 py-2.5">
              <p className="text-xs text-slate-400">Renouvellement</p>
              <p className="font-medium text-slate-700 text-xs mt-0.5">{fmtDate(sub.currentPeriodEnd)}</p>
            </div>
          </>
        )}
        {isOver && (
          <div className="col-span-2 bg-slate-50 border border-slate-100 rounded-xl px-4 py-3">
            <p className="text-slate-500 text-sm">
              {es === 'CANCELLED' ? 'Abonnement résilié' : `Expiré le ${fmtDate(sub.currentPeriodEnd)}`}
            </p>
          </div>
        )}
      </div>

      {/* Features (trial only) */}
      {isTrial && sub.planFeatures.length > 0 && (
        <ul className="space-y-1">
          {sub.planFeatures.map(f => (
            <li key={f} className="flex items-center gap-2 text-xs text-slate-600">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />{f}
            </li>
          ))}
        </ul>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1 border-t border-black/5">
        {isTrial && (
          <Link href={`/subscriptions/checkout?app=${sub.appId}`} className="flex-1">
            <Button size="sm" className="w-full gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-700">
              <Zap className="h-3.5 w-3.5" />Choisir un plan →
            </Button>
          </Link>
        )}
        {isActive && (
          <Link href={`/subscriptions/checkout?app=${sub.appId}`} className="flex-1">
            <Button size="sm" variant="outline" className="w-full gap-1.5 text-xs">
              <RefreshCw className="h-3.5 w-3.5" />Changer de plan
            </Button>
          </Link>
        )}
        {isOver && (
          <Link href={`/subscriptions/checkout?app=${sub.appId}`} className="flex-1">
            <Button size="sm" variant="outline" className="w-full gap-1.5 text-xs">
              <Zap className="h-3.5 w-3.5" />Réactiver →
            </Button>
          </Link>
        )}

        {/* Cancel — only for TRIAL or ACTIVE */}
        {!isOver && !confirmCancel && (
          <Button
            size="sm"
            variant="ghost"
            className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-2 shrink-0"
            onClick={() => setConfirmCancel(true)}
          >
            <X className="h-3.5 w-3.5 mr-1" />Résilier
          </Button>
        )}
        {!isOver && confirmCancel && (
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-xs text-red-600 font-medium">Confirmer ?</span>
            <Button
              size="sm"
              variant="destructive"
              className="text-xs h-7 px-2"
              disabled={cancelling}
              onClick={() => { onCancel(sub.appId); setConfirmCancel(false) }}
            >
              {cancelling ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Oui'}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-xs h-7 px-2"
              onClick={() => setConfirmCancel(false)}
            >
              Non
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────

export default function SubscriptionsPage() {
  const [subs, setSubs] = useState<AppSub[]>([])
  const [loading, setLoading] = useState(true)
  const [cancelling, setCancelling] = useState<string | null>(null)

  function load() {
    fetch('/api/app-billing/subscriptions')
      .then(r => r.json())
      .then(d => { if (d.subscriptions) setSubs(d.subscriptions) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  async function handleCancel(appId: string) {
    setCancelling(appId)
    const res = await fetch(`/api/app-billing/${appId}/cancel`, { method: 'DELETE' })
    const data = await res.json()
    if (res.ok) {
      toast.success('Abonnement résilié.')
      load()
    } else {
      toast.error(data.error ?? 'Erreur lors de la résiliation.')
    }
    setCancelling(null)
  }

  const active  = subs.filter(s => s.effectiveStatus === 'ACTIVE')
  const trial   = subs.filter(s => s.effectiveStatus === 'TRIAL')
  const expired = subs.filter(s => s.effectiveStatus === 'EXPIRED' || s.effectiveStatus === 'CANCELLED')

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-3xl">
      {/* Breadcrumb */}
      <nav className="text-sm text-muted-foreground">
        <Link href="/dashboard/settings" className="hover:text-foreground">Paramètres</Link>
        {' / '}
        <span>Mes abonnements</span>
      </nav>

      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard/settings">
          <Button variant="outline" size="sm"><ArrowLeft className="w-4 h-4" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Mes abonnements</h1>
          <p className="text-muted-foreground text-sm">Gérez vos applications et leurs abonnements</p>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {!loading && subs.length === 0 && (
        <div className="rounded-2xl border border-border bg-card p-10 text-center space-y-3">
          <div className="text-5xl">📦</div>
          <p className="font-semibold text-slate-700">Aucun abonnement d'application</p>
          <p className="text-sm text-slate-400">Commencez par un essai gratuit de 15 jours depuis la page Applications.</p>
          <Link href="/dashboard/settings/modules">
            <Button variant="outline" size="sm" className="mt-2">Voir les applications →</Button>
          </Link>
        </div>
      )}

      {/* Actifs */}
      {active.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <h2 className="font-semibold text-slate-900">Abonnements actifs</h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {active.map(s => (
              <SubCard key={s.id} sub={s} onCancel={handleCancel} cancelling={cancelling === s.appId} />
            ))}
          </div>
        </section>
      )}

      {/* Essais */}
      {trial.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-amber-600" />
            <h2 className="font-semibold text-slate-900">Essais en cours</h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {trial.map(s => (
              <SubCard key={s.id} sub={s} onCancel={handleCancel} cancelling={cancelling === s.appId} />
            ))}
          </div>
        </section>
      )}

      {/* Expirés */}
      {expired.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-slate-400" />
            <h2 className="font-semibold text-slate-500">Inactifs</h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {expired.map(s => (
              <SubCard key={s.id} sub={s} onCancel={handleCancel} cancelling={cancelling === s.appId} />
            ))}
          </div>
        </section>
      )}

      {/* Info */}
      <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 flex gap-3">
        <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
        <div className="text-sm text-amber-700">
          <p className="font-semibold mb-1">Besoin d'aide ?</p>
          <p>
            Contactez-nous sur{' '}
            <a href="https://wa.me/33761179379" target="_blank" rel="noopener noreferrer" className="underline font-medium">
              WhatsApp
            </a>{' '}
            ou par email à{' '}
            <a href="mailto:cvkdev@outlook.fr" className="underline font-medium">cvkdev@outlook.fr</a>.
          </p>
        </div>
      </div>
    </div>
  )
}
