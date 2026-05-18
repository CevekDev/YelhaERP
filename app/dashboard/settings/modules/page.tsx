'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, CheckCircle, Clock, Zap, Lock, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { APPS, type AppId } from '@/lib/pricing/config'
import { hasIndependentPlans, getAppPlanConfig } from '@/lib/pricing/app-plans'
import { formatDA } from '@/lib/algerian/format'

// ── Types ──────────────────────────────────────────────────────

interface SubData {
  extraApps: string[]
  trialApps: string[]
  appTrialsEndsAt: Record<string, string>
}

interface AppSubRecord {
  appId: string
  effectiveStatus: string
  trialEndsAt: string | null
}

type AppState = 'core' | 'active' | 'trial' | 'expired-trial' | 'available' | 'coming-soon'

interface AppInfo {
  appId: AppId
  state: AppState
  daysLeft?: number
  trialEndsAt?: string
  startingPrice?: number | null
}

// ── Helpers ────────────────────────────────────────────────────

function dLeft(iso: string) {
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000))
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-DZ', { day: 'numeric', month: 'long', year: 'numeric' })
}

function getStartingPriceFallback(appId: string): number | null {
  const config = getAppPlanConfig(appId)
  if (!config) return null
  const paid = Object.values(config.plans).filter(p => p.id !== 'trial')
  if (!paid.length) return null
  return Math.min(...paid.map(p => p.price))
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
  const independent = hasIndependentPlans(info.appId)
  const startingPrice = independent
    ? (info.startingPrice ?? getStartingPriceFallback(info.appId))
    : null

  const borderClass =
    state === 'core'          ? 'border-emerald-500/30 bg-emerald-500/5' :
    state === 'active'        ? 'border-green-500/30 bg-green-500/5' :
    state === 'trial'         ? 'border-amber-500/40 bg-amber-500/5' :
    state === 'expired-trial' ? 'border-red-500/20 bg-red-500/5' :
    state === 'coming-soon'   ? 'border-dashed border-border/50 opacity-50' :
                                'border-border/60 hover:border-primary/30 hover:shadow-md'

  const statusBadge = (() => {
    if (state === 'core')
      return <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"><CheckCircle className="h-3 w-3" />Gratuit</span>
    if (state === 'active')
      return <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 border border-green-500/20"><CheckCircle className="h-3 w-3" />Actif</span>
    if (state === 'trial')
      return <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30"><Clock className="h-3 w-3" />Essai — {info.daysLeft}j</span>
    if (state === 'expired-trial')
      return <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/20">Expiré</span>
    if (state === 'coming-soon')
      return <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">Bientôt</span>
    return null
  })()

  return (
    <div className={`rounded-2xl border-2 p-5 flex flex-col gap-4 transition-all bg-card ${borderClass}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-3">
          <span className={`text-2xl leading-none mt-0.5 ${state === 'coming-soon' ? 'grayscale opacity-50' : ''}`}>
            {app.icon}
          </span>
          <div>
            <p className="font-semibold text-foreground text-sm leading-tight">{app.name}</p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{app.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {statusBadge}
          {state === 'coming-soon' && <Lock className="h-4 w-4 text-muted-foreground/40" />}
        </div>
      </div>

      {/* Price row */}
      {state !== 'coming-soon' && state !== 'core' && (
        <div className="flex items-baseline gap-1.5">
          {independent && startingPrice !== null ? (
            <>
              <span className="text-xs text-muted-foreground">À partir de</span>
              <span className="text-sm font-bold text-foreground">{formatDA(startingPrice)}</span>
              <span className="text-xs text-muted-foreground">/mois</span>
            </>
          ) : (
            <span className="text-sm font-bold text-foreground">{formatDA(app.price)}<span className="text-xs font-normal text-muted-foreground ml-1">/mois</span></span>
          )}
          {state === 'trial' && info.trialEndsAt && (
            <span className="text-xs text-muted-foreground/70 ml-1">· essai jusqu'au {fmtDate(info.trialEndsAt)}</span>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="pt-3 border-t border-border/40 flex flex-wrap items-center gap-2">
        {state === 'core' && (
          <span className="text-xs text-emerald-500 font-medium flex items-center gap-1">
            <CheckCircle className="h-3.5 w-3.5" />Inclus gratuitement
          </span>
        )}

        {state === 'coming-soon' && (
          <span className="text-xs text-muted-foreground">Disponible prochainement</span>
        )}

        {state === 'available' && (
          <Button size="sm" className="gap-1.5 text-xs flex-1" disabled={busy} onClick={() => onTrial(info.appId)}>
            {busy ? '…' : <><Zap className="h-3.5 w-3.5" />Essayer 15 jours gratuitement</>}
          </Button>
        )}
        {state === 'expired-trial' && (
          independent
            ? <Link href="/dashboard/settings/applications" className="flex-1">
                <Button size="sm" variant="outline" className="w-full gap-1.5 text-xs">
                  <ArrowRight className="h-3.5 w-3.5" />Souscrire
                </Button>
              </Link>
            : <Button size="sm" className="gap-1.5 text-xs flex-1" disabled={busy} onClick={() => onTrial(info.appId)}>
                {busy ? '…' : <><Zap className="h-3.5 w-3.5" />Essayer 15 jours gratuitement</>}
              </Button>
        )}

        {state === 'trial' && (
          <>
            <Link href={`/subscriptions/checkout?app=${info.appId}`} className="flex-1">
              <Button size="sm" className="w-full gap-1.5 text-xs">
                <Zap className="h-3.5 w-3.5" />
                {independent ? 'Choisir un plan' : `Activer — ${formatDA(app.price)}/mois`}
                {independent && <ArrowRight className="h-3.5 w-3.5 ml-auto" />}
              </Button>
            </Link>
            {!confirmCancel ? (
              <Button size="sm" variant="ghost" className="text-xs text-destructive/70 hover:text-destructive hover:bg-destructive/10 px-2" onClick={() => setConfirmCancel(true)}>
                Arrêter
              </Button>
            ) : (
              <span className="flex items-center gap-1">
                <span className="text-xs text-destructive font-medium">Confirmer ?</span>
                <Button size="sm" variant="destructive" className="h-7 px-2 text-xs" disabled={busy} onClick={() => { onCancel(info.appId); setConfirmCancel(false) }}>Oui</Button>
                <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setConfirmCancel(false)}>Non</Button>
              </span>
            )}
          </>
        )}

        {state === 'active' && (
          <>
            <span className="flex-1 text-xs text-green-500 font-medium flex items-center gap-1">
              <CheckCircle className="h-3.5 w-3.5" />Actif
            </span>
            {!confirmCancel ? (
              <Button size="sm" variant="ghost" className="text-xs text-destructive/70 hover:text-destructive hover:bg-destructive/10 px-2" onClick={() => setConfirmCancel(true)}>
                Résilier
              </Button>
            ) : (
              <span className="flex items-center gap-1">
                <span className="text-xs text-destructive font-medium">Confirmer ?</span>
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
  const [appSubs, setAppSubs] = useState<AppSubRecord[]>([])
  const [startingPrices, setStartingPrices] = useState<Record<string, number>>({})
  const [pageLoading, setPageLoading] = useState(true)
  const [loadingId, setLoadingId] = useState<AppId | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  function loadSub() {
    Promise.all([
      fetch('/api/billing/subscription').then(r => r.json()),
      fetch('/api/app-billing/subscriptions').then(r => r.json()).catch(() => ({})),
    ]).then(([oldD, newD]) => {
      if (oldD.subscription) setSub(oldD.subscription)
      setAppSubs(newD?.data?.subscriptions ?? newD?.subscriptions ?? [])
    }).catch(() => {}).finally(() => setPageLoading(false))
  }

  useEffect(() => { loadSub() }, [])

  // Fetch per-app starting prices (with admin overrides) from the same endpoint
  // the checkout modal uses, so /modules and the modal stay in sync.
  useEffect(() => {
    const indepApps = (Object.keys(APPS) as AppId[]).filter(id => hasIndependentPlans(id))
    Promise.all(indepApps.map(async appId => {
      try {
        const r = await fetch(`/api/app-billing/${appId}/plans`)
        const d = await r.json()
        const plans = (d?.data?.plans ?? d?.plans ?? []) as Array<{ id: string; price: number }>
        const paid = plans.filter(p => p.id !== 'trial')
        if (!paid.length) return null
        return [appId, Math.min(...paid.map(p => p.price))] as const
      } catch { return null }
    })).then(results => {
      const map: Record<string, number> = {}
      for (const r of results) if (r) map[r[0]] = r[1]
      setStartingPrices(map)
    })
  }, [])

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

  // New AppSubscription system takes priority
  const newSubMap = new Map(appSubs.map(s => [s.appId, s]))

  const appInfos: AppInfo[] = (Object.keys(APPS) as AppId[]).map(appId => {
    const app = APPS[appId]
    const startingPrice = startingPrices[appId] ?? null
    if (app.core) return { appId, state: 'core' }
    if (app.comingSoon) return { appId, state: 'coming-soon' }

    // Check new system first
    const newSub = newSubMap.get(appId)
    if (newSub) {
      if (newSub.effectiveStatus === 'ACTIVE') return { appId, state: 'active', startingPrice }
      if (newSub.effectiveStatus === 'TRIAL') {
        const dl = newSub.trialEndsAt ? dLeft(newSub.trialEndsAt) : 0
        return { appId, state: dl > 0 ? 'trial' : 'expired-trial', daysLeft: dl, trialEndsAt: newSub.trialEndsAt ?? undefined, startingPrice }
      }
      // EXPIRED in new system → don't fall back to old system
      if (newSub.effectiveStatus === 'EXPIRED') {
        return { appId, state: 'expired-trial', startingPrice }
      }
    }

    // Fall back to old system
    if (!sub) return { appId, state: 'available', startingPrice }
    if (sub.extraApps.includes(appId)) return { appId, state: 'active', startingPrice }
    if (sub.trialApps.includes(appId)) {
      const endIso = sub.appTrialsEndsAt?.[appId]
      const dl = endIso ? dLeft(endIso) : 0
      return { appId, state: dl > 0 ? 'trial' : 'expired-trial', daysLeft: dl, trialEndsAt: endIso, startingPrice }
    }
    return { appId, state: 'available', startingPrice }
  })

  const activeList = appInfos.filter(i => i.state === 'active' || i.state === 'trial')
  const availList  = appInfos.filter(i => i.state === 'available' || i.state === 'expired-trial')
  const soonList   = appInfos.filter(i => i.state === 'coming-soon')

  return (
    <div className="p-4 md:p-6 space-y-8 max-w-4xl">
      <nav className="text-sm text-muted-foreground">
        <Link href="/dashboard/settings" className="hover:text-foreground">Paramètres</Link>
        {' / '}Applications
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
          {activeList.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Modules actifs</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {activeList.map(info => <AppCard key={info.appId} info={info} onTrial={handleTrial} onCancel={handleCancel} loadingId={loadingId} />)}
              </div>
            </section>
          )}

          {availList.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Disponibles — essai gratuit 15 jours</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {availList.map(info => <AppCard key={info.appId} info={info} onTrial={handleTrial} onCancel={handleCancel} loadingId={loadingId} />)}
              </div>
            </section>
          )}

          {soonList.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Bientôt disponibles</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {soonList.map(info => <AppCard key={info.appId} info={info} onTrial={handleTrial} onCancel={handleCancel} loadingId={loadingId} />)}
              </div>
            </section>
          )}
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-primary text-primary-foreground px-5 py-3 rounded-2xl shadow-lg text-sm font-semibold">
          🎉 {toast}
        </div>
      )}
    </div>
  )
}
