'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  PLANS,
  APPS,
  ANNUAL_DISCOUNT,
  TRIAL_ELIGIBLE_APPS,
  isAppIncluded,
  calcMonthlyTotal,
} from '@/lib/pricing/config'
import type { PlanId, AppId } from '@/lib/pricing/config'

// ─── helpers ────────────────────────────────────────────────────────────────

function fDA(n: number): string {
  return n.toLocaleString('fr-DZ').replace(/ /g, ' ') + ' DA'
}

function limitLabel(v: number): string {
  if (v === -1 || v === 999) return 'Illimité'
  return v.toLocaleString('fr-DZ')
}

const PLAN_IDS = ['trial', 'starter', 'pro', 'business', 'enterprise'] as const

// ─── Navbar ─────────────────────────────────────────────────────────────────

function Navbar() {
  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
        <Link href="/" className="flex items-center gap-2 font-bold text-xl text-slate-800">
          <span>📊</span>
          <span>YelhaERP</span>
        </Link>
        <div className="flex items-center gap-6 text-sm font-medium">
          <Link href="/features" className="text-slate-600 hover:text-slate-900 transition-colors hidden sm:block">
            Fonctionnalités
          </Link>
          <Link href="/pricing" className="text-[#1D9E75] font-semibold hidden sm:block">
            Tarifs
          </Link>
          <Link href="/login" className="text-slate-600 hover:text-slate-900 transition-colors hidden sm:block">
            Connexion
          </Link>
          <Link
            href="/register"
            className="bg-[#1D9E75] hover:bg-[#178a64] text-white px-4 py-2 rounded-lg transition-colors whitespace-nowrap"
          >
            Essai gratuit →
          </Link>
        </div>
      </div>
    </nav>
  )
}

// ─── Annual toggle ───────────────────────────────────────────────────────────

