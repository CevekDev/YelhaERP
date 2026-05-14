'use client'

import { useState, useEffect, useCallback } from 'react'
import { Header } from '@/components/layout/header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import {
  RefreshCw, CheckCircle2, Clock, XCircle, Loader2,
  Zap, Users, Brain, Infinity, ChevronRight, Copy,
} from 'lucide-react'
import { toast } from 'sonner'

// ─── Types ────────────────────────────────────────────────────────────────────

type AppPlan = {
  id: string
  name: string
  price: number
  durationDays: number | null
  maxSubscriptions: number
  aiRequestsPerMonth: number
  aiRequestsPerDay: number
  description: string
  features: string[]
}

type AppSubscription = {
  id: string
  planId: string
  status: string
  effectiveStatus: string
  trialEndsAt: string | null
  currentPeriodEnd: string
  monthlyAmount: number
  plan: AppPlan | null
}

type CheckoutResult =
  | { type: 'trial'; subscription: AppSubscription }
  | { type: 'ccp'; ccpRef: string; amount: number; planId: string; paymentId: string }

// ─── Configuration apps ───────────────────────────────────────────────────────

const APPS_DISPLAY = [
  {
    id: 'subscriptions',
    name: 'Abonnements clients',
    icon: RefreshCw,
    color: 'bg-indigo-100 text-indigo-600',
    iconBg: 'bg-indigo-500',
    description: 'Gérez les abonnements récurrents de vos clients. Paiement Chargily Pay ou virement CCP.',
    hasIndependentPlans: true,
  },
  {
    id: 'crm',
    name: 'CRM Pipeline',
    icon: Users,
    color: 'bg-rose-100 text-rose-600',
    iconBg: 'bg-rose-400',
    description: 'Pipeline commercial, leads, opportunités, statistiques de vente.',
    hasIndependentPlans: false,
  },
  {
    id: 'hr',
    name: 'Ressources Humaines',
    icon: Users,
    color: 'bg-pink-100 text-pink-600',
    iconBg: 'bg-pink-400',
    description: 'Gestion des employés, congés, recrutement, évaluations.',
    hasIndependentPlans: false,
  },
  {
    id: 'accounting',
    name: 'Comptabilité PCN',
    icon: Zap,
    color: 'bg-violet-100 text-violet-600',
    iconBg: 'bg-violet-400',
    description: 'Journal PCN algérien, bilan, grand livre, TVA.',
    hasIndependentPlans: false,
  },
  {
    id: 'payroll',
    name: 'Paie IRG/CNAS',
    icon: Zap,
    color: 'bg-amber-100 text-amber-600',
    iconBg: 'bg-amber-400',
    description: 'Bulletins de paie conformes à la législation algérienne.',
    hasIndependentPlans: false,
  },
]

// ─── Sous-composants ──────────────────────────────────────────────────────────

