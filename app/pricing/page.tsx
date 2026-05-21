'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { ArrowRight, Check } from 'lucide-react'
import { PLANS as BASE } from '@/lib/pricing/config'

type PlanRow = { id: string; name: string; price: number; desc: string; limit: string; whiteLabel: boolean; popular?: boolean }

const DEFAULTS: PlanRow[] = [
  { id: 'starter', name: 'Starter',  price: BASE.starter.price,  desc: 'Pour démarrer',              limit: '20 abonnements actifs',   whiteLabel: false },
  { id: 'premium', name: 'Premium',  price: BASE.premium.price,  desc: 'Pour les petites équipes',   limit: '50 abonnements actifs',   whiteLabel: false },
  { id: 'pro',     name: 'Pro',      price: BASE.pro.price,      desc: 'Pour les entreprises',       limit: '220 abonnements actifs',  whiteLabel: true, popular: true },
  { id: 'agency',  name: 'Agency',   price: BASE.agency.price,   desc: 'Pour les agences',           limit: 'Abonnements illimités',   whiteLabel: true },
]

function fDA(n: number) { return n.toLocaleString('fr-DZ') + ' DA' }

export default function PricingPage() {
  const { data: session } = useSession()
  const [annual, setAnnual] = useState(false)
  const [plans, setPlans] = useState(DEFAULTS)

  useEffect(() => {
    fetch('/api/billing/plans').then(r => r.json()).then(d => {
      if (!d.plans) return
      setPlans(DEFAULTS.map(p => ({ ...p, price: d.plans[p.id]?.price ?? p.price })))
    }).catch(() => {})
  }, [])

  const ctaHref = session?.user ? '/dashboard/settings/billing' : '/register'
  const ctaLabel = session?.user ? 'Choisir ce plan' : "Démarrer l'essai gratuit"

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-white antialiased">

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#0a0a0b]/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center font-black text-[#0a0a0b] text-sm">Y</div>
            <span className="font-semibold tracking-tight">YelhaSubs</span>
          </Link>
          <nav className="flex items-center gap-3">
            <Link href="/" className="text-sm text-white/60 hover:text-white transition-colors">Accueil</Link>
            {session?.user
              ? <Link href="/dashboard/subscriptions" className="text-sm font-medium bg-white text-[#0a0a0b] hover:bg-white/90 px-4 py-1.5 rounded-lg">Tableau de bord</Link>
              : <Link href="/login" className="text-sm text-white/60 hover:text-white transition-colors">Connexion</Link>
            }
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-3xl mx-auto px-6 pt-20 pb-14 text-center">
        <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight">Choisissez votre plan</h1>
        <p className="text-white/50 mt-4 text-base">15 jours d&apos;essai gratuit. Sans carte bancaire. Annulable à tout moment.</p>

        <div className="inline-flex items-center gap-1 bg-white/[0.04] border border-white/[0.08] rounded-full p-1 mt-8">
          <button
            onClick={() => setAnnual(false)}
            className={`px-5 py-1.5 text-sm font-medium rounded-full transition-all ${!annual ? 'bg-white text-[#0a0a0b] shadow' : 'text-white/50 hover:text-white'}`}
          >
            Mensuel
          </button>
          <button
            onClick={() => setAnnual(true)}
            className={`px-5 py-1.5 text-sm font-medium rounded-full transition-all flex items-center gap-1.5 ${annual ? 'bg-white text-[#0a0a0b] shadow' : 'text-white/50 hover:text-white'}`}
          >
            Annuel <span className={`text-xs font-semibold ${annual ? 'text-emerald-600' : 'text-emerald-400'}`}>−20%</span>
          </button>
        </div>
      </section>

      {/* Cards */}
      <section className="max-w-5xl mx-auto px-6 pb-24">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {plans.map(p => {
            const price = annual ? Math.round(p.price * 0.8) : p.price
            return (
              <div
                key={p.id}
                className={`relative rounded-2xl p-6 flex flex-col gap-5 border transition-all ${
                  p.popular
                    ? 'border-emerald-500/50 bg-emerald-500/[0.06] shadow-[0_0_40px_-10px_rgba(16,185,129,0.2)]'
                    : 'border-white/[0.08] bg-white/[0.02] hover:border-white/[0.15] hover:bg-white/[0.04]'
                }`}
              >
                {p.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-[10px] font-bold px-3 py-0.5 rounded-full tracking-wide">
                    POPULAIRE
                  </span>
                )}

                <div>
                  <h3 className="font-semibold text-lg">{p.name}</h3>
                  <p className="text-white/40 text-xs mt-0.5">{p.desc}</p>
                </div>

                <div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold tracking-tight">{fDA(price)}</span>
                  </div>
                  <p className="text-white/40 text-xs mt-0.5">/mois {annual && <span className="text-emerald-400">· {fDA(price * 12)}/an</span>}</p>
                </div>

                <ul className="flex-1 space-y-2.5">
                  <li className="flex items-start gap-2 text-sm text-white/70">
                    <Check className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                    {p.limit}
                  </li>
                  {p.whiteLabel && (
                    <li className="flex items-start gap-2 text-sm text-white/70">
                      <Check className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                      Emails à votre nom
                    </li>
                  )}
                </ul>

                <Link
                  href={ctaHref}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    p.popular
                      ? 'bg-emerald-500 hover:bg-emerald-400 text-white'
                      : 'bg-white/[0.06] border border-white/[0.1] text-white hover:bg-white/[0.1]'
                  }`}
                >
                  {ctaLabel} <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            )
          })}
        </div>

        <p className="text-center text-xs text-white/30 mt-10">
          Tous les plans incluent 15 jours d&apos;essai gratuit · Sans carte bancaire · TVA 19% non incluse
        </p>
      </section>
    </div>
  )
}
