'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowRight, Check } from 'lucide-react'
import { PLANS as BASE } from '@/lib/pricing/config'

type PlanRow = { id: string; name: string; price: number; desc: string; limit: string; whiteLabel: boolean; popular?: boolean }

const DEFAULTS: PlanRow[] = [
  { id: 'starter', name: 'Starter', price: BASE.starter.price, desc: 'Pour démarrer',            limit: '20 abonnements actifs',   whiteLabel: false },
  { id: 'premium', name: 'Premium', price: BASE.premium.price, desc: 'Pour les petites équipes', limit: '50 abonnements actifs',   whiteLabel: false },
  { id: 'pro',     name: 'Pro',     price: BASE.pro.price,     desc: 'Pour les entreprises',     limit: '220 abonnements actifs',  whiteLabel: true, popular: true },
  { id: 'agency',  name: 'Agency',  price: BASE.agency.price,  desc: 'Pour les agences',         limit: 'Abonnements illimités',   whiteLabel: true },
]

function fDA(n: number) { return n.toLocaleString('fr-DZ') + ' DA' }

export function PricingSection() {
  const [annual, setAnnual] = useState(false)
  const [plans, setPlans] = useState(DEFAULTS)

  useEffect(() => {
    fetch('/api/billing/plans').then(r => r.json()).then(d => {
      if (!d.plans) return
      setPlans(DEFAULTS.map(p => ({ ...p, price: d.plans[p.id]?.price ?? p.price })))
    }).catch(() => {})
  }, [])

  return (
    <section id="tarifs" className="border-t border-white/[0.06]">
      <div className="max-w-5xl mx-auto px-6 py-24">
        <div className="text-center mb-12">
          <p className="text-xs font-semibold text-emerald-400 uppercase tracking-widest">Tarifs</p>
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight mt-3">Simple et transparent.</h2>
          <p className="text-white/50 mt-3 text-sm">15 jours d&apos;essai gratuit · Sans carte bancaire · Annulable à tout moment</p>

          <div className="inline-flex items-center gap-1 bg-white/[0.04] border border-white/[0.08] rounded-full p-1 mt-6">
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

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {plans.map(p => {
            const price = annual ? Math.round(p.price * 0.8) : p.price
            return (
              <div
                key={p.id}
                className={`relative rounded-2xl p-5 flex flex-col gap-4 border transition-all ${
                  p.popular
                    ? 'border-emerald-500/50 bg-emerald-500/[0.06]'
                    : 'border-white/[0.08] bg-white/[0.02] hover:border-white/[0.15]'
                }`}
              >
                {p.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-[10px] font-bold px-3 py-0.5 rounded-full">
                    POPULAIRE
                  </span>
                )}

                <div>
                  <h3 className="font-semibold">{p.name}</h3>
                  <p className="text-white/40 text-xs mt-0.5">{p.desc}</p>
                </div>

                <div>
                  <span className="text-2xl font-bold">{fDA(price)}</span>
                  <span className="text-white/40 text-xs ml-1">/mois</span>
                  {annual && <p className="text-emerald-400 text-[10px] mt-0.5">{fDA(price * 12)}/an</p>}
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

                <Link
                  href="/register"
                  className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium transition-colors ${
                    p.popular
                      ? 'bg-emerald-500 hover:bg-emerald-400 text-white'
                      : 'bg-white/[0.06] border border-white/[0.08] text-white hover:bg-white/[0.1]'
                  }`}
                >
                  Démarrer <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            )
          })}
        </div>

        <div className="text-center mt-8">
          <Link href="/pricing" className="text-sm text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1 justify-center">
            Voir le détail des plans <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </section>
  )
}