function PlanCard({
  plan,
  current,
  onSelect,
}: {
  plan: AppPlan
  current: boolean
  onSelect: (plan: AppPlan) => void
}) {
  const isFree = plan.price === 0
  const isPopular = plan.id === 'pro'

  return (
    <div
      className={`relative flex flex-col rounded-2xl border p-5 transition-all cursor-pointer hover:shadow-md ${
        current
          ? 'border-indigo-500 bg-indigo-50/60 ring-2 ring-indigo-500/30'
          : isPopular
          ? 'border-indigo-200 bg-white shadow-sm'
          : 'border-slate-200 bg-white hover:border-indigo-200'
      }`}
      onClick={() => onSelect(plan)}
    >
      {isPopular && !current && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-indigo-600 px-3 py-0.5 text-[11px] font-semibold text-white shadow">
          Populaire
        </span>
      )}
      {current && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-emerald-500 px-3 py-0.5 text-[11px] font-semibold text-white shadow">
          Actuel
        </span>
      )}

      <div className="mb-4">
        <p className="font-bold text-slate-900 text-base">{plan.name}</p>
        <p className="text-xs text-slate-500 mt-0.5">{plan.description}</p>
      </div>

      <div className="mb-4">
        {isFree ? (
          <p className="text-2xl font-black text-slate-900">Gratuit</p>
        ) : (
          <p className="text-2xl font-black text-slate-900">
            {plan.price.toLocaleString('fr-DZ')} <span className="text-sm font-medium text-slate-500">DA/mois</span>
          </p>
        )}
        {plan.durationDays && (
          <p className="text-xs text-indigo-600 font-medium mt-0.5">{plan.durationDays} jours d'essai</p>
        )}
      </div>

      <ul className="space-y-1.5 flex-1 mb-5">
        {plan.features.map(f => (
          <li key={f} className="flex items-start gap-2 text-xs text-slate-700">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
            {f}
          </li>
        ))}
      </ul>

      <Button
        size="sm"
        variant={current ? 'outline' : isPopular ? 'default' : 'outline'}
        className={`w-full rounded-xl text-xs ${isPopular && !current ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : ''}`}
        disabled={current}
      >
        {current ? 'Plan actuel' : isFree ? 'Démarrer l\'essai' : 'Choisir ce plan'}
      </Button>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string }> = {
    TRIAL: { label: 'Essai', color: 'bg-blue-100 text-blue-700' },
    ACTIVE: { label: 'Actif', color: 'bg-emerald-100 text-emerald-700' },
    EXPIRED: { label: 'Expiré', color: 'bg-red-100 text-red-700' },
    CANCELLED: { label: 'Annulé', color: 'bg-slate-100 text-slate-600' },
  }
  const s = map[status] ?? { label: status, color: 'bg-slate-100 text-slate-600' }
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${s.color}`}>
      {s.label}
    </span>
  )
}

// ─── Modale app plans ─────────────────────────────────────────────────────────

function AppPlansDialog({
  appId,
  open,
  onClose,
}: {
  appId: string
  open: boolean
  onClose: () => void
}) {
  const [plans, setPlans] = useState<AppPlan[]>([])
  const [sub, setSub] = useState<AppSubscription | null>(null)
  const [loading, setLoading] = useState(true)
  const [checkoutResult, setCheckoutResult] = useState<CheckoutResult | null>(null)
  const [processing, setProcessing] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [plansRes, subRes] = await Promise.all([
        fetch(`/api/app-billing/${appId}/plans`).then(r => r.json()),
        fetch(`/api/app-billing/${appId}/subscription`).then(r => r.json()),
      ])
      if (plansRes.data?.plans) setPlans(plansRes.data.plans)
      if (subRes.data?.subscription) setSub(subRes.data.subscription)
    } catch {
      toast.error('Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }, [appId])

  useEffect(() => {
    if (open) { load(); setCheckoutResult(null) }
  }, [open, load])

  async function selectPlan(plan: AppPlan) {
    if (sub?.effectiveStatus === 'ACTIVE' && sub.planId === plan.id) return
    setProcessing(plan.id)
    try {
      const method = plan.id === 'trial' ? 'TRIAL' : 'CCP'
      const res = await fetch(`/api/app-billing/${appId}/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: plan.id, method }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? 'Erreur'); return }
      setCheckoutResult(data)
      if (data.type === 'trial') {
        setSub(data.subscription)
        toast.success('Essai de 15 jours activé !')
      }
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setProcessing(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Abonnements clients — Plans</DialogTitle>
          <DialogDescription>
            Choisissez le plan adapté à votre activité
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-7 h-7 animate-spin text-indigo-500" />
          </div>
        ) : checkoutResult?.type === 'ccp' ? (
          <CcpInstructions result={checkoutResult} onBack={() => setCheckoutResult(null)} />
        ) : (
          <>
            {sub && (
              <div className="mb-4 flex items-center gap-3 rounded-xl bg-slate-50 border border-slate-100 p-3">
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    Plan actuel : {sub.plan?.name ?? sub.planId}
                  </p>
                  <p className="text-xs text-slate-500">
                    {sub.effectiveStatus === 'TRIAL' && sub.trialEndsAt
                      ? `Essai jusqu'au ${new Date(sub.trialEndsAt).toLocaleDateString('fr-DZ')}`
                      : `Renouvel. le ${new Date(sub.currentPeriodEnd).toLocaleDateString('fr-DZ')}`}
                  </p>
                </div>
                <div className="ml-auto">
                  <StatusBadge status={sub.effectiveStatus} />
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
              {plans.map(plan => (
                <div key={plan.id} className="relative">
                  {processing === plan.id && (
                    <div className="absolute inset-0 z-10 rounded-2xl bg-white/80 flex items-center justify-center">
                      <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
                    </div>
                  )}
                  <PlanCard
                    plan={plan}
                    current={sub?.planId === plan.id && sub?.effectiveStatus === 'ACTIVE'}
                    onSelect={selectPlan}
                  />
                </div>
              ))}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

function CcpInstructions({ result, onBack }: { result: Extract<CheckoutResult, { type: 'ccp' }>; onBack: () => void }) {
  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-indigo-50 border border-indigo-100 p-5">
        <p className="font-bold text-indigo-900 text-base mb-1">Virement CCP requis</p>
        <p className="text-sm text-indigo-700">
          Effectuez un virement du montant indiqué et envoyez la référence à notre équipe.
          Votre abonnement sera activé sous 24h ouvrables.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 p-4 space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-slate-500">Montant</span>
          <span className="font-bold text-slate-900 text-base">{result.amount.toLocaleString('fr-DZ')} DA</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-slate-500">Référence</span>
          <div className="flex items-center gap-2">
            <code className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded text-sm">
              {result.ccpRef}
            </code>
            <button
              onClick={() => { navigator.clipboard.writeText(result.ccpRef); toast.success('Référence copiée') }}
              className="text-slate-400 hover:text-slate-700"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-slate-500">CCP Yelha</span>
          <span className="font-semibold text-slate-800">00 123 456 789 / 00</span>
        </div>
      </div>

      <div className="rounded-xl bg-amber-50 border border-amber-100 p-3 flex gap-2">
        <Clock className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
        <p className="text-xs text-amber-800">
          Conservez votre reçu de virement et mentionnez la référence <strong>{result.ccpRef}</strong> dans le commentaire du virement.
        </p>
      </div>

      <Button variant="outline" className="w-full" onClick={onBack}>
        ← Retour aux plans
      </Button>
    </div>
  )
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function ApplicationsPage() {
  const [selectedApp, setSelectedApp] = useState<string | null>(null)
  const [subs, setSubs] = useState<Record<string, AppSubscription>>({})

  useEffect(() => {
    APPS_DISPLAY.filter(a => a.hasIndependentPlans).forEach(app => {
      fetch(`/api/app-billing/${app.id}/subscription`)
        .then(r => r.json())
        .then(d => {
          if (d.data?.subscription) {
            setSubs(prev => ({ ...prev, [app.id]: d.data.subscription }))
          }
        })
        .catch(() => {})
    })
  }, [])

  return (
    <div>
      <Header title="Applications" />
      <div className="p-4 md:p-6 max-w-4xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Applications</h1>
          <p className="text-slate-500 text-sm mt-1">
            Gérez vos applications et abonnements indépendants.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {APPS_DISPLAY.map(app => {
            const Icon = app.icon
            const sub = subs[app.id]
            const status = sub?.effectiveStatus ?? null
            const isAvailable = app.hasIndependentPlans

            return (
              <div
                key={app.id}
                className={`group flex items-start gap-4 rounded-2xl border bg-white p-4 transition-all ${
                  isAvailable
                    ? 'cursor-pointer hover:border-indigo-200 hover:shadow-sm border-slate-200'
                    : 'border-slate-100 opacity-60 cursor-not-allowed'
                }`}
                onClick={() => isAvailable && setSelectedApp(app.id)}
              >
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${app.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-sm text-slate-900">{app.name}</p>
                      <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{app.description}</p>
                    </div>
                    {isAvailable ? (
                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-500 mt-0.5 shrink-0 transition-colors" />
                    ) : (
                      <Badge variant="secondary" className="text-[10px] shrink-0">Bientôt</Badge>
                    )}
                  </div>
                  {status && (
                    <div className="mt-2">
                      <StatusBadge status={status} />
                      {status === 'TRIAL' && sub?.trialEndsAt && (
                        <span className="text-[11px] text-slate-400 ml-2">
                          expire le {new Date(sub.trialEndsAt).toLocaleDateString('fr-DZ')}
                        </span>
                      )}
                      {status === 'ACTIVE' && sub?.plan && (
                        <span className="text-[11px] text-slate-400 ml-2">
                          Plan {sub.plan.name}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4">
          <div className="flex items-start gap-3">
            <Brain className="w-5 h-5 text-indigo-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-slate-800">Plus d'applications bientôt</p>
              <p className="text-xs text-slate-500 mt-1">
                CRM, RH, Comptabilité, Paie — chaque application aura son propre abonnement indépendant.
                Payez uniquement ce dont vous avez besoin.
              </p>
            </div>
          </div>
        </div>
      </div>

      {selectedApp && (
        <AppPlansDialog
          appId={selectedApp}
          open={!!selectedApp}
          onClose={() => setSelectedApp(null)}
        />
      )}
    </div>
  )
}
