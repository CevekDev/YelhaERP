'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { Check, CreditCard, Building2, Loader2, Copy, MessageCircle, ArrowLeft, Tag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

const CCP_ACCOUNT = '00799999004399346548'
const WHATSAPP_NUMBER = '+33761179379'

const PLANS = [
  {
    id: 'STARTER',
    name: 'Starter',
    price: 1500,
    color: 'border-blue-200',
    badge: 'bg-blue-100 text-blue-800',
    features: ['Facturation illimitée', 'Devis & clients', 'Stock & produits', 'Support email', '50 questions IA/mois'],
  },
  {
    id: 'PRO',
    name: 'Pro',
    price: 3200,
    color: 'border-yelha-400 ring-2 ring-yelha-400',
    badge: 'bg-yelha-100 text-yelha-800',
    popular: true,
    features: ['Tout Starter +', 'CRM & Pipeline', 'Comptabilité PCN', 'RH & Congés', 'Production & BOM', 'Projets & Temps', '300 questions IA/mois'],
  },
  {
    id: 'AGENCY',
    name: 'Agency',
    price: 9900,
    color: 'border-purple-200',
    badge: 'bg-purple-100 text-purple-800',
    features: ['Tout Pro +', 'Plusieurs entités', 'API accès', 'Support prioritaire', 'IA illimitée', 'Onboarding dédié'],
  },
]

const DURATIONS = [
  { months: 1,  label: '1 mois',  discount: 0,    discountBadge: null },
  { months: 2,  label: '2 mois',  discount: 0,    discountBadge: null },
  { months: 3,  label: '3 mois',  discount: 0.10, discountBadge: '-10%' },
  { months: 6,  label: '6 mois',  discount: 0.10, discountBadge: '-10%' },
  { months: 12, label: '1 an',    discount: 0.20, discountBadge: '-20%' },
]

function calcTotal(price: number, months: number, discount: number) {
  return Math.round(price * months * (1 - discount))
}

