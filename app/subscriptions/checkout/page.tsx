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
import { Loader2, CheckCircle, Landmark, Check, Copy } from 'lucide-react'
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
const CCP_NUMBER = '00123456789 CCP Alger'
const CCP_HOLDER = 'Yelha Technologies'

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
        if (d.data?.plans) {
          const overrides: Record<string, number> = {}
          for (const p of d.data.plans) overrides[p.id] = p.price
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
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? 'Erreur'); return }
      if (data.data.type === 'chargily') {
        window.location.href = data.data.url
      } else if (data.data.type === 'ccp') {
        const planName = selected?.name ?? selectedPlanId
        setCcpResult({ ccpRef: data.data.ccpRef, amount: data.data.amount, planId: selectedPlanId, planName })
      }
    } catch { toast.error('Erreur réseau') }
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
      <div className="min-h-screen bg-slate-50 flex items-start justify-center p-6 pt-16">
        <div className="max-w-lg w-full">
          <Card className="p-8 space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                <Landmark className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h1 className="font-bold text-slate-900 text-lg">Instructions de virement CCP</h1>
                <p className="text-sm text-slate-500">Votre demande a été enregistrée</p>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Numéro CCP</span>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-800">{CCP_NUMBER}</span>
                  <button onClick={() => { navigator.clipboard.writeText(CCP_NUMBER); toast.success('Copié !') }}>
                    <Copy className="w-3.5 h-3.5 text-slate-400 hover:text-slate-700" />
                  </button>
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Titulaire</span>
                <span className="font-bold text-slate-800">{CCP_HOLDER}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Montant exact</span>
                <span className="font-bold text-amber-700">{fmtDA(ccpResult.amount)}</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Référence obligatoire</span>
                <div className="flex items-center gap-2">
                  <code className="font-mono font-bold text-slate-800 bg-white border border-amber-200 rounded px-2 py-0.5">
                    {ccpResult.ccpRef}
                  </code>
                  <button onClick={() => { navigator.clipboard.writeText(ccpResult.ccpRef); toast.success('Copié !') }}>
                    <Copy className="w-4 h-4 text-slate-400 hover:text-slate-700" />
                  </button>
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-green-50 border border-green-200 p-4 space-y-2">
              <p className="text-sm font-semibold text-green-800">📲 Envoyer la preuve par WhatsApp</p>
              <p className="text-xs text-green-700">
                Après le virement, envoyez votre reçu directement sur WhatsApp. Le message est pré-rempli avec vos infos.
              </p>
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full mt-2 bg-[#25D366] hover:bg-[#20bd59] text-white font-semibold rounded-xl py-3 text-sm transition-colors"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                Envoyer sur WhatsApp
              </a>
            </div>

            <Button variant="outline" className="w-full" onClick={() => router.push('/dashboard')}>
              Compris, retour au dashboard →
            </Button>
          </Card>
        </div>
      </div>
    )
  }

  // ── Main app checkout ──────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center gap-2">
          <span className="font-bold text-lg text-slate-900">YelhaERP</span>
          <span className="text-slate-300 mx-1">·</span>
          <span className="text-slate-500 text-sm">{config.appName} — Choisir un plan</span>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-10 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">

        {/* ── LEFT: Plan selector ── */}
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{config.appName}</h1>
            <p className="text-slate-500 text-sm mt-1">
              Choisissez le plan adapté à votre activité. Résiliable à tout moment.
            </p>
          </div>

          <div className="space-y-3">
              {plans.map(plan => {
                const isSelected = selectedPlanId === plan.id
                const isPopular = plan.id === 'pro'
                return (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => setSelectedPlanId(plan.id)}
                    className={`w-full relative text-left rounded-2xl border-2 p-5 transition-all hover:shadow-sm ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-50/40'
                        : 'border-slate-200 bg-white hover:border-indigo-200'
                    }`}
                  >
                    {isPopular && (
                      <span className="absolute -top-3 left-5 rounded-full bg-indigo-600 px-3 py-0.5 text-[11px] font-semibold text-white">
                        Populaire
                      </span>
                    )}
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                          isSelected ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300 bg-white'
                        }`}>
                          {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">{plan.name}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{plan.description}</p>
                          {isSelected && (
                            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3">
                              {plan.features.map(f => (
                                <span key={f} className="flex items-center gap-1.5 text-xs text-slate-700">
                                  <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />{f}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-bold text-slate-900 text-lg">{fmtDA(plan.price)}</p>
                        <p className="text-xs text-slate-400">/ mois</p>
                        {plan.maxSubscriptions === -1 && (
                          <Badge className="mt-1 bg-indigo-50 text-indigo-700 border-0 text-[10px]">Illimité</Badge>
                        )}
                        {plan.maxSubscriptions > 0 && plan.maxSubscriptions !== -1 && (
                          <p className="text-xs text-slate-400 mt-0.5">{plan.maxSubscriptions} abonnements</p>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })}
          </div>

          {/* Payment method */}
          {selected && (
            <Card className="p-6 space-y-3">
              <h2 className="font-semibold text-slate-900">Méthode de paiement</h2>

              {/* Chargily ePay */}
              <button
                type="button"
                onClick={() => handlePay('CHARGILY')}
                disabled={submitting !== null}
                className="w-full flex items-center gap-4 rounded-xl border-2 border-blue-200 bg-blue-50 hover:border-blue-400 p-5 text-left transition-all disabled:opacity-50"
              >
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shrink-0 text-lg">
                  💳
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-slate-800">Chargily ePay</p>
                  <p className="text-xs text-slate-500 mt-0.5">Edahabia · CIB — Paiement immédiat</p>
                </div>
                {submitting === 'CHARGILY'
                  ? <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                  : <span className="font-bold text-blue-700">{fmtDA(selected.price)}/mois</span>
                }
              </button>

              {/* Virement CCP */}
              <button
                type="button"
                onClick={() => handlePay('CCP')}
                disabled={submitting !== null}
                className="w-full flex items-center gap-4 rounded-xl border-2 border-amber-200 bg-amber-50 hover:border-amber-400 p-5 text-left transition-all disabled:opacity-50"
              >
                <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl flex items-center justify-center shrink-0 text-lg">
                  🏦
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-slate-800">Virement CCP</p>
                  <p className="text-xs text-slate-500 mt-0.5">Activation sous 24–48h · Preuve par WhatsApp</p>
                </div>
                {submitting === 'CCP'
                  ? <Loader2 className="w-5 h-5 animate-spin text-amber-600" />
                  : <span className="font-bold text-amber-700">{fmtDA(selected.price)}/mois</span>
                }
              </button>
            </Card>
          )}
        </div>

        {/* ── RIGHT: Summary ── */}
        <div className="lg:sticky lg:top-8 h-fit">
          <Card className="p-6">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-4">
              Récapitulatif
            </h2>

            {selected ? (
              <>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">{config.appName}</span>
                    <span className="font-medium text-slate-800">{selected.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Abonnements</span>
                    <span className="text-slate-700">
                      {selected.maxSubscriptions === -1 ? 'Illimité' : `${selected.maxSubscriptions} max`}
                    </span>
                  </div>
                  {(selected.aiRequestsPerMonth > 0 || selected.aiRequestsPerDay > 0) && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Assistance IA</span>
                      <span className="text-slate-700">
                        {selected.aiRequestsPerDay > 0
                          ? `${selected.aiRequestsPerDay} req/jour`
                          : `${selected.aiRequestsPerMonth} req/mois`}
                      </span>
                    </div>
                  )}
                </div>

                <Separator className="my-4" />

                <div className="flex justify-between items-baseline mb-4">
                  <span className="font-bold text-slate-900">TOTAL / mois</span>
                  <span className="font-bold text-xl text-indigo-700">{fmtDA(selected.price)}</span>
                </div>

                <Separator className="mb-4" />

                <div className="space-y-2">
                  {['✓ Sans engagement', '✓ Résiliation à tout moment', '✓ Support inclus', '✓ Données sécurisées'].map(item => (
                    <p key={item} className="text-xs text-slate-500">{item}</p>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-sm text-slate-400">Sélectionnez un plan</p>
            )}
          </Card>

          {session?.user && (
            <div className="mt-3 p-3 bg-white rounded-xl border border-slate-100 text-xs text-slate-500 flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold shrink-0">
                {session.user.name?.[0]?.toUpperCase() ?? 'U'}
              </div>
              <span>Connecté en tant que <strong className="text-slate-700">{session.user.email}</strong></span>
            </div>
          )}
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
