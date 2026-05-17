'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Loader2, CheckCircle, Landmark, Check, Copy, Zap, Rocket, Crown, Building2, Shield, Star } from 'lucide-react'
import {
  PLANS, APPS, ANNUAL_DISCOUNT, isAppIncluded,
  type PlanId, type AppId,
} from '@/lib/pricing/config'
import { APP_PLANS, getAppPlanConfig } from '@/lib/pricing/app-plans'
import { toast } from 'sonner'

function fmtDA(n: number): string {
  return n.toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + ' DA'
}

// ─────────────────────────────────────────────────────────────────────────────
// APP-SPECIFIC CHECKOUT  (ex: ?app=subscriptions)
// ─────────────────────────────────────────────────────────────────────────────

type AppPlan = {
  id: string; name: string; price: number; durationDays: number | null
  maxSubscriptions: number; aiRequestsPerMonth: number; aiRequestsPerDay: number
  description: string; features: readonly string[]
}

const WHATSAPP_NUMBER = '33761179379'
const CCP_NUMBER = '00799999004399346548'
const CCP_HOLDER = 'Yelha Technologies'

const PLAN_STYLES: Record<string, { icon: React.ReactNode; accent: string; badge: string; ring: string; glow: string }> = {
  starter: {
    icon: <Zap className="w-5 h-5 text-slate-600" />,
    accent: 'from-slate-400 to-slate-500',
    badge: 'bg-slate-100 text-slate-700',
    ring: 'border-slate-400 bg-slate-50/60',
    glow: 'shadow-slate-100',
  },
  pro: {
    icon: <Rocket className="w-5 h-5 text-indigo-600" />,
    accent: 'from-indigo-500 to-violet-500',
    badge: 'bg-indigo-100 text-indigo-700',
    ring: 'border-indigo-500 bg-indigo-50/60',
    glow: 'shadow-indigo-100',
  },
  premium: {
    icon: <Crown className="w-5 h-5 text-amber-600" />,
    accent: 'from-amber-400 to-orange-500',
    badge: 'bg-amber-100 text-amber-700',
    ring: 'border-amber-500 bg-amber-50/60',
    glow: 'shadow-amber-100',
  },
  agency: {
    icon: <Building2 className="w-5 h-5 text-emerald-600" />,
    accent: 'from-emerald-500 to-teal-500',
    badge: 'bg-emerald-100 text-emerald-700',
    ring: 'border-emerald-500 bg-emerald-50/60',
    glow: 'shadow-emerald-100',
  },
}

function getPlanStyle(id: string) {
  return PLAN_STYLES[id] ?? PLAN_STYLES.starter
}

