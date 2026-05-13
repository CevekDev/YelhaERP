'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { CheckCircle, Loader2 } from 'lucide-react'
import { APPS, TRIAL_ELIGIBLE_APPS, type AppId } from '@/lib/pricing/config'

const CORE_APPS: AppId[] = ['invoices', 'quotes', 'clients', 'purchases', 'stock']
const MAX_SELECTION = 3

// French number format: 4 900 DA
function fmtDA(n: number): string {
  return n.toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + ' DA'
}

export default function OnboardingAppsPage() {
  const router = useRouter()
  const [selected, setSelected] = useState<AppId[]>([])
  const [loading, setLoading] = useState(false)

  function toggle(appId: AppId) {
    setSelected(prev => {
      if (prev.includes(appId)) return prev.filter(a => a !== appId)
      if (prev.length >= MAX_SELECTION) return prev
      return [...prev, appId]
    })
  }

  async function handleConfirm() {
    if (selected.length !== MAX_SELECTION) return
    setLoading(true)
    try {
      await fetch('/api/billing/subscription/trial-apps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apps: selected }),
      })
      router.push('/dashboard')
    } catch {
      setLoading(false)
    }
  }

  const reachedMax = selected.length >= MAX_SELECTION

  return (
    <div className="min-h-screen bg-slate-50 pb-32">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-5">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-2xl font-bold text-slate-900">
            Choisissez 3 apps à tester gratuitement
          </h1>
          <p className="text-slate-500 mt-1 text-sm">
            Essai de 30 jours — aucune carte bancaire requise. Vous pouvez changer votre sélection à tout moment.
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">

        {/* Core apps — always included */}
        <section>
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
            Inclus gratuitement dans tous les plans
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {CORE_APPS.map(appId => {
              const app = APPS[appId]
              return (
                <div
                  key={appId}
                  className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2.5"
                >
                  <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  <span className="text-sm font-medium text-emerald-800">
                    {app.icon} {app.name}
                  </span>
                </div>
              )
            })}
          </div>
        </section>

        {/* Trial-eligible apps grid */}
        <section>
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
            Choisissez 3 modules parmi les 12 disponibles
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {TRIAL_ELIGIBLE_APPS.map(appId => {
              const app = APPS[appId]
              const isSelected = selected.includes(appId)
              const isDisabled = reachedMax && !isSelected

              return (
                <button
                  key={appId}
                  type="button"
                  onClick={() => !isDisabled && toggle(appId)}
                  disabled={isDisabled}
                  className={`relative flex items-start gap-3 rounded-xl border-2 p-4 text-left transition-all ${
                    isSelected
                      ? 'border-emerald-500 bg-emerald-50'
                      : isDisabled
                      ? 'border-slate-200 bg-slate-50 cursor-not-allowed opacity-60'
                      : 'border-slate-200 bg-white hover:border-slate-300 cursor-pointer'
                  }`}
                >
                  {/* App icon */}
                  <span className="text-2xl flex-shrink-0 mt-0.5">{app.icon}</span>

                  {/* App info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-slate-800 text-sm leading-tight">{app.name}</p>
                      {isSelected && (
                        <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {app.comingSoon ? (
                        <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-600 border border-amber-200 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                          ⏳ Bientôt disponible
                        </span>
                      ) : (
                        <>
                          <span className="line-through">Valeur : {fmtDA(app.price)}/mois</span>{' '}
                          <span className="text-emerald-600 font-medium not-italic">offert</span>
                        </>
                      )}
                    </p>
                    <p className="text-xs text-slate-500 mt-1 leading-snug">{app.description}</p>
                  </div>

                  {/* "Max atteinte" overlay */}
                  {isDisabled && (
                    <div className="absolute inset-0 rounded-xl flex items-center justify-center bg-slate-50/80">
                      <span className="text-xs font-medium text-slate-400 bg-white border border-slate-200 rounded-full px-3 py-1">
                        Sélection max atteinte
                      </span>
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </section>
      </div>

      {/* Sticky bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-4 py-4 z-50">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-600">
              <span className="font-bold text-slate-900">{selected.length}</span>
              <span className="text-slate-400">/{MAX_SELECTION} apps sélectionnées</span>
            </span>
            {selected.length > 0 && (
              <div className="flex gap-1">
                {selected.map(appId => (
                  <span key={appId} className="text-base" title={APPS[appId].name}>
                    {APPS[appId].icon}
                  </span>
                ))}
              </div>
            )}
          </div>

          <Button
            onClick={handleConfirm}
            disabled={selected.length !== MAX_SELECTION || loading}
            className="h-10 px-6 font-semibold"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Confirmer mon choix →
          </Button>
        </div>
      </div>
    </div>
  )
}
