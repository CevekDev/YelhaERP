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
import { Loader2, CheckCircle, CreditCard, Landmark } from 'lucide-react'
import {
  PLANS,
  APPS,
  TRIAL_ELIGIBLE_APPS,
  ANNUAL_DISCOUNT,
  calcMonthlyTotal,
  isAppIncluded,
  type PlanId,
  type AppId,
} from '@/lib/pricing/config'

// French number format: 4 900 DA (space as thousands separator)
function fmtDA(n: number): string {
  return n.toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + ' DA'
}

type PaymentMethod = 'CHARGILY' | 'CCP' | null

interface CcpResult {
  ccpRef: string
  amount: number
  instructions?: string
}

function CheckoutContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { data: session } = useSession()

  // Parse query params
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
      setInfo(i => ({
        ...i,
        name: session.user.name ?? '',
        email: session.user.email ?? '',
      }))
    }
  }, [session])

  const plan = PLANS[planId]
  const includedApps: AppId[] = 'includedApps' in plan
    ? (plan.includedApps === 'ALL'
      ? (Object.keys(APPS) as AppId[])
      : [...(plan.includedApps as readonly AppId[])])
    : []

  // All non-included, non-core apps available as extras
  const availableExtras: AppId[] = (Object.keys(APPS) as AppId[]).filter(
    a => !isAppIncluded(planId, a) && !APPS[a].core
  )

  function toggleExtra(appId: AppId) {
    setExtraApps(prev =>
      prev.includes(appId) ? prev.filter(a => a !== appId) : [...prev, appId]
    )
  }

  // Pricing calculations
  const planPrice = plan.price
  const extrasPrice = extraApps.reduce((s, a) => s + APPS[a].price, 0)
  const subtotal = planPrice + extrasPrice
  const annualSaving = annual ? Math.round(subtotal * ANNUAL_DISCOUNT) : 0
  const monthlyTotal = annual ? Math.round(subtotal * (1 - ANNUAL_DISCOUNT)) : subtotal
  const annualTotal = monthlyTotal * 12

  async function handleSubmit() {
    if (!paymentMethod) return
    if (!info.name || !info.email || !info.phone) {
      alert('Veuillez remplir tous les champs obligatoires (*).')
      return
    }

    setLoading(true)
    try {
      const body = {
        planId,
        extraApps,
        billingCycle: annual ? 'ANNUAL' : 'MONTHLY',
        method: paymentMethod,
        name: info.name,
        email: info.email,
        company: info.company,
        phone: info.phone,
      }

      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()

      if (!res.ok) {
        alert(data.error ?? 'Une erreur est survenue.')
        return
      }

      if (paymentMethod === 'CHARGILY') {
        if (data.url) window.location.href = data.url
      } else {
        // CCP
        setCcpResult({
          ccpRef: data.ccpRef ?? 'YELHA-' + Math.random().toString(36).slice(2, 10).toUpperCase(),
          amount: data.amount ?? monthlyTotal,
          instructions: data.instructions,
        })
      }
    } catch {
      alert('Une erreur est survenue. Veuillez réessayer.')
    } finally {
      setLoading(false)
    }
  }

  // ── CCP Instructions panel ──────────────────────────────────────────────────
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
              <div className="flex justify-between">
                <span className="text-slate-500">Numéro CCP</span>
                <span className="font-bold text-slate-800">00123456789 CCP Alger</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Titulaire</span>
                <span className="font-bold text-slate-800">Yelha Technologies</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Montant exact</span>
                <span className="font-bold text-amber-700 da-amount">{fmtDA(ccpResult.amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Référence à indiquer</span>
                <span className="font-bold text-slate-800">{ccpResult.ccpRef}</span>
              </div>
              <Separator />
              <p className="text-slate-600">
                Envoyez votre reçu à{' '}
                <a href="mailto:cvkdev@outlook.fr" className="underline text-amber-700">
                  cvkdev@outlook.fr
                </a>
              </p>
              <p className="text-slate-500">Activation sous 24–48h ouvrables.</p>
            </div>

            <Button
              className="w-full"
              onClick={() => router.push(`/subscriptions/success?method=ccp&plan=${planId}`)}
            >
              Compris, aller au dashboard →
            </Button>
          </Card>
        </div>
      </div>
    )
  }

  // ── Main checkout layout ────────────────────────────────────────────────────
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

        {/* ── LEFT COLUMN ── */}
        <div className="space-y-6">

          {/* 1. Plan sélectionné */}
          <Card className="p-6">
            <h2 className="text-base font-semibold text-slate-900 mb-1">Plan sélectionné</h2>
            <div className="flex items-center gap-2 mb-4">
              <Badge className="bg-emerald-100 text-emerald-700 border-0 text-sm px-3 py-1">
                {plan.name}
              </Badge>
              <span className="text-slate-500 text-sm da-amount">{fmtDA(plan.price)}/mois</span>
            </div>

            {/* Included apps */}
            {includedApps.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">
                  Inclus dans ce plan
                </p>
                <div className="flex flex-wrap gap-2">
                  {includedApps.map(appId => (
                    <span
                      key={appId}
                      className="inline-flex items-center gap-1 text-xs bg-slate-100 text-slate-600 rounded-full px-2.5 py-1"
                    >
                      {APPS[appId as AppId]?.icon} {APPS[appId as AppId]?.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Extra apps toggle */}
            {availableExtras.length > 0 && (
              <div>
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">
                  Modules supplémentaires (optionnels)
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {availableExtras.map(appId => {
                    const app = APPS[appId]
                    const selected = extraApps.includes(appId)
                    return (
                      <button
                        key={appId}
                        type="button"
                        onClick={() => toggleExtra(appId)}
                        className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2.5 text-left text-sm transition-all ${
                          selected
                            ? 'border-emerald-400 bg-emerald-50'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <span>{app.icon}</span>
                          <span className="font-medium text-slate-700">{app.name}</span>
                        </span>
                        <span className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-slate-400 text-xs da-amount">+{fmtDA(app.price)}/mois</span>
                          {selected && <CheckCircle className="w-4 h-4 text-emerald-500" />}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </Card>

          {/* 2. Durée */}
          <Card className="p-6">
            <h2 className="text-base font-semibold text-slate-900 mb-4">Durée</h2>
            <div className="grid grid-cols-2 gap-3">
              {/* Monthly */}
              <button
                type="button"
                onClick={() => setAnnual(false)}
                className={`flex flex-col items-start rounded-xl border-2 p-4 text-left transition-all ${
                  !annual ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <span className="font-semibold text-slate-800 mb-1">Mensuel</span>
                <span className="text-sm text-slate-500 da-amount">{fmtDA(subtotal)}/mois</span>
              </button>

              {/* Annual */}
              <button
                type="button"
                onClick={() => setAnnual(true)}
                className={`flex flex-col items-start rounded-xl border-2 p-4 text-left transition-all ${
                  annual ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <span className="flex items-center gap-2 font-semibold text-slate-800 mb-1">
                  Annuel
                  <Badge className="bg-green-100 text-green-700 border-0 text-xs">-20%</Badge>
                </span>
                <span className="text-sm text-slate-500 da-amount">
                  {fmtDA(Math.round(subtotal * (1 - ANNUAL_DISCOUNT)))}/mois
                </span>
                {subtotal > 0 && (
                  <span className="text-xs text-green-600 mt-1 da-amount">
                    Économie de {fmtDA(annualSaving * 12)}/an
                  </span>
                )}
              </button>
            </div>
          </Card>

          {/* 3. Vos informations */}
          <Card className="p-6">
            <h2 className="text-base font-semibold text-slate-900 mb-4">Vos informations</h2>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Nom complet <span className="text-red-500">*</span></Label>
                <Input
                  value={info.name}
                  onChange={e => setInfo(i => ({ ...i, name: e.target.value }))}
                  placeholder="Karim Benali"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Email <span className="text-red-500">*</span></Label>
                <Input
                  type="email"
                  value={info.email}
                  onChange={e => setInfo(i => ({ ...i, email: e.target.value }))}
                  placeholder="karim@exemple.dz"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Société <span className="text-slate-400 text-xs font-normal">(optionnel)</span></Label>
                <Input
                  value={info.company}
                  onChange={e => setInfo(i => ({ ...i, company: e.target.value }))}
                  placeholder="Bati-Pro SARL"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Téléphone <span className="text-red-500">*</span></Label>
                <Input
                  type="tel"
                  value={info.phone}
                  onChange={e => setInfo(i => ({ ...i, phone: e.target.value }))}
                  placeholder="0555 123 456"
                />
              </div>
            </div>
          </Card>

          {/* 4. Méthode de paiement */}
          <Card className="p-6">
            <h2 className="text-base font-semibold text-slate-900 mb-4">Méthode de paiement</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPaymentMethod('CHARGILY')}
                className={`flex items-center gap-4 rounded-xl border-2 p-5 text-left transition-all ${
                  paymentMethod === 'CHARGILY'
                    ? 'border-emerald-500 bg-emerald-50'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center flex-shrink-0 text-lg">
                  💳
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-slate-800">Chargily Pay</p>
                  <p className="text-xs text-slate-500 mt-0.5">Edahabia · CIB</p>
                </div>
                {paymentMethod === 'CHARGILY' && (
                  <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('CCP')}
                className={`flex items-center gap-4 rounded-xl border-2 p-5 text-left transition-all ${
                  paymentMethod === 'CCP'
                    ? 'border-emerald-500 bg-emerald-50'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl flex items-center justify-center flex-shrink-0 text-lg">
                  🏦
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-slate-800">Virement CCP</p>
                  <p className="text-xs text-slate-500 mt-0.5">24–48h ouvrables</p>
                </div>
                {paymentMethod === 'CCP' && (
                  <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                )}
              </button>
            </div>
          </Card>

          <Button
            className="w-full h-12 text-base font-semibold"
            onClick={handleSubmit}
            disabled={loading || !paymentMethod}
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Confirmer et payer → {fmtDA(monthlyTotal)}
          </Button>
        </div>

        {/* ── RIGHT COLUMN — sticky summary ── */}
        <div className="lg:sticky lg:top-8 h-fit">
          <Card className="p-6">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-4">
              Récapitulatif
            </h2>

            <div className="space-y-2 text-sm">
              {/* Plan line */}
              <div className="flex justify-between">
                <span className="text-slate-600">Plan {plan.name}</span>
                <span className="font-medium text-slate-800 da-amount">{fmtDA(planPrice)}</span>
              </div>

              {/* Extra app lines */}
              {extraApps.map(appId => (
                <div key={appId} className="flex justify-between text-slate-500">
                  <span>+ {APPS[appId].name}</span>
                  <span className="da-amount">{fmtDA(APPS[appId].price)}</span>
                </div>
              ))}
            </div>

            <Separator className="my-3" />

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Sous-total</span>
                <span className="text-slate-700 da-amount">{fmtDA(subtotal)}</span>
              </div>

              {annual && subtotal > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Remise annuelle -20%</span>
                  <span className="da-amount">-{fmtDA(annualSaving)}</span>
                </div>
              )}
            </div>

            <Separator className="my-3" />

            <div className="flex justify-between items-baseline">
              <span className="font-bold text-slate-900">TOTAL / mois</span>
              <span className="font-bold text-xl text-emerald-700 da-amount">{fmtDA(monthlyTotal)}</span>
            </div>

            {annual && (
              <p className="text-xs text-slate-400 mt-1 text-right da-amount">
                Soit {fmtDA(annualTotal)}/an
              </p>
            )}

            <Separator className="my-4" />

            <div className="space-y-2">
              {[
                annual ? '✓ Sans engagement annuel résiliable' : '✓ Sans engagement',
                '✓ Résiliation à tout moment',
                '✓ Support inclus',
                '✓ Données sécurisées',
              ].map(item => (
                <p key={item} className="text-xs text-slate-500 flex items-center gap-1.5">
                  {item}
                </p>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center text-slate-400">
        Chargement…
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  )
}