function AppCheckout({ appId }: { appId: string }) {
  const router = useRouter()
  const { data: session } = useSession()
  const config = getAppPlanConfig(appId)

  const basePlans: AppPlan[] = config
    ? Object.values(config.plans as Record<string, AppPlan>).filter(p => p.id !== 'trial')
    : []

  const [priceOverrides, setPriceOverrides] = useState<Record<string, number>>({})
  const [selectedPlanId, setSelectedPlanId] = useState<string>('starter')
  const [submitting, setSubmitting] = useState<'CCP' | 'CHARGILY' | null>(null)
  const [ccpResult, setCcpResult] = useState<{ ccpRef: string; amount: number; planId: string; planName: string } | null>(null)

  useEffect(() => {
    fetch(`/api/app-billing/${appId}/plans`)
      .then(r => r.json())
      .then(d => {
        const plans = d.plans ?? d.data?.plans
        if (Array.isArray(plans)) {
          const overrides: Record<string, number> = {}
          for (const p of plans) overrides[p.id] = p.price
          setPriceOverrides(overrides)
        }
      })
      .catch(() => {})
  }, [appId])

  const plans: AppPlan[] = basePlans.map(p => ({
    ...p,
    price: priceOverrides[p.id] ?? p.price,
  }))

  const selected = plans.find(p => p.id === selectedPlanId) ?? plans[0]

  async function handlePay(method: 'CCP' | 'CHARGILY') {
    setSubmitting(method)
    try {
      const res = await fetch(`/api/app-billing/${appId}/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: selectedPlanId, method }),
      })
      const text = await res.text()
      let data: { type?: string; url?: string; ccpRef?: string; amount?: number; error?: string }
      try { data = JSON.parse(text) } catch { toast.error(`Serveur: ${text.slice(0, 120)}`); return }
      if (!res.ok) { toast.error(data.error ?? `Erreur ${res.status}`); return }
      if (data.type === 'chargily' && data.url) {
        window.location.href = data.url
      } else if (data.type === 'ccp') {
        const planName = selected?.name ?? selectedPlanId
        setCcpResult({ ccpRef: data.ccpRef!, amount: data.amount!, planId: selectedPlanId, planName })
      }
    } catch (e) { toast.error(`Erreur: ${e instanceof Error ? e.message : 'inconnue'}`) }
    finally { setSubmitting(null) }
  }

  if (!config) return null

  // ── CCP result screen ──────────────────────────────────────────────────────
  if (ccpResult) {
    const userEmail = session?.user?.email ?? ''
    const waMessage = encodeURIComponent(
      `Bonjour,\nJe souhaite activer le pack *${ccpResult.planName}* (${config.appName}).\n\n` +
      `💰 Montant : ${fmtDA(ccpResult.amount)}/mois\n` +
      `📧 Email : ${userEmail}\n` +
      `🔖 Référence : ${ccpResult.ccpRef}\n\n` +
      `Ci-joint la preuve de versement CCP.`
    )
    const waUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${waMessage}`

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 flex items-start justify-center p-6 pt-20">
        <div className="max-w-lg w-full">
          {/* Success header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/30 mb-4">
              <Landmark className="w-8 h-8 text-amber-400" />
            </div>
            <h1 className="text-2xl font-bold text-white">Instructions de virement</h1>
            <p className="text-slate-400 mt-1 text-sm">Demande enregistrée · Pack {ccpResult.planName}</p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl backdrop-blur-sm overflow-hidden">
            {/* CCP details */}
            <div className="p-6 space-y-4">
              {[
                { label: 'Numéro CCP', value: CCP_NUMBER, copy: true },
                { label: 'Titulaire', value: CCP_HOLDER, copy: false },
              ].map(row => (
                <div key={row.label} className="flex items-center justify-between">
                  <span className="text-slate-400 text-sm">{row.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white text-sm">{row.value}</span>
                    {row.copy && (
                      <button
                        onClick={() => { navigator.clipboard.writeText(row.value); toast.success('Copié !') }}
                        className="p-1 rounded hover:bg-white/10 transition-colors"
                      >
                        <Copy className="w-3.5 h-3.5 text-slate-400 hover:text-white" />
                      </button>
                    )}
                  </div>
                </div>
              ))}

              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-sm">Montant exact</span>
                <span className="font-bold text-amber-400 text-lg">{fmtDA(ccpResult.amount)}</span>
              </div>

              <div className="h-px bg-white/10" />

              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-sm">Référence obligatoire</span>
                <div className="flex items-center gap-2">
                  <code className="font-mono font-bold text-white bg-white/10 border border-white/20 rounded-lg px-3 py-1 text-sm">
                    {ccpResult.ccpRef}
                  </code>
                  <button
                    onClick={() => { navigator.clipboard.writeText(ccpResult.ccpRef); toast.success('Copié !') }}
                    className="p-1 rounded hover:bg-white/10 transition-colors"
                  >
                    <Copy className="w-4 h-4 text-slate-400 hover:text-white" />
                  </button>
                </div>
              </div>
            </div>

            {/* WhatsApp CTA */}
            <div className="border-t border-white/10 bg-emerald-900/20 p-6 space-y-3">
              <p className="text-sm font-semibold text-emerald-300">Envoyez la preuve par WhatsApp</p>
              <p className="text-xs text-slate-400">
                Après le virement, envoyez votre reçu. Le message est pré-rempli avec votre référence et email.
              </p>
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2.5 w-full bg-[#25D366] hover:bg-[#20bd59] text-white font-semibold rounded-xl py-3.5 text-sm transition-all shadow-lg shadow-green-900/30 hover:shadow-green-900/50"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current shrink-0"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                Envoyer sur WhatsApp
              </a>
            </div>
          </div>

          <button
            onClick={() => router.push('/dashboard')}
            className="w-full mt-4 text-slate-400 hover:text-slate-200 text-sm py-3 transition-colors"
          >
            Retour au dashboard →
          </button>
        </div>
      </div>
    )
  }

  // ── Main app checkout ──────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900">
      {/* Header */}
      <header className="border-b border-white/10 px-6 py-4 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center">
              <Star className="w-4 h-4 text-indigo-400" />
            </div>
            <span className="font-bold text-white">YelhaERP</span>
            <span className="text-white/20 text-lg font-thin">·</span>
            <span className="text-slate-400 text-sm">{config.appName}</span>
          </div>
          {session?.user && (
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-3 py-1.5">
              <div className="w-5 h-5 rounded-full bg-indigo-500/30 border border-indigo-400/40 flex items-center justify-center text-indigo-300 font-bold text-[10px] shrink-0">
                {session.user.name?.[0]?.toUpperCase() ?? 'U'}
              </div>
              <span className="text-xs text-slate-300 hidden sm:block">{session.user.email}</span>
            </div>
          )}
        </div>
      </header>

      {/* Hero section */}
      <div className="max-w-5xl mx-auto px-4 pt-12 pb-8 text-center">
        <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-400/20 rounded-full px-4 py-1.5 mb-5">
          <Shield className="w-3.5 h-3.5 text-indigo-400" />
          <span className="text-indigo-300 text-xs font-medium">Sans engagement · Résiliation à tout moment</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">
          Choisissez votre plan
        </h1>
        <p className="text-slate-400 text-base">
          {config.appName} — Accès complet, support inclus, données sécurisées.
        </p>
      </div>

      <div className="max-w-5xl mx-auto px-4 pb-16 grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">

        {/* ── LEFT: Plans ── */}
        <div className="space-y-4">
          {/* Plan cards */}
          <div className="space-y-3">
            {plans.map(plan => {
              const isSelected = selectedPlanId === plan.id
              const isPopular = plan.id === 'pro'
              const style = getPlanStyle(plan.id)

              return (
                <button
                  key={plan.id}
                  type="button"
                  onClick={() => setSelectedPlanId(plan.id)}
                  className={`w-full relative text-left rounded-2xl border-2 p-5 transition-all duration-200 ${
                    isSelected
                      ? `${style.ring} shadow-lg ${style.glow}`
                      : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/8'
                  }`}
                >
                  {isPopular && (
                    <span className="absolute -top-3 left-5 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 px-3 py-0.5 text-[11px] font-semibold text-white shadow-lg shadow-indigo-900/40">
                      ✦ Populaire
                    </span>
                  )}

                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      {/* Plan icon */}
                      <div className={`mt-0.5 w-10 h-10 rounded-xl bg-gradient-to-br ${style.accent} flex items-center justify-center shrink-0 shadow-lg`}>
                        <div className="text-white">{style.icon}</div>
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className={`font-bold text-base ${isSelected ? 'text-slate-900' : 'text-white'}`}>{plan.name}</p>
                          {plan.maxSubscriptions === -1 && (
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${style.badge}`}>Illimité</span>
                          )}
                        </div>
                        <p className={`text-xs mt-0.5 ${isSelected ? 'text-slate-600' : 'text-slate-400'}`}>{plan.description}</p>

                        {/* Features - always visible */}
                        <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3">
                          {plan.features.map(f => (
                            <span key={f} className={`flex items-center gap-1.5 text-xs ${isSelected ? 'text-slate-700' : 'text-slate-400'}`}>
                              <Check className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-emerald-500' : 'text-slate-500'}`} />{f}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p className={`font-bold text-xl ${isSelected ? 'text-slate-900' : 'text-white'}`}>{fmtDA(plan.price)}</p>
                      <p className={`text-xs mt-0.5 ${isSelected ? 'text-slate-500' : 'text-slate-500'}`}>/ mois</p>
                      {plan.maxSubscriptions > 0 && plan.maxSubscriptions !== -1 && (
                        <p className={`text-xs mt-1 ${isSelected ? 'text-slate-500' : 'text-slate-500'}`}>{plan.maxSubscriptions} abonnements</p>
                      )}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Payment methods */}
          {selected && (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4 mt-2">
              <div className="flex items-center gap-2">
                <div className="w-1 h-4 rounded-full bg-gradient-to-b from-indigo-400 to-violet-400" />
                <h2 className="font-semibold text-white text-sm">Méthode de paiement</h2>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                {/* Chargily ePay */}
                <button
                  type="button"
                  onClick={() => handlePay('CHARGILY')}
                  disabled={submitting !== null}
                  className="group relative flex flex-col gap-3 rounded-xl border border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 hover:border-blue-400/50 p-4 text-left transition-all disabled:opacity-50"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg flex items-center justify-center shrink-0 shadow shadow-blue-900/40 text-base">
                      💳
                    </div>
                    <div>
                      <p className="font-semibold text-white text-sm">Chargily ePay</p>
                      <p className="text-xs text-blue-300/70">Edahabia · CIB</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-blue-300/70">Paiement immédiat</span>
                    {submitting === 'CHARGILY'
                      ? <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                      : <span className="font-bold text-blue-300 text-sm">{fmtDA(selected.price)}</span>
                    }
                  </div>
                </button>

                {/* Virement CCP */}
                <button
                  type="button"
                  onClick={() => handlePay('CCP')}
                  disabled={submitting !== null}
                  className="group relative flex flex-col gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 hover:border-amber-400/50 p-4 text-left transition-all disabled:opacity-50"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg flex items-center justify-center shrink-0 shadow shadow-amber-900/40 text-base">
                      🏦
                    </div>
                    <div>
                      <p className="font-semibold text-white text-sm">Virement CCP</p>
                      <p className="text-xs text-amber-300/70">Activation 24–48h</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-amber-300/70">Via WhatsApp</span>
                    {submitting === 'CCP'
                      ? <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                      : <span className="font-bold text-amber-300 text-sm">{fmtDA(selected.price)}</span>
                    }
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT: Summary ── */}
        <div className="lg:sticky lg:top-8 h-fit space-y-3">
          <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
            {/* Summary header */}
            <div className="bg-gradient-to-r from-indigo-500/20 to-violet-500/20 border-b border-white/10 px-5 py-4">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Récapitulatif</p>
            </div>

            {selected ? (
              <div className="p-5 space-y-4">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${getPlanStyle(selected.id).accent} flex items-center justify-center shrink-0`}>
                    <div className="text-white scale-75">{getPlanStyle(selected.id).icon}</div>
                  </div>
                  <div>
                    <p className="font-semibold text-white text-sm">{selected.name}</p>
                    <p className="text-xs text-slate-400">{config.appName}</p>
                  </div>
                </div>

                <div className="space-y-2.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Abonnements</span>
                    <span className="text-white font-medium">
                      {selected.maxSubscriptions === -1 ? 'Illimité' : `${selected.maxSubscriptions} max`}
                    </span>
                  </div>
                  {(selected.aiRequestsPerMonth > 0 || selected.aiRequestsPerDay > 0) && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Assistance IA</span>
                      <span className="text-white font-medium">
                        {selected.aiRequestsPerDay > 0
                          ? `${selected.aiRequestsPerDay} req/jour`
                          : `${selected.aiRequestsPerMonth} req/mois`}
                      </span>
                    </div>
                  )}
                </div>

                <div className="h-px bg-white/10" />

                <div className="flex justify-between items-center">
                  <span className="font-bold text-white text-sm">Total / mois</span>
                  <span className="font-bold text-2xl text-indigo-300">{fmtDA(selected.price)}</span>
                </div>

                <div className="h-px bg-white/10" />

                <div className="space-y-2">
                  {[
                    { icon: '✓', text: 'Sans engagement' },
                    { icon: '✓', text: 'Résiliation à tout moment' },
                    { icon: '✓', text: 'Support inclus' },
                    { icon: '✓', text: 'Données sécurisées' },
                  ].map(item => (
                    <p key={item.text} className="text-xs text-slate-400 flex items-center gap-2">
                      <span className="text-emerald-400 font-bold">{item.icon}</span>
                      {item.text}
                    </p>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-5">
                <p className="text-sm text-slate-500">Sélectionnez un plan</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// GLOBAL ERP CHECKOUT  (ex: ?plan=pro)
// ─────────────────────────────────────────────────────────────────────────────

type PaymentMethod = 'CHARGILY' | 'CCP' | null

interface CcpResult { ccpRef: string; amount: number }

function ErpCheckout() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { data: session } = useSession()

  const planParam = (searchParams.get('plan') ?? 'pro') as PlanId
  const planId: PlanId = planParam in PLANS ? planParam : 'pro'
  const cycleParam = searchParams.get('cycle') ?? 'monthly'
  const appsParam = searchParams.get('apps') ?? ''

  const initialExtra: AppId[] = appsParam
    ? (appsParam.split(',').filter(a => a in APPS && !isAppIncluded(planId, a as AppId)) as AppId[])
    : []

  const [extraApps, setExtraApps] = useState<AppId[]>(initialExtra)
  const [annual, setAnnual] = useState(cycleParam === 'annual')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(null)
  const [loading, setLoading] = useState(false)
  const [ccpResult, setCcpResult] = useState<CcpResult | null>(null)
  const [info, setInfo] = useState({ name: '', email: '', company: '', phone: '' })

  useEffect(() => {
    if (session?.user) {
      setInfo(i => ({ ...i, name: session.user.name ?? '', email: session.user.email ?? '' }))
    }
  }, [session])

  const plan = PLANS[planId]
  const includedApps: AppId[] = 'includedApps' in plan
    ? (plan.includedApps === 'ALL' ? (Object.keys(APPS) as AppId[]) : [...(plan.includedApps as readonly AppId[])])
    : []

  const availableExtras: AppId[] = (Object.keys(APPS) as AppId[]).filter(
    a => !isAppIncluded(planId, a) && !APPS[a].core
  )

  function toggleExtra(appId: AppId) {
    setExtraApps(prev => prev.includes(appId) ? prev.filter(a => a !== appId) : [...prev, appId])
  }

  const planPrice = plan.price
  const extrasPrice = extraApps.reduce((s, a) => s + APPS[a].price, 0)
  const subtotal = planPrice + extrasPrice
  const annualSaving = annual ? Math.round(subtotal * ANNUAL_DISCOUNT) : 0
  const monthlyTotal = annual ? Math.round(subtotal * (1 - ANNUAL_DISCOUNT)) : subtotal
  const annualTotal = monthlyTotal * 12

  async function handleSubmit() {
    if (!paymentMethod) return
    if (!info.name || !info.email || !info.phone) {
      toast.error('Veuillez remplir tous les champs obligatoires (*).'); return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId, extraApps, billingCycle: annual ? 'ANNUAL' : 'MONTHLY', method: paymentMethod, ...info }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? 'Une erreur est survenue.'); return }
      if (paymentMethod === 'CHARGILY') {
        if (data.url) window.location.href = data.url
      } else {
        setCcpResult({ ccpRef: data.ccpRef, amount: data.amount ?? monthlyTotal })
      }
    } catch { toast.error('Une erreur est survenue.') }
    finally { setLoading(false) }
  }

  if (ccpResult) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-start justify-center p-6 pt-16">
        <div className="max-w-lg w-full">
          <Card className="p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                <Landmark className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h1 className="font-bold text-slate-900 text-lg">Instructions de virement CCP</h1>
                <p className="text-sm text-slate-500">Votre demande a été enregistrée</p>
              </div>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 space-y-3 text-sm mb-6">
              <div className="flex justify-between"><span className="text-slate-500">Numéro CCP</span><span className="font-bold text-slate-800">00123456789 CCP Alger</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Titulaire</span><span className="font-bold text-slate-800">Yelha Technologies</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Montant exact</span><span className="font-bold text-amber-700">{fmtDA(ccpResult.amount)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Référence</span><span className="font-bold text-slate-800">{ccpResult.ccpRef}</span></div>
              <Separator />
              <p className="text-slate-600">Envoyez votre reçu à <a href="mailto:cvkdev@outlook.fr" className="underline text-amber-700">cvkdev@outlook.fr</a></p>
              <p className="text-slate-500">Activation sous 24–48h ouvrables.</p>
            </div>
            <Button className="w-full" onClick={() => router.push(`/subscriptions/success?method=ccp&plan=${planId}`)}>
              Compris, aller au dashboard →
            </Button>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center gap-2">
          <span className="font-bold text-lg text-slate-900">YelhaERP</span>
          <span className="text-slate-300 mx-1">·</span>
          <span className="text-slate-500 text-sm">Finaliser votre abonnement</span>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-10 grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-8">
        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="text-base font-semibold text-slate-900 mb-1">Plan sélectionné</h2>
            <div className="flex items-center gap-2 mb-4">
              <Badge className="bg-emerald-100 text-emerald-700 border-0 text-sm px-3 py-1">{plan.name}</Badge>
              <span className="text-slate-500 text-sm da-amount">{fmtDA(plan.price)}/mois</span>
            </div>
            {includedApps.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">Inclus dans ce plan</p>
                <div className="flex flex-wrap gap-2">
                  {includedApps.map(appId => (
                    <span key={appId} className="inline-flex items-center gap-1 text-xs bg-slate-100 text-slate-600 rounded-full px-2.5 py-1">
                      {APPS[appId as AppId]?.icon} {APPS[appId as AppId]?.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {availableExtras.length > 0 && (
              <div>
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">Modules supplémentaires (optionnels)</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {availableExtras.map(appId => {
                    const app = APPS[appId]; const sel = extraApps.includes(appId)
                    return (
                      <button key={appId} type="button" onClick={() => toggleExtra(appId)}
                        className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2.5 text-left text-sm transition-all ${sel ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                        <span className="flex items-center gap-2"><span>{app.icon}</span><span className="font-medium text-slate-700">{app.name}</span></span>
                        <span className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-slate-400 text-xs da-amount">+{fmtDA(app.price)}/mois</span>
                          {sel && <CheckCircle className="w-4 h-4 text-emerald-500" />}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </Card>

          <Card className="p-6">
            <h2 className="text-base font-semibold text-slate-900 mb-4">Durée</h2>
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setAnnual(false)}
                className={`flex flex-col items-start rounded-xl border-2 p-4 text-left transition-all ${!annual ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                <span className="font-semibold text-slate-800 mb-1">Mensuel</span>
                <span className="text-sm text-slate-500 da-amount">{fmtDA(subtotal)}/mois</span>
              </button>
              <button type="button" onClick={() => setAnnual(true)}
                className={`flex flex-col items-start rounded-xl border-2 p-4 text-left transition-all ${annual ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                <span className="flex items-center gap-2 font-semibold text-slate-800 mb-1">Annuel <Badge className="bg-green-100 text-green-700 border-0 text-xs">-20%</Badge></span>
                <span className="text-sm text-slate-500 da-amount">{fmtDA(Math.round(subtotal * (1 - ANNUAL_DISCOUNT)))}/mois</span>
                {subtotal > 0 && <span className="text-xs text-green-600 mt-1 da-amount">Économie de {fmtDA(annualSaving * 12)}/an</span>}
              </button>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-base font-semibold text-slate-900 mb-4">Vos informations</h2>
            <div className="space-y-4">
              {[
                { key: 'name', label: 'Nom complet', placeholder: 'Karim Benali', required: true },
                { key: 'email', label: 'Email', placeholder: 'karim@exemple.dz', required: true, type: 'email' },
                { key: 'company', label: 'Société', placeholder: 'Bati-Pro SARL', required: false },
                { key: 'phone', label: 'Téléphone', placeholder: '0555 123 456', required: true, type: 'tel' },
              ].map(f => (
                <div key={f.key} className="space-y-1.5">
                  <Label>{f.label} {f.required ? <span className="text-red-500">*</span> : <span className="text-slate-400 text-xs font-normal">(optionnel)</span>}</Label>
                  <Input type={f.type ?? 'text'} value={info[f.key as keyof typeof info]}
                    onChange={e => setInfo(i => ({ ...i, [f.key]: e.target.value }))} placeholder={f.placeholder} />
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-base font-semibold text-slate-900 mb-4">Méthode de paiement</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { id: 'CHARGILY', label: 'Chargily Pay', sub: 'Edahabia · CIB', icon: '💳', gradient: 'from-blue-500 to-blue-600' },
                { id: 'CCP', label: 'Virement CCP', sub: '24–48h ouvrables', icon: '🏦', gradient: 'from-amber-500 to-amber-600' },
              ].map(m => (
                <button key={m.id} type="button" onClick={() => setPaymentMethod(m.id as PaymentMethod)}
                  className={`flex items-center gap-4 rounded-xl border-2 p-5 text-left transition-all ${paymentMethod === m.id ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                  <div className={`w-10 h-10 bg-gradient-to-br ${m.gradient} rounded-xl flex items-center justify-center shrink-0 text-lg`}>{m.icon}</div>
                  <div className="flex-1"><p className="font-semibold text-slate-800">{m.label}</p><p className="text-xs text-slate-500 mt-0.5">{m.sub}</p></div>
                  {paymentMethod === m.id && <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />}
                </button>
              ))}
            </div>
          </Card>

          <Button className="w-full h-12 text-base font-semibold" onClick={handleSubmit} disabled={loading || !paymentMethod}>
            {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Confirmer et payer → {fmtDA(monthlyTotal)}
          </Button>
        </div>

        <div className="lg:sticky lg:top-8 h-fit">
          <Card className="p-6">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-4">Récapitulatif</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-slate-600">Plan {plan.name}</span><span className="font-medium text-slate-800 da-amount">{fmtDA(planPrice)}</span></div>
              {extraApps.map(appId => (
                <div key={appId} className="flex justify-between text-slate-500">
                  <span>+ {APPS[appId].name}</span><span className="da-amount">{fmtDA(APPS[appId].price)}</span>
                </div>
              ))}
            </div>
            <Separator className="my-3" />
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Sous-total</span><span className="text-slate-700 da-amount">{fmtDA(subtotal)}</span></div>
              {annual && subtotal > 0 && <div className="flex justify-between text-green-600"><span>Remise annuelle -20%</span><span className="da-amount">-{fmtDA(annualSaving)}</span></div>}
            </div>
            <Separator className="my-3" />
            <div className="flex justify-between items-baseline">
              <span className="font-bold text-slate-900">TOTAL / mois</span>
              <span className="font-bold text-xl text-emerald-700 da-amount">{fmtDA(monthlyTotal)}</span>
            </div>
            {annual && <p className="text-xs text-slate-400 mt-1 text-right da-amount">Soit {fmtDA(annualTotal)}/an</p>}
            <Separator className="my-4" />
            <div className="space-y-2">
              {['✓ Sans engagement', '✓ Résiliation à tout moment', '✓ Support inclus', '✓ Données sécurisées'].map(item => (
                <p key={item} className="text-xs text-slate-500">{item}</p>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ROUTER — choisit quel checkout afficher selon ?app=
// ─────────────────────────────────────────────────────────────────────────────

function CheckoutRouter() {
  const searchParams = useSearchParams()
  const appParam = searchParams.get('app') ?? ''

  // Si le paramètre app correspond à une app avec plans indépendants → app checkout
  if (appParam && appParam in APP_PLANS) {
    return <AppCheckout appId={appParam} />
  }

  // Sinon → checkout ERP global
  return <ErpCheckout />
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center text-slate-400">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />Chargement…
      </div>
    }>
      <CheckoutRouter />
    </Suspense>
  )
}
