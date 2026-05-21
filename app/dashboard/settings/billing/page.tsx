'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, CreditCard, CheckCircle, Clock, AlertTriangle,
  RefreshCw, Zap, X, Loader2, Check,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatDA } from '@/lib/algerian/format'

interface Sub {
  id: string
  planId: string
  status: string
  billingCycle: string
  trialEndsAt: string | null
  currentPeriodEnd: string
  monthlyAmount: number
  payments: Payment[]
}

interface Payment {
  id: string
  createdAt: string
  planId: string
  amount: number
  method: string
  status: string
  paidAt: string | null
}

const STATUS_LABELS: Record<string, string> = {
  TRIAL: 'Essai gratuit', ACTIVE: 'Actif', EXPIRED: 'Expiré',
  CANCELLED: 'Annulé', PAUSED: 'En pause', PAST_DUE: 'Paiement en retard',
}

const METHOD_LABELS: Record<string, string> = {
  CHARGILY: 'Chargily Pay', CCP: 'Virement CCP', CARD: 'Carte bancaire',
  CASH: 'Espèces', FREE: 'Gratuit', ADMIN_GIFT: 'Offert', ADMIN_ACTIVATE: 'Activé manuellement',
}

const PLAN_LABELS: Record<string, string> = {
  trial: 'Essai gratuit', starter: 'Starter', premium: 'Premium', pro: 'Pro', agency: 'Agency',
}

const PLAN_IDS = ['starter', 'premium', 'pro', 'agency'] as const
type PlanId = typeof PLAN_IDS[number]

type PlanMeta = { id: PlanId; name: string; desc: string; limit: string; whiteLabel: boolean; popular?: boolean }
const PLAN_META: PlanMeta[] = [
  { id: 'starter', name: 'Starter',  desc: 'Pour démarrer',            limit: '20 abonnements actifs',  whiteLabel: false },
  { id: 'premium', name: 'Premium',  desc: 'Pour les petites équipes', limit: '50 abonnements actifs',  whiteLabel: false },
  { id: 'pro',     name: 'Pro',      desc: 'Pour les entreprises',     limit: '220 abonnements actifs', whiteLabel: true, popular: true },
  { id: 'agency',  name: 'Agency',   desc: 'Pour les agences',         limit: 'Abonnements illimités',  whiteLabel: true },
]

function daysLeft(iso: string) {
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000))
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-DZ', { day: 'numeric', month: 'long', year: 'numeric' })
}

