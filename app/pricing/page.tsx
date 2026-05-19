'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { RefreshCw, Check, ArrowRight } from 'lucide-react'

interface Plan {
  id: string
  name: string
  price: number
  desc: string
  feats: string[]
  popular?: boolean
}

const PLANS: Plan[] = [
  {
    id: 'starter',
    name: 'Starter',
    price: 990,
    desc: 'Idéal pour démarrer',
    feats: [
      "Jusqu'à 50 abonnements actifs",
      'Emails de rappel automatiques',
      'Paiement CCP avec référence',
      'Multilingue FR/EN/AR',
      '1 utilisateur',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 2490,
    popular: true,
    desc: 'Pour les entreprises qui scalent',
    feats: [
      "Jusqu'à 500 abonnements actifs",
      'Rappels WhatsApp',
      'Chargily Pay (Edahabia/CIB)',
      'API publique',
      'Templates email custom',
      '3 utilisateurs',
    ],
  },
  {
    id: 'agency',
    name: 'Agency',
    price: 4900,
    desc: 'Pour les agences et grands volumes',
    feats: [
      'Abonnements illimités',
      'White-label des emails',
      'Webhooks sortants',
      'Support prioritaire WhatsApp',
      'Utilisateurs illimités',
      'Onboarding personnalisé',
    ],
  },
]

function fDA(n: number): string {
  return n.toLocaleString('fr-DZ') + ' DA'
}

export default function PricingPage() {
  const { data: session } = useSession()
  const [annual, setAnnual] = useState(false)
  const discount = 0.2

  const ctaHref = session?.user ? '/dashboard/settings/billing' : '/register'

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <header className="border-b border-slate-200 sticky top-0 bg-white/80 backdrop-blur-sm z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#1D9E75] rounded-lg flex items-center justify-center">
              <RefreshCw className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg">YelhaSubs</span>
          </Link>
          <nav className="flex items-center gap-4">
            <Link href="/" className="text-sm font-medium text-slate-600 hover:text-slate-900">Accueil</Link>
            {session?.user ? (
              <Link href="/dashboard/subscriptions" className="bg-[#1D9E75] hover:bg-[#178a64] text-white font-semibold px-4 py-2 rounded-lg text-sm">
                Tableau de bord
              </Link>
            ) : (
              <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900">Connexion</Link>
            )}
          </nav>
        </div>
      </header>

      <section className="px-6 pt-16 pb-12 text-center max-w-4xl mx-auto">
        <h1 className="text-4xl sm:text-5xl font-black tracking-tight">Choisissez votre plan</h1>
        <p className="text-slate-600 mt-4 text-lg">30 jours d&apos;essai gratuit. Sans engagement. Annulable à tout moment.</p>

        <div className="inline-flex items-center gap-2 bg-slate-100 rounded-full p-1 mt-8">
          <button
            onClick={() => setAnnual(false)}
            className={`px-4 py-1.5 text-sm font-semibold rounded-full transition-colors ${!annual ? 'bg-white shadow' : 'text-slate-600'}`}
          >
            Mensuel
          </button>
          <button
            onClick={() => setAnnual(true)}
            className={`px-4 py-1.5 text-sm font-semibold rounded-full transition-colors ${annual ? 'bg-white shadow' : 'text-slate-600'}`}
          >
            Annuel <span className="text-[#1D9E75] text-xs">-20%</span>
          </button>
        </div>
      </section>

      <section className="px-6 pb-20 max-w-6xl mx-auto">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {PLANS.map(p => {
            const price = annual ? Math.round(p.price * (1 - discount)) : p.price
            return (
              <div key={p.id} className={`rounded-2xl p-6 border-2 ${p.popular ? 'border-[#1D9E75] bg-[#1D9E75]/5 relative' : 'border-slate-200 bg-white'}`}>
                {p.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#1D9E75] text-white text-[10px] font-bold px-3 py-0.5 rounded-full">
                    POPULAIRE
                  </span>
                )}
                <h3 className="font-bold text-xl">{p.name}</h3>
                <p className="text-sm text-slate-500 mt-0.5">{p.desc}</p>
                <p className="text-4xl font-black mt-5">
                  {fDA(price)} <span className="text-sm font-medium text-slate-500">/mois</span>
                </p>
                {annual && <p className="text-xs text-[#1D9E75] mt-1">Facturé {fDA(price * 12)} / an</p>}
                <ul className="mt-6 space-y-2">
                  {p.feats.map(f => (
                    <li key={f} className="text-sm text-slate-700 flex gap-2 items-start">
                      <Check className="w-4 h-4 text-[#1D9E75] mt-0.5 shrink-0" />{f}
                    </li>
                  ))}
                </ul>
                <Link
                  href={ctaHref}
                  className={`mt-6 inline-flex items-center justify-center gap-2 w-full font-semibold py-2.5 rounded-xl text-sm transition-colors ${
                    p.popular ? 'bg-[#1D9E75] hover:bg-[#178a64] text-white' : 'bg-white border border-slate-200 hover:border-slate-300 text-slate-900'
                  }`}
                >
                  {session?.user ? 'Choisir ce plan' : 'Démarrer l\'essai gratuit'} <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            )
          })}
        </div>

        <div className="mt-12 text-center text-sm text-slate-500">
          <p>Tous les plans incluent : 30 jours d&apos;essai · Sans CB · Support email · TVA 19% non incluse</p>
        </div>
      </section>
    </div>
  )
}
