'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, CheckCircle, Clock, Zap, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { APPS, type AppId } from '@/lib/pricing/config'
import { formatDA } from '@/lib/algerian/format'

// ── Types ──────────────────────────────────────────────────────

interface SubData {
  extraApps: string[]
  trialApps: string[]
  appTrialsEndsAt: Record<string, string>
}

type AppState = 'core' | 'active' | 'trial' | 'expired-trial' | 'available' | 'coming-soon'

interface AppInfo {
  appId: AppId
  state: AppState
  daysLeft?: number
  trialEndsAt?: string
}

// ── Helpers ────────────────────────────────────────────────────

function dLeft(iso: string) {
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000))
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-DZ', { day: 'numeric', month: 'long', year: 'numeric' })
}

// ── State badge ────────────────────────────────────────────────

function StateBadge({ state, dl }: { state: AppState; dl?: number }) {
  if (state === 'core')
    return <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200"><CheckCircle className="h-3 w-3" />Gratuit</span>
  if (state === 'active')
    return <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700 border border-green-200"><CheckCircle className="h-3 w-3" />Actif</span>
  if (state === 'trial')
    return <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200"><Clock className="h-3 w-3" />Essai — {dl}j</span>
  if (state === 'expired-trial')
    return <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-600 border border-red-200">Essai expiré</span>
  if (state === 'coming-soon')
    return <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">⏳ Bientôt</span>
  return null
}

// ── App card ───────────────────────────────────────────────────