// ─── CCP Result Screen ────────────────────────────────────────────────────────
function CcpResult({ ccpRef, amount, onClose }: { ccpRef: string; amount: number; onClose: () => void }) {
  const waLink = `https://wa.me/33761179379?text=${encodeURIComponent(
    `Bonjour, voici mon reçu de virement CCP pour l'abonnement YelhaSubs.\nRéférence : ${ccpRef}\nMontant : ${amount} DA`
  )}`
  return (
    <ModalShell onClose={onClose}>
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0">
            <CheckCircle className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <p className="font-semibold text-white">Commande enregistrée</p>
            <p className="text-xs text-white/40">Activé sous 24h après confirmation du virement</p>
          </div>
        </div>

        <div className="rounded-xl bg-white/[0.04] border border-white/[0.08] p-4 space-y-3">
          <InfoRow label="Numéro CCP" value="00799999004399346548" mono />
          <InfoRow label="Référence"  value={ccpRef} mono accent />
          <InfoRow label="Montant"    value={formatDA(amount)} bold />
        </div>

        <div className="rounded-xl bg-white/[0.03] border border-white/[0.07] p-4 space-y-2">
          <p className="text-xs font-semibold text-white/70">Après le virement</p>
          <p className="text-xs text-white/50 leading-relaxed">
            Envoyez une photo du reçu de virement sur WhatsApp en mentionnant la référence{' '}
            <span className="font-mono text-emerald-400">{ccpRef}</span>.
          </p>
          <a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full mt-1 py-2 rounded-lg bg-[#25D366]/10 border border-[#25D366]/30 text-[#25D366] text-xs font-semibold hover:bg-[#25D366]/20 transition-colors"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" xmlns="http://www.w3.org/2000/svg">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            Envoyer le reçu sur WhatsApp (+33 7 61 17 93 79)
          </a>
        </div>

        <Button onClick={onClose} className="w-full bg-white/[0.06] hover:bg-white/[0.1] text-white border border-white/[0.1]">
          Fermer
        </Button>
      </div>
    </ModalShell>
  )
}

// ─── Checkout Modal ────────────────────────────────────────────────────────────
function CheckoutModal({
  planId, cycle, prices, onClose,
}: {
  planId: PlanId; cycle: 'MONTHLY' | 'ANNUAL'; prices: Record<string, number>; onClose: () => void
}) {
  const [selectedPlan, setSelectedPlan] = useState<PlanId>(planId)
  const [billingCycle, setBillingCycle] = useState<'MONTHLY' | 'ANNUAL'>(cycle)
  const [method, setMethod] = useState<'CHARGILY' | 'CCP'>('CHARGILY')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [ccpResult, setCcpResult] = useState<{ ccpRef: string; amount: number } | null>(null)

  const basePrice   = prices[selectedPlan] ?? 0
  const monthlyPrice = billingCycle === 'ANNUAL' ? Math.round(basePrice * 0.8) : basePrice
  const totalPrice   = billingCycle === 'ANNUAL' ? monthlyPrice * 12 : monthlyPrice

  async function handlePay() {
    setLoading(true); setError('')
    try {
      const res  = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: selectedPlan, billingCycle, method }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Erreur lors du paiement.'); return }
      if (method === 'CHARGILY' && data.url) { window.location.href = data.url }
      else if (method === 'CCP') { setCcpResult({ ccpRef: data.ccpRef, amount: data.amount }) }
    } catch { setError('Erreur réseau.') }
    finally   { setLoading(false) }
  }

  if (ccpResult) return <CcpResult ccpRef={ccpResult.ccpRef} amount={ccpResult.amount} onClose={onClose} />

  return (
    <ModalShell onClose={onClose}>
      <div className="space-y-5">
        <div>
          <p className="text-base font-semibold text-white">Choisir un plan</p>
          <p className="text-xs text-white/40 mt-0.5">Sélectionnez votre formule et mode de paiement</p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {PLAN_IDS.map(id => (
            <button key={id} onClick={() => setSelectedPlan(id)}
              className={`rounded-xl p-3 text-left border transition-all ${
                selectedPlan === id
                  ? 'border-emerald-500/60 bg-emerald-500/[0.08]'
                  : 'border-white/[0.08] bg-white/[0.02] hover:border-white/[0.15]'
              }`}
            >
              <p className="text-sm font-semibold text-white">{PLAN_LABELS[id]}</p>
              <p className="text-xs text-white/50 mt-0.5">{formatDA(prices[id] ?? 0)}/mois</p>
            </button>
          ))}
        </div>

        <div>
          <p className="text-xs font-medium text-white/50 mb-2">Facturation</p>
          <div className="flex gap-2">
            {(['MONTHLY', 'ANNUAL'] as const).map(c => (
              <button key={c} onClick={() => setBillingCycle(c)}
                className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-all ${
                  billingCycle === c
                    ? 'border-emerald-500/60 bg-emerald-500/[0.08] text-white'
                    : 'border-white/[0.08] text-white/50 hover:text-white'
                }`}
              >
                {c === 'MONTHLY' ? 'Mensuel' : <span>Annuel <span className="text-emerald-400">−20%</span></span>}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-medium text-white/50 mb-2">Mode de paiement</p>
          <div className="flex gap-2">
            {([['CHARGILY', 'Chargily (Edahabia / CIB)'], ['CCP', 'Virement CCP']] as const).map(([m, label]) => (
              <button key={m} onClick={() => setMethod(m)}
                className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-all ${
                  method === m
                    ? 'border-emerald-500/60 bg-emerald-500/[0.08] text-white'
                    : 'border-white/[0.08] text-white/50 hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-xl bg-white/[0.03] border border-white/[0.07] p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-white">{PLAN_LABELS[selectedPlan]} · {billingCycle === 'ANNUAL' ? 'Annuel' : 'Mensuel'}</p>
            {billingCycle === 'ANNUAL' && <p className="text-xs text-white/40">{formatDA(monthlyPrice)}/mois</p>}
          </div>
          <p className="text-lg font-bold text-white">{formatDA(totalPrice)}</p>
        </div>

        {error && (
          <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-2.5 text-xs text-red-400">{error}</div>
        )}

        <Button onClick={handlePay} disabled={loading} className="w-full bg-emerald-500 hover:bg-emerald-400 text-white font-semibold gap-2">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
          {method === 'CHARGILY' ? 'Payer avec Chargily' : 'Confirmer la commande CCP'}
        </Button>
      </div>
    </ModalShell>
  )
}

function InfoRow({ label, value, mono, accent, bold }: { label: string; value: string; mono?: boolean; accent?: boolean; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-white/50">{label}</span>
      <span className={`${mono ? 'font-mono' : ''} ${accent ? 'text-emerald-400' : bold ? 'font-bold text-white' : 'text-white/80'}`}>{value}</span>
    </div>
  )
}

function ModalShell({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-2xl bg-[#111113] border border-white/[0.1] p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 text-white/30 hover:text-white transition-colors">
          <X className="w-4 h-4" />
        </button>
        {children}
      </div>
    </div>
  )
}

// ─── Plan Cards ───────────────────────────────────────────────────────────────
function PlanCards({
  prices, annual, currentPlanId, onSelect,
}: {
  prices: Record<string, number>; annual: boolean; currentPlanId: string; onSelect: (id: PlanId, cycle: 'MONTHLY' | 'ANNUAL') => void
}) {
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {PLAN_META.map(p => {
        const price    = annual ? Math.round((prices[p.id] ?? 0) * 0.8) : (prices[p.id] ?? 0)
        const isCurrent = p.id === currentPlanId
        return (
          <div
            key={p.id}
            className={`relative rounded-2xl p-5 flex flex-col gap-4 border transition-all ${
              p.popular
                ? 'border-emerald-500/50 bg-emerald-500/[0.06] shadow-[0_0_30px_-8px_rgba(16,185,129,0.2)]'
                : 'border-white/[0.08] bg-white/[0.02] hover:border-white/[0.15]'
            }`}
          >
            {p.popular && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-[10px] font-bold px-3 py-0.5 rounded-full">
                POPULAIRE
              </span>
            )}

            <div>
              <h3 className="font-semibold text-white">{p.name}</h3>
              <p className="text-white/40 text-xs mt-0.5">{p.desc}</p>
            </div>

            <div>
              <span className="text-2xl font-bold text-white">{formatDA(price)}</span>
              <span className="text-white/40 text-xs ml-1">/mois</span>
              {annual && <p className="text-emerald-400 text-[10px] mt-0.5">{formatDA(price * 12)}/an</p>}
            </div>

            <ul className="flex-1 space-y-2">
              <li className="flex items-center gap-2 text-xs text-white/60">
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />{p.limit}
              </li>
              {p.whiteLabel && (
                <li className="flex items-center gap-2 text-xs text-white/60">
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />Emails à votre nom
                </li>
              )}
            </ul>

            {isCurrent ? (
              <div className="flex items-center justify-center py-2 rounded-xl text-xs font-medium text-white/40 border border-white/[0.06] bg-white/[0.02]">
                Plan actuel
              </div>
            ) : (
              <button
                onClick={() => onSelect(p.id, annual ? 'ANNUAL' : 'MONTHLY')}
                className={`flex items-center justify-center py-2 rounded-xl text-xs font-medium transition-colors ${
                  p.popular
                    ? 'bg-emerald-500 hover:bg-emerald-400 text-white'
                    : 'bg-white/[0.06] border border-white/[0.08] text-white hover:bg-white/[0.1]'
                }`}
              >
                Choisir ce plan
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function BillingPage() {
  const searchParams = useSearchParams()
  const router       = useRouter()

  const [sub, setSub]             = useState<Sub | null>(null)
  const [planPrices, setPlanPrices] = useState<Record<string, number>>({ starter: 990, premium: 1990, pro: 2990, agency: 4990 })
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState('')
  const [checkoutPlan, setCheckoutPlan]   = useState<PlanId | null>(null)
  const [checkoutCycle, setCheckoutCycle] = useState<'MONTHLY' | 'ANNUAL'>('MONTHLY')
  const [annual, setAnnual]       = useState(false)

  const openCheckout = useCallback((planId: PlanId, cycle: 'MONTHLY' | 'ANNUAL' = 'MONTHLY') => {
    setCheckoutPlan(planId)
    setCheckoutCycle(cycle)
  }, [])

  useEffect(() => {
    Promise.all([
      fetch('/api/billing/subscription').then(r => r.json()),
      fetch('/api/billing/plans').then(r => r.json()),
    ]).then(([subData, plansData]) => {
      if (subData.subscription) setSub(subData.subscription)
      else setError("Impossible de charger l'abonnement.")
      if (plansData.plans) {
        const prices: Record<string, number> = {}
        for (const [id, p] of Object.entries(plansData.plans as Record<string, { price: number }>)) prices[id] = p.price
        setPlanPrices(prices)
      }
    }).catch(() => setError('Erreur réseau.')).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const plan  = searchParams.get('plan')
    const cycle = searchParams.get('cycle')
    if (plan && PLAN_IDS.includes(plan as PlanId)) {
      openCheckout(plan as PlanId, cycle === 'ANNUAL' ? 'ANNUAL' : 'MONTHLY')
      router.replace('/dashboard/settings/billing', { scroll: false })
    }
  }, [searchParams, openCheckout, router])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error || !sub) {
    return (
      <div className="p-6 max-w-2xl">
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-center">
          <AlertTriangle className="h-8 w-8 text-red-400 mx-auto mb-2" />
          <p className="text-red-400 font-medium">{error || 'Abonnement introuvable'}</p>
        </div>
      </div>
    )
  }

  const isTrial   = sub.status === 'TRIAL'
  const isActive  = sub.status === 'ACTIVE'
  const isExpired = sub.status === 'EXPIRED' || sub.status === 'CANCELLED'
  const trialDays = sub.trialEndsAt ? daysLeft(sub.trialEndsAt) : 0
  const paidPayments = sub.payments.filter(p => p.status === 'PAID' || p.status === 'SUCCEEDED')

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8">
      {checkoutPlan && (
        <CheckoutModal
          planId={checkoutPlan}
          cycle={checkoutCycle}
          prices={planPrices}
          onClose={() => setCheckoutPlan(null)}
        />
      )}

      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard/subscriptions/overview">
          <Button variant="ghost" size="icon" className="text-white/40 hover:text-white hover:bg-white/[0.06]">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-semibold text-white">Paiement</h1>
          <p className="text-sm text-white/40">Gérez votre abonnement YelhaSubs</p>
        </div>
      </div>

      {/* Current plan banner */}
      <div className={`rounded-xl border p-5 space-y-4 ${
        isActive  ? 'border-emerald-500/30 bg-emerald-500/[0.05]'
        : isTrial ? 'border-amber-500/30 bg-amber-500/[0.05]'
        : 'border-white/[0.07] bg-white/[0.02]'
      }`}>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-1">Plan actuel</p>
            <p className="text-2xl font-bold text-white">{PLAN_LABELS[sub.planId] ?? sub.planId}</p>
            {sub.monthlyAmount > 0 && <p className="text-sm text-white/50 mt-0.5">{formatDA(sub.monthlyAmount)} / mois</p>}
          </div>
          {isTrial && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-semibold">
              <Clock className="w-3.5 h-3.5" />Essai — {trialDays}j restant{trialDays !== 1 ? 's' : ''}
            </span>
          )}
          {isActive && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
              <CheckCircle className="w-3.5 h-3.5" />Actif
            </span>
          )}
          {isExpired && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-500/15 border border-red-500/30 text-red-400 text-xs font-semibold">
              <AlertTriangle className="w-3.5 h-3.5" />{STATUS_LABELS[sub.status]}
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-4 text-sm text-white/40">
          {isTrial && sub.trialEndsAt && (
            <span>Essai jusqu&apos;au <strong className="text-white/70">{fmtDate(sub.trialEndsAt)}</strong></span>
          )}
          {isActive && (
            <span>Prochain renouvellement : <strong className="text-white/70">{fmtDate(sub.currentPeriodEnd)}</strong></span>
          )}
        </div>

        {(isTrial || isExpired) && (
          <Button onClick={() => openCheckout('starter')} className="gap-2 bg-emerald-500 hover:bg-emerald-400 text-white w-full sm:w-auto">
            <Zap className="w-4 h-4" />
            {isExpired ? "Renouveler l'abonnement" : 'Passer à un plan payant'}
          </Button>
        )}
        {isActive && (
          <Button variant="outline" onClick={() => openCheckout(sub.planId as PlanId)} className="gap-2 border-white/[0.1] text-white/60 hover:text-white hover:bg-white/[0.06]">
            <RefreshCw className="w-4 h-4" />Changer de plan
          </Button>
        )}
      </div>

      {/* Plans section */}
      <div className="space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <p className="text-base font-semibold text-white">Choisir un plan</p>
          <div className="inline-flex items-center gap-1 bg-white/[0.04] border border-white/[0.08] rounded-full p-1">
            <button
              onClick={() => setAnnual(false)}
              className={`px-4 py-1.5 text-xs font-medium rounded-full transition-all ${!annual ? 'bg-white text-[#0a0a0b] shadow' : 'text-white/50 hover:text-white'}`}
            >
              Mensuel
            </button>
            <button
              onClick={() => setAnnual(true)}
              className={`px-4 py-1.5 text-xs font-medium rounded-full transition-all flex items-center gap-1.5 ${annual ? 'bg-white text-[#0a0a0b] shadow' : 'text-white/50 hover:text-white'}`}
            >
              Annuel <span className={`text-[10px] font-bold ${annual ? 'text-emerald-600' : 'text-emerald-400'}`}>−20%</span>
            </button>
          </div>
        </div>

        <PlanCards
          prices={planPrices}
          annual={annual}
          currentPlanId={sub.planId}
          onSelect={openCheckout}
        />
      </div>

      {/* Historique paiements */}
      {paidPayments.length > 0 && (
        <div className="rounded-xl border border-white/[0.07] overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-white/[0.07]">
            <CreditCard className="h-4 w-4 text-white/40" />
            <p className="font-medium text-white text-sm">Historique des paiements</p>
          </div>
          <div className="divide-y divide-white/[0.05]">
            {paidPayments.map(p => (
              <div key={p.id} className="flex items-center justify-between px-5 py-3.5">
                <div>
                  <p className="text-sm text-white/80">{PLAN_LABELS[p.planId] ?? p.planId}</p>
                  <p className="text-xs text-white/35 mt-0.5">{fmtDate(p.paidAt ?? p.createdAt)} · {METHOD_LABELS[p.method] ?? p.method}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-white">{p.amount === 0 ? '—' : formatDA(p.amount)}</p>
                  <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400">
                    <CheckCircle className="w-3 h-3" /> Payé
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {paidPayments.length === 0 && (
        <p className="text-sm text-white/25 text-center py-4">Aucun paiement enregistré pour l&apos;instant.</p>
      )}
    </div>
  )
}