export default function BillingPage() {
  const { data: session } = useSession()
  const currentPlan = session?.user?.plan ?? 'TRIAL'

  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)
  const [selectedMonths, setSelectedMonths] = useState<number>(1)
  const [payMethod, setPayMethod] = useState<'chargily' | 'ccp' | null>(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')

  const plan = PLANS.find(p => p.id === selectedPlan)
  const duration = DURATIONS.find(d => d.months === selectedMonths) ?? DURATIONS[0]
  const total = plan ? calcTotal(plan.price, selectedMonths, duration.discount) : 0

  const handleChargily = async () => {
    if (!selectedPlan) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/subscription/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: selectedPlan, months: selectedMonths }),
      })
      const data = await res.json()
      if (data.checkout_url) {
        window.location.href = data.checkout_url
      } else {
        setError(data.error ?? 'Erreur lors de la création du paiement.')
        setLoading(false)
      }
    } catch {
      setError('Erreur de connexion. Veuillez réessayer.')
      setLoading(false)
    }
  }

  const copyAccount = () => {
    navigator.clipboard.writeText(CCP_ACCOUNT)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const whatsappText = plan
    ? encodeURIComponent(`Bonjour, je souhaite souscrire au plan ${plan.name} de YelhaERP pour ${selectedMonths} mois — ${total.toLocaleString('fr-DZ')} DA. Entreprise : ${session?.user?.companyName ?? ''}. Voici ma preuve de paiement :`)
    : ''

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-4xl">
      <Breadcrumb items={[
        { label: 'Paramètres', href: '/dashboard/settings' },
        { label: 'Abonnement & facturation' },
      ]} />

      <div className="flex items-center gap-3">
        <Link href="/dashboard/settings">
          <Button variant="outline" size="sm"><ArrowLeft className="w-4 h-4" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Abonnement & facturation</h1>
          <p className="text-muted-foreground text-sm">Plan actuel : <strong>{currentPlan}</strong></p>
        </div>
      </div>

      {/* Step 1 — Choose plan */}
      <div className="space-y-3">
        <h2 className="font-semibold text-lg">1. Choisissez votre plan</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PLANS.map(p => {
            const isCurrent = p.id === currentPlan
            const isSelected = p.id === selectedPlan
            return (
              <button
                key={p.id}
                onClick={() => { if (!isCurrent) { setSelectedPlan(p.id); setPayMethod(null); setError('') } }}
                disabled={isCurrent}
                className={`relative text-left border-2 rounded-2xl p-5 transition-all ${p.color} ${isSelected ? 'shadow-lg' : 'hover:shadow-md'} ${isCurrent ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                {p.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-yelha-500 text-white text-xs font-bold px-3 py-1 rounded-full">Populaire</span>
                )}
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${p.badge}`}>{p.name}</span>
                  {isCurrent && <span className="text-xs text-muted-foreground">Plan actuel</span>}
                  {isSelected && !isCurrent && <Check className="w-4 h-4 text-yelha-500" />}
                </div>
                <p className="text-3xl font-bold">{p.price.toLocaleString('fr-DZ')} <span className="text-base font-normal text-muted-foreground">DA/mois</span></p>
                <ul className="mt-4 space-y-1.5">
                  {p.features.map(f => (
                    <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Check className="w-3.5 h-3.5 text-green-500 shrink-0" />{f}
                    </li>
                  ))}
                </ul>
              </button>
            )
          })}
        </div>
      </div>

      {/* Step 2 — Choose duration */}
      {selectedPlan && plan && (
        <div className="space-y-3">
          <h2 className="font-semibold text-lg">2. Durée d'abonnement</h2>
          <div className="flex flex-wrap gap-2">
            {DURATIONS.map(d => {
              const isSelected = d.months === selectedMonths
              const dTotal = calcTotal(plan.price, d.months, d.discount)
              return (
                <button
                  key={d.months}
                  onClick={() => { setSelectedMonths(d.months); setPayMethod(null) }}
                  className={`relative flex flex-col items-center px-4 py-3 rounded-xl border-2 transition-all min-w-[88px] ${isSelected ? 'border-yelha-400 bg-yelha-50 shadow-sm' : 'border-border hover:border-muted-foreground'}`}
                >
                  {d.discountBadge && (
                    <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5">
                      <Tag className="w-2.5 h-2.5" />{d.discountBadge}
                    </span>
                  )}
                  <span className={`font-semibold text-sm ${isSelected ? 'text-yelha-700' : ''}`}>{d.label}</span>
                  <span className="text-xs text-muted-foreground mt-0.5">{dTotal.toLocaleString('fr-DZ')} DA</span>
                  {d.discount > 0 && (
                    <span className="text-[10px] text-green-600 font-medium mt-0.5">
                      économie {Math.round(plan.price * d.months * d.discount).toLocaleString('fr-DZ')} DA
                    </span>
                  )}
                </button>
              )
            })}
          </div>
          <div className="bg-muted/40 rounded-xl p-3 text-sm flex items-center justify-between">
            <span className="text-muted-foreground">Total à payer — {plan.name} × {selectedMonths} mois{duration.discount > 0 ? ` (−${duration.discount * 100}%)` : ''}</span>
            <span className="font-bold text-lg">{total.toLocaleString('fr-DZ')} DA</span>
          </div>
        </div>
      )}

      {/* Step 3 — Choose payment method */}
      {selectedPlan && (
        <div className="space-y-3">
          <h2 className="font-semibold text-lg">3. Mode de paiement</h2>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setPayMethod('chargily')}
              className={`border-2 rounded-xl p-4 text-left transition-all ${payMethod === 'chargily' ? 'border-yelha-400 bg-yelha-50' : 'border-border hover:border-muted-foreground'}`}
            >
              <div className="flex items-center gap-2 mb-2">
                <CreditCard className="w-5 h-5 text-yelha-500" />
                <span className="font-semibold">EDAHABIA / CIB</span>
              </div>
              <p className="text-xs text-muted-foreground">Paiement en ligne sécurisé via Chargily Pay — carte EDAHABIA ou CIB</p>
            </button>
            <button
              onClick={() => setPayMethod('ccp')}
              className={`border-2 rounded-xl p-4 text-left transition-all ${payMethod === 'ccp' ? 'border-yelha-400 bg-yelha-50' : 'border-border hover:border-muted-foreground'}`}
            >
              <div className="flex items-center gap-2 mb-2">
                <Building2 className="w-5 h-5 text-amber-500" />
                <span className="font-semibold">Virement CCP</span>
              </div>
              <p className="text-xs text-muted-foreground">Virement postal vers notre compte CCP + envoi de preuve par WhatsApp</p>
            </button>
          </div>
        </div>
      )}

      {/* Step 4 — Chargily payment */}
      {selectedPlan && payMethod === 'chargily' && plan && (
        <div className="border rounded-2xl p-6 bg-card space-y-4">
          <h2 className="font-semibold text-lg">4. Paiement en ligne</h2>
          <div className="flex items-center justify-between bg-muted/50 rounded-xl p-4">
            <div>
              <p className="font-medium">Plan {plan.name} — {selectedMonths} mois</p>
              <p className="text-sm text-muted-foreground">
                {plan.price.toLocaleString('fr-DZ')} DA/mois{duration.discount > 0 ? ` × ${selectedMonths} − ${duration.discount * 100}%` : ` × ${selectedMonths}`}
              </p>
            </div>
            <p className="text-xl font-bold">{total.toLocaleString('fr-DZ')} DA</p>
          </div>
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <span className="text-green-500">🔒</span>
            Paiement 100% sécurisé via Chargily Pay — agréé Banque d'Algérie
          </p>
          {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg p-3">{error}</p>}
          <Button onClick={handleChargily} disabled={loading} className="w-full" size="lg">
            {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Redirection...</> : <><CreditCard className="w-4 h-4 mr-2" />Payer {total.toLocaleString('fr-DZ')} DA en ligne</>}
          </Button>
        </div>
      )}

      {/* Step 4 — CCP payment */}
      {selectedPlan && payMethod === 'ccp' && plan && (
        <div className="border rounded-2xl p-6 bg-card space-y-4">
          <h2 className="font-semibold text-lg">4. Virement CCP</h2>
          <ol className="space-y-3 text-sm text-muted-foreground">
            <li className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-yelha-100 text-yelha-700 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
              Effectuez un virement de <strong className="text-foreground">{total.toLocaleString('fr-DZ')} DA</strong> vers le compte CCP ci-dessous
            </li>
            <li className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-yelha-100 text-yelha-700 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
              Indiquez en référence : <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-foreground">YELHA-{plan.id}-{selectedMonths}M-{session?.user?.companyName?.slice(0, 8).toUpperCase()}</span>
            </li>
            <li className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-yelha-100 text-yelha-700 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">3</span>
              Envoyez la preuve de virement par WhatsApp — votre plan sera activé sous 24h ouvrables
            </li>
          </ol>

          <div className="bg-gray-50 border rounded-xl p-4">
            <p className="text-xs text-muted-foreground mb-1">Numéro de compte CCP</p>
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-lg font-bold tracking-wider">{CCP_ACCOUNT}</span>
              <button onClick={copyAccount} className="flex items-center gap-1.5 text-xs text-yelha-600 hover:text-yelha-700 shrink-0">
                {copied ? <><Check className="w-3.5 h-3.5 text-green-500" />Copié</> : <><Copy className="w-3.5 h-3.5" />Copier</>}
              </button>
            </div>
          </div>

          <a
            href={`https://wa.me/${WHATSAPP_NUMBER.replace('+', '')}?text=${whatsappText}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-3 px-6 rounded-xl bg-green-500 hover:bg-green-600 text-white font-semibold transition-colors"
          >
            <MessageCircle className="w-4 h-4" />
            Envoyer la preuve par WhatsApp
          </a>
          <p className="text-xs text-center text-muted-foreground">{WHATSAPP_NUMBER}</p>
        </div>
      )}
    </div>
  )
}