function AppCard({ info, onTrial, onCancel, loadingId }: {
  info: AppInfo
  onTrial: (id: AppId) => void
  onCancel: (id: AppId) => void
  loadingId: AppId | null
}) {
  const app = APPS[info.appId]
  const { state } = info
  const busy = loadingId === info.appId
  const [confirmCancel, setConfirmCancel] = useState(false)

  const borderClass =
    state === 'core'          ? 'border-emerald-200 bg-emerald-50/30' :
    state === 'active'        ? 'border-green-200 bg-green-50/20' :
    state === 'trial'         ? 'border-amber-200 bg-amber-50/20' :
    state === 'expired-trial' ? 'border-red-200 bg-red-50/10' :
    state === 'coming-soon'   ? 'border-dashed border-slate-200 bg-slate-50/40 opacity-60' :
                                'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'

  return (
    <div className={`rounded-2xl border-2 p-5 flex flex-col gap-3 transition-all ${borderClass}`}>
      {/* Header */}
      <div className="flex items-start gap-3">
        <span className={`text-2xl ${state === 'coming-soon' ? 'grayscale' : ''}`}>{app.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
            <span className="font-bold text-slate-900 text-sm">{app.name}</span>
            <StateBadge state={state} dl={info.daysLeft} />
          </div>
          <p className="text-xs text-slate-500 leading-snug">{app.description}</p>
        </div>
        {state === 'coming-soon' && <Lock className="h-4 w-4 text-slate-300 shrink-0" />}
      </div>

      {/* Price row */}
      {state !== 'coming-soon' && state !== 'core' && (
        <div className="text-xs text-slate-600">
          <span className="font-bold da-amount">{formatDA(app.price)}/mois</span>
          {state === 'trial' && info.trialEndsAt && (
            <span className="text-slate-400 ml-1">· essai jusqu'au {fmtDate(info.trialEndsAt)}</span>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="pt-2 border-t border-black/5 flex flex-wrap items-center gap-2">
        {/* Core */}
        {state === 'core' && (
          <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
            <CheckCircle className="h-3.5 w-3.5" />Inclus gratuitement
          </span>
        )}

        {/* Coming soon */}
        {state === 'coming-soon' && (
          <span className="text-xs text-slate-400">Disponible prochainement</span>
        )}

        {/* Available / expired → start trial */}
        {(state === 'available' || state === 'expired-trial') && (
          <Button size="sm" className="gap-1.5 text-xs flex-1" disabled={busy} onClick={() => onTrial(info.appId)}>
            {busy ? '…' : <><Zap className="h-3.5 w-3.5" />Essayer 15 jours gratuitement</>}
          </Button>
        )}

        {/* Trial → activate or stop */}
        {state === 'trial' && (
          <>
            <Link href={`/subscriptions/checkout?app=${info.appId}`} className="flex-1">
              <Button size="sm" className="w-full gap-1 text-xs">
                <Zap className="h-3.5 w-3.5" />Activer — {formatDA(app.price)}/mois
              </Button>
            </Link>
            {!confirmCancel ? (
              <Button size="sm" variant="ghost" className="text-xs text-red-400 hover:text-red-600 px-2" onClick={() => setConfirmCancel(true)}>
                Arrêter
              </Button>
            ) : (
              <span className="flex items-center gap-1">
                <span className="text-xs text-red-600 font-medium">Confirmer ?</span>
                <Button size="sm" variant="destructive" className="h-7 px-2 text-xs" disabled={busy} onClick={() => { onCancel(info.appId); setConfirmCancel(false) }}>Oui</Button>
                <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setConfirmCancel(false)}>Non</Button>
              </span>
            )}
          </>
        )}

        {/* Active → cancel */}
        {state === 'active' && (
          <>
            <span className="flex-1 text-xs text-green-700 font-medium flex items-center gap-1">
              <CheckCircle className="h-3.5 w-3.5" />Actif
            </span>
            {!confirmCancel ? (
              <Button size="sm" variant="ghost" className="text-xs text-red-400 hover:text-red-600 px-2" onClick={() => setConfirmCancel(true)}>
                Résilier
              </Button>
            ) : (
              <span className="flex items-center gap-1">
                <span className="text-xs text-red-600 font-medium">Confirmer ?</span>
                <Button size="sm" variant="destructive" className="h-7 px-2 text-xs" disabled={busy} onClick={() => { onCancel(info.appId); setConfirmCancel(false) }}>Oui</Button>
                <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setConfirmCancel(false)}>Non</Button>
              </span>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────

export default function ModulesPage() {
  const [sub, setSub] = useState<SubData | null>(null)
  const [pageLoading, setPageLoading] = useState(true)
  const [loadingId, setLoadingId] = useState<AppId | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  function loadSub() {
    fetch('/api/billing/subscription')
      .then(r => r.json())
      .then(d => { if (d.subscription) setSub(d.subscription) })
      .catch(() => {})
      .finally(() => setPageLoading(false))
  }

  useEffect(() => { loadSub() }, [])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 4000)
    return () => clearTimeout(t)
  }, [toast])

  async function handleTrial(appId: AppId) {
    setLoadingId(appId)
    try {
      const res = await fetch('/api/billing/app-trial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appId }),
      })
      const d = await res.json()
      if (d.subscription) {
        setSub(d.subscription)
        setToast(`Essai de ${APPS[appId].name} activé — 15 jours gratuits !`)
      } else {
        setToast(d.error ?? 'Une erreur est survenue')
      }
    } finally {
      setLoadingId(null)
    }
  }

  async function handleCancel(appId: AppId) {
    setLoadingId(appId)
    await fetch(`/api/billing/app-trial/${appId}`, { method: 'DELETE' })
    loadSub()
    setLoadingId(null)
  }

  // Build app info
  const appInfos: AppInfo[] = (Object.keys(APPS) as AppId[]).map(appId => {
    const app = APPS[appId]
    if (app.core) return { appId, state: 'core' }
    if (app.comingSoon) return { appId, state: 'coming-soon' }
    if (!sub) return { appId, state: 'available' }
    if (sub.extraApps.includes(appId)) return { appId, state: 'active' }
    if (sub.trialApps.includes(appId)) {
      const endIso = sub.appTrialsEndsAt?.[appId]
      const dl = endIso ? dLeft(endIso) : 0
      return { appId, state: dl > 0 ? 'trial' : 'expired-trial', daysLeft: dl, trialEndsAt: endIso }
    }
    return { appId, state: 'available' }
  })

  const activeList  = appInfos.filter(i => i.state === 'active' || i.state === 'trial')
  const availList   = appInfos.filter(i => i.state === 'available' || i.state === 'expired-trial')
  const soonList    = appInfos.filter(i => i.state === 'coming-soon')

  return (
    <div className="p-4 md:p-6 space-y-8 max-w-4xl">
      <nav className="text-sm text-muted-foreground">
        <Link href="/dashboard/settings" className="hover:text-foreground">Paramètres</Link> / Applications
      </nav>

      <div className="flex items-center gap-3">
        <Link href="/dashboard/settings">
          <Button variant="outline" size="sm"><ArrowLeft className="w-4 h-4" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Applications</h1>
          <p className="text-muted-foreground text-sm">Activez les applications dont vous avez besoin · Essai gratuit 15 jours</p>
        </div>
      </div>

      {pageLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-8">
          {/* Active / en essai */}
          {activeList.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Modules actifs</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {activeList.map(info => <AppCard key={info.appId} info={info} onTrial={handleTrial} onCancel={handleCancel} loadingId={loadingId} />)}
              </div>
            </section>
          )}

          {/* Disponibles */}
          {availList.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Disponibles — essai gratuit 15 jours</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {availList.map(info => <AppCard key={info.appId} info={info} onTrial={handleTrial} onCancel={handleCancel} loadingId={loadingId} />)}
              </div>
            </section>
          )}

          {/* Bientôt */}
          {soonList.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Bientôt disponibles</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {soonList.map(info => <AppCard key={info.appId} info={info} onTrial={handleTrial} onCancel={handleCancel} loadingId={loadingId} />)}
              </div>
            </section>
          )}
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#1D9E75] text-white px-5 py-3 rounded-2xl shadow-lg text-sm font-semibold">
          🎉 {toast}
        </div>
      )}
    </div>
  )
}
