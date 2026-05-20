'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, CreditCard, CheckCircle, Clock, AlertTriangle, RefreshCw, Zap } from 'lucide-react'
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
  trial: 'Essai gratuit', starter: 'Starter', pro: 'Pro', enterprise: 'Enterprise',
}

const PLAN_PRICES: Record<string, number> = {
  trial: 0, starter: 990, pro: 1990, enterprise: 4990,
}

function daysLeft(iso: string) {
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000))
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-DZ', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function BillingPage() {
  const [sub, setSub] = useState<Sub | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/billing/subscription')
      .then(r => r.json())
      .then(d => {
        if (d.subscription) setSub(d.subscription)
        else setError("Impossible de charger l'abonnement.")
      })
      .catch(() => setError('Erreur réseau.'))
      .finally(() => setLoading(false))
  }, [])

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

  const isTrial = sub.status === 'TRIAL'
  const isActive = sub.status === 'ACTIVE'
  const isExpired = sub.status === 'EXPIRED' || sub.status === 'CANCELLED'
  const trialDays = sub.trialEndsAt ? daysLeft(sub.trialEndsAt) : 0
  const paidPayments = sub.payments.filter(p => p.status === 'PAID' || p.status === 'SUCCEEDED')

  return (
    <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">
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

      {/* Current plan */}
      <div className={`rounded-xl border p-5 space-y-4 ${
        isActive ? 'border-emerald-500/30 bg-emerald-500/[0.05]'
        : isTrial ? 'border-amber-500/30 bg-amber-500/[0.05]'
        : 'border-white/[0.07] bg-white/[0.02]'
      }`}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-1">Plan actuel</p>
            <p className="text-2xl font-bold text-white">{PLAN_LABELS[sub.planId] ?? sub.planId}</p>
            {sub.monthlyAmount > 0 && (
              <p className="text-sm text-white/50 mt-0.5">{formatDA(sub.monthlyAmount)} / mois</p>
            )}
          </div>

          {/* Status badge */}
          {isTrial && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-semibold">
              <Clock className="w-3.5 h-3.5" />
              Essai — {trialDays}j restant{trialDays !== 1 ? 's' : ''}
            </span>
          )}
          {isActive && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
              <CheckCircle className="w-3.5 h-3.5" />
              Actif
            </span>
          )}
          {isExpired && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-500/15 border border-red-500/30 text-red-400 text-xs font-semibold">
              <AlertTriangle className="w-3.5 h-3.5" />
              {STATUS_LABELS[sub.status]}
            </span>
          )}
        </div>

        {/* Period info */}
        <div className="flex flex-wrap gap-4 text-sm text-white/40">
          {isTrial && sub.trialEndsAt && (
            <span>Essai jusqu&apos;au <strong className="text-white/70">{fmtDate(sub.trialEndsAt)}</strong></span>
          )}
          {isActive && (
            <span>Prochain renouvellement : <strong className="text-white/70">{fmtDate(sub.currentPeriodEnd)}</strong></span>
          )}
        </div>

        {/* CTA */}
        {(isTrial || isExpired) && (
          <Link href="/pricing">
            <Button className="gap-2 bg-emerald-500 hover:bg-emerald-400 text-white w-full sm:w-auto">
              <Zap className="w-4 h-4" />
              {isExpired ? 'Renouveler l\'abonnement' : 'Passer à un plan payant'}
            </Button>
          </Link>
        )}
        {isActive && (
          <Link href="/pricing">
            <Button variant="outline" className="gap-2 border-white/[0.1] text-white/60 hover:text-white hover:bg-white/[0.06]">
              <RefreshCw className="w-4 h-4" />
              Changer de plan
            </Button>
          </Link>
        )}
      </div>

      {/* Plans disponibles (si trial ou expiré) */}
      {(isTrial || isExpired) && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-white/60">Plans disponibles</p>
          <div className="grid sm:grid-cols-3 gap-3">
            {(['starter', 'pro', 'enterprise'] as const).map(planId => (
              <div key={planId} className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4 space-y-2">
                <p className="font-semibold text-white text-sm">{PLAN_LABELS[planId]}</p>
                <p className="text-xl font-bold text-white">{formatDA(PLAN_PRICES[planId])}<span className="text-xs text-white/40 font-normal">/mois</span></p>
                <Link href="/pricing">
                  <Button size="sm" variant="outline" className="w-full mt-1 border-white/[0.1] text-white/60 hover:text-white hover:bg-white/[0.06] text-xs">
                    Choisir
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

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