function AnnualToggle({ annual, onChange }: { annual: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-center gap-3 flex-wrap">
      <span
        className={`text-sm font-medium cursor-pointer transition-colors ${!annual ? 'text-slate-900' : 'text-slate-400'}`}
        onClick={() => onChange(false)}
      >
        Mensuel
      </span>

      <button
        onClick={() => onChange(!annual)}
        className={`relative w-14 h-7 rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-[#1D9E75] focus:ring-offset-2 ${
          annual ? 'bg-[#1D9E75]' : 'bg-slate-300'
        }`}
        aria-label="Basculer facturation annuelle"
      >
        <span
          className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform duration-300 ${
            annual ? 'translate-x-7' : 'translate-x-0'
          }`}
        />
      </button>

      <span
        className={`text-sm font-medium cursor-pointer transition-colors ${annual ? 'text-slate-900' : 'text-slate-400'}`}
        onClick={() => onChange(true)}
      >
        Annuel
      </span>

      {annual && (
        <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-2.5 py-1 rounded-full animate-pulse">
          -20% économisé
        </span>
      )}
    </div>
  )
}

// ─── Plan card ───────────────────────────────────────────────────────────────

const PLAN_DESCRIPTIONS: Record<PlanId, string> = {
  trial: 'Découvrez YelhaERP sans engagement',
  starter: 'Auto-entrepreneur, artisan, commerçant',
  pro: 'PME, SARL, EURL',
  business: 'Entreprise complète',
  enterprise: 'Groupe, multi-filiales',
}

const PLAN_CTA: Record<PlanId, string> = {
  trial: "Démarrer l'essai",
  starter: 'Choisir Starter',
  pro: 'Choisir Pro',
  business: 'Choisir Business',
  enterprise: 'Contacter les ventes',
}

function planIncludedAppIds(planId: PlanId): AppId[] {
  const plan = PLANS[planId]
  if (!('includedApps' in plan)) return []
  if (plan.includedApps === 'ALL') return Object.keys(APPS) as AppId[]
  return [...(plan.includedApps as readonly AppId[])]
}

function PlanCard({
  planId,
  annual,
  selected,
  onSelect,
}: {
  planId: PlanId
  annual: boolean
  selected: boolean
  onSelect: () => void
}) {
  const plan = PLANS[planId]
  const isBusiness = planId === 'business'
  const isTrial = planId === 'trial'
  const isEnterprise = planId === 'enterprise'

  const monthlyPrice = plan.price
  const annualEquiv = Math.round(monthlyPrice * (1 - ANNUAL_DISCOUNT))
  const displayPrice = annual ? annualEquiv : monthlyPrice
  const annualSaving = (monthlyPrice - annualEquiv) * 12

  const includedApps = planIncludedAppIds(planId)

  return (
    <div
      onClick={onSelect}
      className={`relative flex flex-col rounded-xl bg-white transition-all duration-200 cursor-pointer select-none ${
        isBusiness
          ? 'border-2 border-[#1D9E75] shadow-lg shadow-emerald-100 ring-0'
          : 'border border-slate-200 hover:border-slate-300'
      } ${selected ? 'ring-2 ring-[#1D9E75] ring-offset-2' : ''}`}
    >
      {isBusiness && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#1D9E75] text-white text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap">
          ⭐ Le plus populaire
        </div>
      )}

      <div className="p-5 flex flex-col gap-3 flex-1">
        {/* Header */}
        <div>
          <h3 className="text-base font-bold text-slate-800">{plan.name}</h3>
          <p className="text-xs text-slate-500 mt-0.5">{PLAN_DESCRIPTIONS[planId]}</p>
        </div>

        {/* Price */}
        <div className="mt-1">
          {isTrial ? (
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-extrabold text-slate-900">Gratuit</span>
            </div>
          ) : isEnterprise ? (
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-extrabold text-slate-900">Sur devis</span>
            </div>
          ) : (
            <>
              {annual && (
                <div className="text-xs text-slate-400 line-through mb-0.5">
                  {fDA(monthlyPrice)}/mois
                </div>
              )}
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-extrabold text-slate-900">{fDA(displayPrice)}</span>
                <span className="text-sm text-slate-500">/mois</span>
              </div>
              {annual && annualSaving > 0 && (
                <div className="text-xs text-emerald-600 font-medium mt-0.5">
                  Économie&nbsp;: {fDA(annualSaving)}/an
                </div>
              )}
            </>
          )}
        </div>

        {/* Limits */}
        <ul className="space-y-1.5 text-xs text-slate-600">
          <li className="flex items-center gap-1.5">
            <span className="text-slate-400">👤</span>
            {plan.maxUsers === 999 ? 'Utilisateurs illimités' : `${plan.maxUsers} utilisateur${plan.maxUsers > 1 ? 's' : ''}`}
          </li>
          <li className="flex items-center gap-1.5">
            <span className="text-slate-400">✉️</span>
            {limitLabel(plan.limits.emails)} emails/mois
          </li>
          <li className="flex items-center gap-1.5">
            <span className="text-slate-400">🤖</span>
            {limitLabel(plan.limits.aiRequests)} req. IA/mois
          </li>
          {isTrial && (
            <li className="flex items-center gap-1.5">
              <span className="text-slate-400">⏱️</span>
              30 jours, 3 apps au choix
            </li>
          )}
        </ul>

        {/* Apps */}
        {includedApps.length > 0 && (
          <div className="border-t border-slate-100 pt-3 flex flex-col gap-1">
            {includedApps.slice(0, isEnterprise ? 4 : 6).map((appId) => (
              <div key={appId} className="flex items-center gap-1.5 text-xs text-slate-700">
                <span className="text-[#1D9E75] font-bold">✓</span>
                {APPS[appId].name}
              </div>
            ))}
            {isEnterprise && (
              <div className="text-xs text-[#1D9E75] font-medium">+ tous les modules</div>
            )}
            {!isEnterprise && includedApps.length > 6 && (
              <div className="text-xs text-slate-500">+ {includedApps.length - 6} autres modules</div>
            )}
          </div>
        )}

        {/* CTA */}
        <div className="mt-auto pt-3">
          <Link
            href={
              planId === 'trial'
                ? '/register'
                : planId === 'enterprise'
                ? 'mailto:cvkdev@outlook.fr'
                : `/register?plan=${planId}&cycle=${annual ? 'annual' : 'monthly'}`
            }
            onClick={(e) => e.stopPropagation()}
            className={`block text-center text-sm font-semibold py-2.5 px-4 rounded-lg transition-colors ${
              isBusiness
                ? 'bg-[#1D9E75] hover:bg-[#178a64] text-white'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
            }`}
          >
            {PLAN_CTA[planId]}
          </Link>
        </div>
      </div>
    </div>
  )
}

// ─── App card (à la carte) ───────────────────────────────────────────────────

function AppCard({
  appId,
  includedInPlan,
}: {
  appId: AppId
  includedInPlan: boolean
}) {
  const app = APPS[appId]
  return (
    <div className="relative bg-white border border-slate-200 rounded-xl p-4 hover:border-slate-300 transition-colors">
      {includedInPlan && (
        <span className="absolute top-3 right-3 bg-emerald-100 text-emerald-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
          Inclus ★
        </span>
      )}
      <div className="text-2xl mb-2">{app.icon}</div>
      <div className="font-semibold text-sm text-slate-800 mb-0.5">{app.name}</div>
      <div className="text-xs text-slate-500 mb-2">{app.description}</div>
      {app.price > 0 ? (
        <div className="text-sm font-bold text-slate-700">{fDA(app.price)}<span className="text-xs font-normal text-slate-400">/mois</span></div>
      ) : (
        <div className="text-sm font-bold text-[#1D9E75]">Inclus dans les plans</div>
      )}
    </div>
  )
}

// ─── Simulator ───────────────────────────────────────────────────────────────

function Simulator({
  selectedPlan,
  annual,
  selectedExtraApps,
  onPlanChange,
  onAnnualChange,
  onExtraAppToggle,
}: {
  selectedPlan: PlanId
  annual: boolean
  selectedExtraApps: AppId[]
  onPlanChange: (p: PlanId) => void
  onAnnualChange: (v: boolean) => void
  onExtraAppToggle: (appId: AppId) => void
}) {
  const total = calcMonthlyTotal(selectedPlan, selectedExtraApps, annual)
  const nonIncludedApps = (Object.keys(APPS) as AppId[]).filter(
    (appId) => !isAppIncluded(selectedPlan, appId) && APPS[appId].price > 0
  )

  const checkoutParams = new URLSearchParams({
    plan: selectedPlan,
    cycle: annual ? 'annual' : 'monthly',
    ...(selectedExtraApps.length > 0 ? { apps: selectedExtraApps.join(',') } : {}),
  })

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 lg:p-8 shadow-sm">
      <h2 className="text-2xl font-bold text-slate-900 mb-1">Simulateur de prix</h2>
      <p className="text-slate-500 text-sm mb-6">Construisez votre formule sur mesure et voyez le total en temps réel.</p>

      {/* Plan selector */}
      <div className="mb-6">
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">1. Choisissez votre plan de base</div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {PLAN_IDS.map((pid) => (
            <button
              key={pid}
              onClick={() => onPlanChange(pid)}
              className={`py-2.5 px-3 rounded-lg border text-sm font-semibold transition-all ${
                selectedPlan === pid
                  ? 'bg-[#1D9E75] border-[#1D9E75] text-white shadow-sm'
                  : 'bg-white border-slate-200 text-slate-700 hover:border-[#1D9E75] hover:text-[#1D9E75]'
              }`}
            >
              {PLANS[pid].name}
            </button>
          ))}
        </div>
      </div>

      {/* Extra apps */}
      {nonIncludedApps.length > 0 && (
        <div className="mb-6">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
            2. Ajoutez des modules supplémentaires
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {nonIncludedApps.map((appId) => {
              const checked = selectedExtraApps.includes(appId)
              return (
                <label
                  key={appId}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                    checked
                      ? 'bg-emerald-50 border-[#1D9E75]'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => onExtraAppToggle(appId)}
                    className="w-4 h-4 accent-[#1D9E75] flex-shrink-0"
                  />
                  <span className="text-lg flex-shrink-0">{APPS[appId].icon}</span>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-800 truncate">{APPS[appId].name}</div>
                    <div className="text-xs text-slate-500">+{fDA(APPS[appId].price)}/mois</div>
                  </div>
                </label>
              )
            })}
          </div>
        </div>
      )}

      {/* Annual toggle */}
      <div className="mb-6 flex items-center gap-3">
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">3. Cycle de facturation</div>
        <AnnualToggle annual={annual} onChange={onAnnualChange} />
      </div>

      {/* Total */}
      <div className="bg-slate-50 rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs text-slate-500 font-medium uppercase tracking-wide mb-1">Votre total estimé</div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-4xl font-extrabold text-slate-900 tabular-nums transition-all duration-300">
              {fDA(total)}
            </span>
            <span className="text-base text-slate-500 font-medium">/mois</span>
          </div>
          {annual && PLANS[selectedPlan].price > 0 && (
            <div className="text-xs text-emerald-600 font-medium mt-1">
              Facturé {fDA(total * 12)}/an — 20% économisé
            </div>
          )}
          {PLANS[selectedPlan].price === 0 && (
            <div className="text-xs text-[#1D9E75] font-medium mt-1">30 jours gratuits, sans carte</div>
          )}
        </div>
        <Link
          href={`/subscriptions/checkout?${checkoutParams.toString()}`}
          className="bg-[#1D9E75] hover:bg-[#178a64] text-white font-semibold px-6 py-3 rounded-xl transition-colors whitespace-nowrap text-sm shadow"
        >
          Démarrer →
        </Link>
      </div>
    </div>
  )
}

// ─── Comparison table ────────────────────────────────────────────────────────

function ComparisonTable({ annual }: { annual: boolean }) {
  const rows = [
    {
      label: 'Prix mensuel',
      values: PLAN_IDS.map((pid) => {
        const p = PLANS[pid]
        if (p.price === 0) return 'Gratuit'
        const price = annual ? Math.round(p.price * (1 - ANNUAL_DISCOUNT)) : p.price
        return fDA(price) + '/mois'
      }),
    },
    {
      label: 'Utilisateurs',
      values: PLAN_IDS.map((pid) => limitLabel(PLANS[pid].maxUsers)),
    },
    {
      label: 'Emails / mois',
      values: PLAN_IDS.map((pid) => limitLabel(PLANS[pid].limits.emails)),
    },
    {
      label: 'Requêtes API / mois',
      values: PLAN_IDS.map((pid) => limitLabel(PLANS[pid].limits.apiRequests)),
    },
    {
      label: 'Requêtes IA / mois',
      values: PLAN_IDS.map((pid) => limitLabel(PLANS[pid].limits.aiRequests)),
    },
    {
      label: 'Livreurs',
      values: PLAN_IDS.map((pid) => limitLabel(PLANS[pid].limits.deliverers)),
    },
    {
      label: 'Références SKU',
      values: PLAN_IDS.map((pid) => limitLabel(PLANS[pid].limits.skus)),
    },
    {
      label: 'Modules inclus',
      values: PLAN_IDS.map((pid) => {
        const plan = PLANS[pid]
        if ('freeApps' in plan && !('includedApps' in plan)) return '3 au choix'
        if ('includedApps' in plan && plan.includedApps === 'ALL') return 'Tous'
        if ('includedApps' in plan) return `${(plan.includedApps as readonly string[]).length}`
        return '—'
      }),
    },
  ]

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100">
            <th className="text-left px-5 py-4 text-slate-500 font-semibold text-xs uppercase tracking-wide w-44">
              Fonctionnalité
            </th>
            {PLAN_IDS.map((pid) => (
              <th
                key={pid}
                className={`px-4 py-4 font-bold text-center ${
                  pid === 'business' ? 'text-[#1D9E75]' : 'text-slate-800'
                }`}
              >
                {PLANS[pid].name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.label} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
              <td className="px-5 py-3 text-slate-600 font-medium">{row.label}</td>
              {row.values.map((val, j) => (
                <td
                  key={j}
                  className={`px-4 py-3 text-center font-medium ${
                    PLAN_IDS[j] === 'business' ? 'text-[#1D9E75]' : 'text-slate-700'
                  }`}
                >
                  {val}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── FAQ ─────────────────────────────────────────────────────────────────────

const FAQ_ITEMS = [
  {
    q: 'Comment fonctionne la facturation ?',
    a: 'Vous êtes facturé au début de chaque mois (ou de chaque année si vous optez pour la facturation annuelle). Nous acceptons le virement bancaire CCP, ainsi que Chargily Pay (carte Edahabia / CIB).',
  },
  {
    q: 'Puis-je payer par CCP ?',
    a: 'Oui. Après la souscription, vous recevrez un RIB CCP. Le compte est activé dans les 24–48 h après réception du virement.',
  },
  {
    q: "Que se passe-t-il à la fin de l'essai gratuit ?",
    a: "Votre compte et vos données sont conservés. Vous choisissez simplement un plan payant pour continuer. Sans choix, l'accès est suspendu mais les données restent 30 jours.",
  },
  {
    q: 'Puis-je changer de plan en cours de mois ?',
    a: 'Oui, à tout moment. En cas de montée de plan, vous payez le prorata du reste du mois. En cas de descente, le crédit est appliqué au mois suivant.',
  },
  {
    q: 'Comment annuler mon abonnement ?',
    a: "Depuis Paramètres → Abonnement → Résilier. L'annulation prend effet à la fin de la période en cours. Aucune pénalité ni frais de résiliation.",
  },
  {
    q: 'Mes données sont-elles en sécurité ?',
    a: "Vos données sont hébergées sur Supabase (région EU), chiffrées en transit (TLS) et au repos (AES-256). Chaque entreprise dispose d'un espace isolé (multi-tenant strict). Export possible à tout moment au format JSON/CSV.",
  },
]

function FAQ() {
  const [open, setOpen] = useState<number | null>(null)

  return (
    <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
      {FAQ_ITEMS.map((item, i) => (
        <div key={i}>
          <button
            onClick={() => setOpen(open === i ? null : i)}
            className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left hover:bg-slate-50 transition-colors"
          >
            <span className="font-semibold text-slate-800 text-sm sm:text-base">{item.q}</span>
            <span
              className={`text-[#1D9E75] text-xl font-bold transition-transform duration-200 flex-shrink-0 ${
                open === i ? 'rotate-45' : 'rotate-0'
              }`}
            >
              +
            </span>
          </button>
          {open === i && (
            <div className="px-6 pb-5 text-slate-600 text-sm leading-relaxed">
              {item.a}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function PricingPage() {
  const [annual, setAnnual] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<PlanId>('business')
  const [selectedExtraApps, setSelectedExtraApps] = useState<AppId[]>([])

  function toggleExtraApp(appId: AppId) {
    setSelectedExtraApps((prev) =>
      prev.includes(appId) ? prev.filter((a) => a !== appId) : [...prev, appId]
    )
  }

  function handlePlanChange(pid: PlanId) {
    setSelectedPlan(pid)
    // Remove extra apps that are now included in the new plan
    setSelectedExtraApps((prev) => prev.filter((appId) => !isAppIncluded(pid, appId)))
  }

  // Non-core apps to display à la carte
  const extraApps = (Object.keys(APPS) as AppId[]).filter((id) => !APPS[id].core)

  return (
    <div className="min-h-screen bg-slate-50 font-[Inter,system-ui,sans-serif]">
      <Navbar />

      {/* ── Hero ── */}
      <section className="bg-white border-b border-slate-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
            <span>✨</span> ERP SaaS algérien
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 leading-tight mb-4">
            Payez uniquement les apps<br />
            <span className="text-[#1D9E75]">dont vous avez besoin</span>
          </h1>
          <p className="text-lg text-slate-500 mb-8 max-w-2xl mx-auto">
            Aucune surprise, aucun coût caché. Choisissez votre plan, ajoutez les modules
            qui correspondent à votre activité, et gérez toute votre entreprise depuis un seul endroit.
          </p>
          <AnnualToggle annual={annual} onChange={setAnnual} />
        </div>
      </section>

      {/* ── Trial banner ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        <div
          className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl border px-6 py-5"
          style={{ backgroundColor: '#E1F5EE', borderColor: '#1D9E75' }}
        >
          <div className="flex items-start sm:items-center gap-3">
            <span className="text-2xl flex-shrink-0">🎁</span>
            <div>
              <span className="font-bold text-slate-800">Essai gratuit 30 jours</span>
              <span className="text-slate-600 ml-2 text-sm">
                — Choisissez 3 apps parmi nos 12 modules, sans carte bancaire
              </span>
            </div>
          </div>
          <Link
            href="/register"
            className="bg-[#1D9E75] hover:bg-[#178a64] text-white font-semibold px-5 py-2.5 rounded-xl transition-colors whitespace-nowrap text-sm flex-shrink-0"
          >
            Commencer gratuitement →
          </Link>
        </div>
      </section>

      {/* ── Plans grid ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-start">
          {PLAN_IDS.map((pid) => (
            <PlanCard
              key={pid}
              planId={pid}
              annual={annual}
              selected={selectedPlan === pid}
              onSelect={() => handlePlanChange(pid)}
            />
          ))}
        </div>
        <p className="text-center text-xs text-slate-400 mt-4">
          Cliquez sur un plan pour le sélectionner dans le simulateur ci-dessous.
        </p>
      </section>

      {/* ── Apps à la carte ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-16">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-extrabold text-slate-900 mb-2">Enrichissez votre plan</h2>
          <p className="text-slate-500 max-w-xl mx-auto text-sm">
            Chaque module peut être ajouté à la carte. Ils sont déjà inclus dans les plans supérieurs.
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {extraApps.map((appId) => (
            <AppCard
              key={appId}
              appId={appId}
              includedInPlan={isAppIncluded(selectedPlan, appId)}
            />
          ))}
        </div>
      </section>

      {/* ── Simulator ── */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mt-16" id="simulator">
        <Simulator
          selectedPlan={selectedPlan}
          annual={annual}
          selectedExtraApps={selectedExtraApps}
          onPlanChange={handlePlanChange}
          onAnnualChange={setAnnual}
          onExtraAppToggle={toggleExtraApp}
        />
      </section>

      {/* ── Comparison table ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-16">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-extrabold text-slate-900 mb-2">Comparaison des plans</h2>
          <p className="text-slate-500 text-sm">Toutes les limites en un coup d'œil.</p>
        </div>
        <ComparisonTable annual={annual} />
      </section>

      {/* ── FAQ ── */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 mt-16">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-extrabold text-slate-900 mb-2">Questions fréquentes</h2>
          <p className="text-slate-500 text-sm">Tout ce que vous devez savoir avant de vous lancer.</p>
        </div>
        <FAQ />
      </section>

      {/* ── Bottom CTA ── */}
      <section className="mt-20 py-16 bg-[#1D9E75]">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-extrabold text-white mb-3">Prêt à gérer votre entreprise autrement ?</h2>
          <p className="text-emerald-100 mb-8 text-base">
            30 jours gratuits, 3 modules au choix, aucune carte bancaire requise.
          </p>
          <Link
            href="/register"
            className="inline-block bg-white hover:bg-slate-50 text-[#1D9E75] font-bold px-8 py-4 rounded-xl transition-colors text-base shadow-lg"
          >
            Commencer gratuitement →
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-slate-900 text-slate-400 text-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-white font-bold text-base">
            <span>📊</span>
            <span>YelhaERP</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm">
            <Link href="/features" className="hover:text-white transition-colors">Fonctionnalités</Link>
            <Link href="/pricing" className="hover:text-white transition-colors">Tarifs</Link>
            <Link href="/register" className="hover:text-white transition-colors">Inscription</Link>
            <Link href="/login" className="hover:text-white transition-colors">Connexion</Link>
            <a href="mailto:cvkdev@outlook.fr" className="hover:text-white transition-colors">cvkdev@outlook.fr</a>
          </div>
          <div className="text-xs text-slate-600">© {new Date().getFullYear()} YelhaERP</div>
        </div>
      </footer>
    </div>
  )
}
