'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Loader2, TrendingUp, CheckCircle, CreditCard, Landmark, Shield } from 'lucide-react'
import { formatDA } from '@/lib/algerian/format'

// ── Plan config ───────────────────────────────────────────────────────────────

const PLANS: Record<string, { label: string; price: number; color: string }> = {
  STARTER: { label: 'Starter',  price: 1500, color: 'bg-blue-50 border-blue-200 text-blue-700' },
  PRO:     { label: 'Pro',      price: 3200, color: 'bg-yelha-50 border-yelha-200 text-yelha-700' },
  AGENCY:  { label: 'Agency',   price: 9900, color: 'bg-purple-50 border-purple-200 text-purple-700' },
}

const DURATIONS = [
  { months: 1,  label: '1 mois',   discount: 0 },
  { months: 3,  label: '3 mois',   discount: 10 },
  { months: 6,  label: '6 mois',   discount: 15 },
  { months: 12, label: '12 mois',  discount: 20 },
]

type PaymentMethod = 'chargily' | 'ccp' | null

function CheckoutContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { data: session } = useSession()

  const planKey = (searchParams.get('plan') ?? 'STARTER').toUpperCase()
  const plan = PLANS[planKey] ?? PLANS.STARTER

  const [months, setMonths] = useState(1)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(null)
  const [loading, setLoading] = useState(false)
  const [showCcpModal, setShowCcpModal] = useState(false)

  const [info, setInfo] = useState({ name: '', email: '', phone: '' })

  useEffect(() => {
    if (session?.user) {
      setInfo(i => ({
        ...i,
        name:  session.user.name ?? '',
        email: session.user.email ?? '',
      }))
    }
  }, [session])

  const durOpt = DURATIONS.find(d => d.months === months) ?? DURATIONS[0]
  const baseTotal = plan.price * months
  const discount = Math.round(baseTotal * durOpt.discount / 100)
  const total = baseTotal - discount

  const handleSubmit = async () => {
    if (!paymentMethod) { toast.error('Choisissez une méthode de paiement'); return }
    if (!info.name || !info.email) { toast.error('Veuillez remplir vos informations'); return }

    if (paymentMethod === 'chargily') {
      setLoading(true)
      try {
        const res = await fetch('/api/subscription/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ plan: planKey, months, locale: 'fr' }),
        })
        const data = await res.json()
        if (!res.ok || !data.checkout_url) {
          toast.error(data.error ?? 'Erreur lors de la redirection vers le paiement')
          return
        }
        window.location.href = data.checkout_url
      } catch {
        toast.error('Une erreur est survenue')
      } finally {
        setLoading(false)
      }
      return
    }

    // CCP
    setShowCcpModal(true)
  }

  const handleCcpConfirm = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/subscriptions/ccp-pending', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planKey, months, name: info.name, email: info.email, phone: info.phone }),
      })
      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error ?? 'Erreur lors de l\'envoi')
        return
      }
      setShowCcpModal(false)
      toast.success('Votre demande est enregistrée. Nous validerons votre paiement sous 24h.')
      router.push('/dashboard')
    } catch {
      toast.error('Une erreur est survenue')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center gap-2">
          <div className="w-8 h-8 bg-yelha-500 rounded-lg flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-yelha-700 text-lg">YelhaERP</span>
          <Badge className={`ml-3 ${plan.color} border`}>{plan.label}</Badge>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-10 grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-8">

        {/* ── Left column ── */}
        <div className="space-y-6">

          {/* Durée */}
          <Card className="p-6">
            <h2 className="text-base font-semibold text-slate-900 mb-4">Durée de l&apos;abonnement</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {DURATIONS.map(d => (
                <button
                  key={d.months}
                  type="button"
                  onClick={() => setMonths(d.months)}
                  className={`flex flex-col items-center gap-1 rounded-xl border-2 p-4 transition-all ${
                    months === d.months
                      ? 'border-yelha-500 bg-yelha-50'
                      : 'border-slate-200 bg-white hover:border-yelha-300'
                  }`}
                >
                  <span className="font-semibold text-sm text-slate-800">{d.label}</span>
                  {d.discount > 0 && (
                    <Badge className="bg-green-100 text-green-700 border-0 text-xs">-{d.discount}%</Badge>
                  )}
                  <span className="text-xs text-slate-500 mt-1">
                    {formatDA(plan.price * (1 - d.discount / 100))}/mois
                  </span>
                </button>
              ))}
            </div>
          </Card>

          {/* Informations */}
          <Card className="p-6">
            <h2 className="text-base font-semibold text-slate-900 mb-4">Vos informations</h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nom complet <span className="text-red-500">*</span></Label>
                <Input
                  value={info.name}
                  onChange={e => setInfo(i => ({ ...i, name: e.target.value }))}
                  placeholder="Karim Benali"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Email <span className="text-red-500">*</span></Label>
                  <Input
                    type="email"
                    value={info.email}
                    onChange={e => setInfo(i => ({ ...i, email: e.target.value }))}
                    placeholder="karim@exemple.dz"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Téléphone</Label>
                  <Input
                    value={info.phone}
                    onChange={e => setInfo(i => ({ ...i, phone: e.target.value }))}
                    placeholder="0555 123 456"
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* Méthode de paiement */}
          <Card className="p-6">
            <h2 className="text-base font-semibold text-slate-900 mb-4">Méthode de paiement</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPaymentMethod('chargily')}
                className={`flex items-center gap-4 rounded-xl border-2 p-5 text-left transition-all ${
                  paymentMethod === 'chargily'
                    ? 'border-yelha-500 bg-yelha-50'
                    : 'border-slate-200 bg-white hover:border-yelha-300'
                }`}
              >
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
                  <CreditCard className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-slate-800">Chargily Pay</p>
                  <p className="text-xs text-slate-500 mt-0.5">Edahabia / CIB</p>
                </div>
                {paymentMethod === 'chargily' && (
                  <CheckCircle className="w-5 h-5 text-yelha-500 ml-auto flex-shrink-0" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('ccp')}
                className={`flex items-center gap-4 rounded-xl border-2 p-5 text-left transition-all ${
                  paymentMethod === 'ccp'
                    ? 'border-yelha-500 bg-yelha-50'
                    : 'border-slate-200 bg-white hover:border-yelha-300'
                }`}
              >
                <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Landmark className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-slate-800">Virement CCP</p>
                  <p className="text-xs text-slate-500 mt-0.5">Validation sous 24h</p>
                </div>
                {paymentMethod === 'ccp' && (
                  <CheckCircle className="w-5 h-5 text-yelha-500 ml-auto flex-shrink-0" />
                )}
              </button>
            </div>
          </Card>

          <Button
            className="w-full h-12 text-base"
            onClick={handleSubmit}
            disabled={loading || !paymentMethod}
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Confirmer et payer →
          </Button>
        </div>

        {/* ── Right column — récapitulatif ── */}
        <div className="lg:sticky lg:top-8 h-fit space-y-4">
          <Card className="p-6">
            <h2 className="text-base font-semibold text-slate-900 mb-4">Récapitulatif</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Plan</span>
                <span className="font-semibold text-slate-800">{plan.label}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Durée</span>
                <span className="font-semibold text-slate-800">{durOpt.label}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Prix / mois</span>
                <span className="font-medium text-slate-700 da-amount">{formatDA(plan.price)}</span>
              </div>
              {durOpt.discount > 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Remise ({durOpt.discount}%)</span>
                  <span className="font-medium text-green-600 da-amount">- {formatDA(discount)}</span>
                </div>
              )}
              <div className="border-t border-slate-200 pt-3 flex justify-between">
                <span className="font-bold text-slate-900">Total TTC</span>
                <span className="font-bold text-lg text-yelha-700 da-amount">{formatDA(total)}</span>
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <div className="space-y-3">
              {[
                { icon: Shield,       text: 'Paiement sécurisé' },
                { icon: CheckCircle,  text: 'Sans engagement' },
                { icon: CheckCircle,  text: 'Support inclus' },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-3">
                  <Icon className="w-4 h-4 text-yelha-500 flex-shrink-0" />
                  <span className="text-sm text-slate-600">{text}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* ── Modal CCP ── */}
      <Dialog open={showCcpModal} onOpenChange={setShowCcpModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Virement CCP</DialogTitle>
            <DialogDescription>
              Effectuez un virement vers notre compte CCP en indiquant la référence ci-dessous.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-slate-500">Compte CCP</span><span className="font-bold text-slate-800">1234567890</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Clé</span><span className="font-bold text-slate-800">42</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Montant</span><span className="font-bold text-yelha-700 da-amount">{formatDA(total)}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Référence</span><span className="font-bold text-slate-800">{info.email || 'votre email'}</span></div>
          </div>
          <Button className="w-full mt-2" onClick={handleCcpConfirm} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            J&apos;ai effectué le virement
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function CheckoutPage() {
  return (
    <Suspense>
      <CheckoutContent />
    </Suspense>
  )
}
