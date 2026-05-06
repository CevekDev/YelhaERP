'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { PLANS, APPS, type PlanId, type AppId, isAppIncluded } from '@/lib/pricing/config'

// ── CSS-only confetti ────────────────────────────────────────────────────────

const CONFETTI_COLORS = [
  '#1D9E75', '#F59E0B', '#3B82F6', '#EF4444', '#8B5CF6',
  '#EC4899', '#10B981', '#F97316', '#06B6D4', '#84CC16',
]

function Confetti() {
  const pieces = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    left: `${(i * 5) + Math.sin(i) * 3}%`,
    delay: `${(i * 0.15).toFixed(2)}s`,
    duration: `${2.5 + (i % 5) * 0.3}s`,
    size: i % 3 === 0 ? 10 : i % 3 === 1 ? 8 : 6,
    rotate: i % 2 === 0 ? '45deg' : '0deg',
  }))

  return (
    <>
      <style>{`
        @keyframes confetti-fall {
          0%   { transform: translateY(-60px) rotate(0deg); opacity: 1; }
          80%  { opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
        .confetti-piece {
          position: fixed;
          top: 0;
          animation: confetti-fall linear infinite;
          pointer-events: none;
          z-index: 0;
          border-radius: 2px;
        }
      `}</style>
      {pieces.map(p => (
        <div
          key={p.id}
          className="confetti-piece"
          style={{
            left: p.left,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            animationDelay: p.delay,
            animationDuration: p.duration,
            transform: `rotate(${p.rotate})`,
          }}
        />
      ))}
    </>
  )
}

// ── Success content ──────────────────────────────────────────────────────────

function SuccessContent() {
  const params = useSearchParams()
  const method = params.get('method') ?? 'CHARGILY'
  const planParam = (params.get('plan') ?? 'pro') as PlanId
  const appsParam = params.get('apps') ?? ''
  const isCCP = method === 'ccp' || method === 'CCP'

  const planId: PlanId = planParam in PLANS ? planParam : 'pro'
  const plan = PLANS[planId]

  // Determine active apps
  const extraApps: AppId[] = appsParam
    ? (appsParam.split(',').filter(a => a in APPS) as AppId[])
    : []

  const includedApps: AppId[] = 'includedApps' in plan
    ? (plan.includedApps === 'ALL'
      ? (Object.keys(APPS) as AppId[])
      : [...(plan.includedApps as readonly AppId[])])
    : []

  const activeApps = [
    ...includedApps,
    ...extraApps.filter(a => !isAppIncluded(planId, a)),
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50 flex items-center justify-center p-6 relative overflow-hidden">
      <Confetti />

      <div className="max-w-lg w-full bg-white rounded-2xl shadow-xl border border-slate-100 p-8 relative z-10">
        {/* Checkmark */}
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="#059669"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-10 h-10"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-slate-900 text-center mb-2">
          {isCCP ? 'Demande envoyée !' : 'Votre abonnement est actif !'}
        </h1>

        {isCCP && (
          <p className="text-center text-amber-700 text-sm font-medium mb-4">
            Demande envoyée — validation 24–48h ouvrables
          </p>
        )}

        {/* Plan badge */}
        <div className="flex justify-center mb-4">
          <span className="bg-emerald-100 text-emerald-700 text-sm font-semibold px-4 py-1.5 rounded-full">
            Plan {plan.name}
          </span>
        </div>

        {/* Active apps */}
        {activeApps.length > 0 && (
          <div className="bg-slate-50 rounded-xl p-4 mb-6">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
              Apps activées
            </p>
            <div className="flex flex-wrap gap-2">
              {activeApps.slice(0, 12).map(appId => (
                <span
                  key={appId}
                  className="inline-flex items-center gap-1 text-xs bg-white border border-slate-200 text-slate-600 rounded-full px-2.5 py-1"
                >
                  {APPS[appId as AppId]?.icon} {APPS[appId as AppId]?.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* CCP instructions summary */}
        {isCCP && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800 mb-6 space-y-1">
            <p className="font-semibold mb-2">Instructions de virement CCP</p>
            <p>Numéro CCP : <strong>00123456789 CCP Alger</strong></p>
            <p>Titulaire : <strong>Yelha Technologies</strong></p>
            <p>Envoyez votre reçu à{' '}
              <a href="mailto:cvkdev@outlook.fr" className="underline">cvkdev@outlook.fr</a>
            </p>
          </div>
        )}

        {/* CTA */}
        <Button asChild className="w-full h-11 text-base font-semibold bg-emerald-600 hover:bg-emerald-700">
          <Link href="/dashboard">
            Accéder à mon dashboard →
          </Link>
        </Button>
      </div>
    </div>
  )
}

export default function SubscriptionSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center text-slate-400">
        Chargement…
      </div>
    }>
      <SuccessContent />
    </Suspense>
  )
}
