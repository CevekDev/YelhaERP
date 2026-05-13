'use client'

import { useState } from 'react'
import Link from 'next/link'
import { APPS, ANNUAL_DISCOUNT } from '@/lib/pricing/config'
import type { AppId } from '@/lib/pricing/config'

// ─── helpers ────────────────────────────────────────────────────────────────

function fDA(n: number): string {
  return n.toLocaleString('fr-DZ').replace(/ /g, ' ') + ' DA'
}

// ─── Data ────────────────────────────────────────────────────────────────────

const CORE_APPS   = (Object.keys(APPS) as AppId[]).filter(id => APPS[id].core)
const PAID_APPS   = (Object.keys(APPS) as AppId[]).filter(id => !APPS[id].core)
const AVAIL_APPS  = PAID_APPS.filter(id => !APPS[id].comingSoon)
const COMING_APPS = PAID_APPS.filter(id => APPS[id].comingSoon)

// ─── Navbar ─────────────────────────────────────────────────────────────────

function Navbar() {
  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
        <Link href="/" className="flex items-center gap-2 font-bold text-xl text-slate-800">
          <span>📊</span><span>YelhaERP</span>
        </Link>
        <div className="flex items-center gap-6 text-sm font-medium">
          <Link href="/features" className="text-slate-600 hover:text-slate-900 transition-colors hidden sm:block">Fonctionnalités</Link>
          <Link href="/pricing" className="text-[#1D9E75] font-semibold hidden sm:block">Tarifs</Link>
          <Link href="/login" className="text-slate-600 hover:text-slate-900 transition-colors hidden sm:block">Connexion</Link>
          <Link href="/register" className="bg-[#1D9E75] hover:bg-[#178a64] text-white px-4 py-2 rounded-lg transition-colors whitespace-nowrap">
            Essai gratuit →
          </Link>
        </div>
      </div>
    </nav>
  )
}

// ─── Core app pill ───────────────────────────────────────────────────────────

function CorePill({ appId }: { appId: AppId }) {
  const app = APPS[appId]
  return (
    <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
      <span className="text-xl">{app.icon}</span>
      <div>
        <div className="text-sm font-semibold text-emerald-900">{app.name}</div>
        <div className="text-xs text-emerald-600">{app.description}</div>
      </div>
      <span className="ml-auto text-xs font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full whitespace-nowrap">Gratuit</span>
    </div>
  )
}

// ─── App subscription card ───────────────────────────────────────────────────

function AppSubCard({
  appId,
  annual,
  selected,
  onToggle,
}: {
  appId: AppId
  annual: boolean
  selected: boolean
  onToggle: () => void
}) {
  const app = APPS[appId]
  const comingSoon = app.comingSoon
  const monthlyPrice = app.price
  const displayPrice = annual ? Math.round(monthlyPrice * (1 - ANNUAL_DISCOUNT)) : monthlyPrice

  return (
    <div
      onClick={() => !comingSoon && onToggle()}
      className={`relative flex flex-col rounded-2xl border-2 p-5 transition-all ${
        comingSoon
          ? 'border-slate-100 bg-slate-50/50 cursor-not-allowed opacity-60'
          : selected
          ? 'border-[#1D9E75] bg-emerald-50/40 cursor-pointer shadow-md shadow-emerald-100'
          : 'border-slate-200 bg-white cursor-pointer hover:border-slate-300 hover:shadow-sm'
      }`}
    >
      {/* Coming soon badge */}
      {comingSoon && (
        <span className="absolute top-3 right-3 bg-amber-50 text-amber-600 border border-amber-200 text-[10px] font-bold px-2 py-0.5 rounded-full">
          ⏳ Bientôt
        </span>
      )}

      {/* Selected checkmark */}
      {!comingSoon && selected && (
        <span className="absolute top-3 right-3 w-5 h-5 rounded-full bg-[#1D9E75] flex items-center justify-center text-white text-xs font-bold">✓</span>
      )}

      {/* Icon + name */}
      <div className="flex items-start gap-3 mb-3">
        <span className="text-3xl">{app.icon}</span>
        <div>
          <div className="font-bold text-slate-900 text-base leading-tight">{app.name}</div>
          <div className="text-xs text-slate-500 mt-0.5 leading-snug">{app.description}</div>
        </div>
      </div>

      {/* Price */}
      <div className="mt-auto pt-3 border-t border-slate-100">
        {comingSoon ? (
          <div className="text-xs text-amber-500 font-medium">Disponible prochainement</div>
        ) : (
          <>
            {annual && (
              <div className="text-xs text-slate-400 line-through mb-0.5">{fDA(monthlyPrice)}/mois</div>
            )}
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-extrabold text-slate-900">{fDA(displayPrice)}</span>
              <span className="text-sm text-slate-500 font-medium">/mois</span>
            </div>
            {annual && (
              <div className="text-xs text-emerald-600 font-medium mt-0.5">
                Économie&nbsp;: {fDA((monthlyPrice - displayPrice) * 12)}/an
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ─── Annual toggle ───────────────────────────────────────────────────────────

function AnnualToggle({ annual, onChange }: { annual: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center gap-3">
      <span className={`text-sm font-medium cursor-pointer ${!annual ? 'text-slate-900' : 'text-slate-400'}`} onClick={() => onChange(false)}>Mensuel</span>
      <button
        onClick={() => onChange(!annual)}
        className={`relative w-12 h-6 rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-[#1D9E75] focus:ring-offset-2 ${annual ? 'bg-[#1D9E75]' : 'bg-slate-300'}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-300 ${annual ? 'translate-x-6' : 'translate-x-0'}`} />
      </button>
      <span className={`text-sm font-medium cursor-pointer ${annual ? 'text-slate-900' : 'text-slate-400'}`} onClick={() => onChange(true)}>Annuel</span>
      {annual && <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-2 py-0.5 rounded-full">−20%</span>}
    </div>
  )
}

// ─── Price calculator ────────────────────────────────────────────────────────

function Calculator({
  annual,
  selected,
  onAnnualChange,
  onToggle,
}: {
  annual: boolean
  selected: AppId[]
  onAnnualChange: (v: boolean) => void
  onToggle: (id: AppId) => void
}) {
  const subtotal = selected.reduce((s, id) => s + APPS[id].price, 0)
  const total = annual ? Math.round(subtotal * (1 - ANNUAL_DISCOUNT)) : subtotal
  const saving = annual ? (subtotal - total) * 12 : 0

  const checkoutParams = new URLSearchParams({
    plan: 'free',
    cycle: annual ? 'annual' : 'monthly',
    ...(selected.length > 0 ? { apps: selected.join(',') } : {}),
  })

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 lg:p-8 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Simulateur</h2>
          <p className="text-sm text-slate-500 mt-0.5">Sélectionnez vos modules, voyez votre total en temps réel.</p>
        </div>
        <AnnualToggle annual={annual} onChange={onAnnualChange} />
      </div>

      {/* Available apps checkboxes */}
      <div className="mb-6">
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Modules disponibles</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {AVAIL_APPS.map(id => {
            const checked = selected.includes(id)
            const price = annual ? Math.round(APPS[id].price * (1 - ANNUAL_DISCOUNT)) : APPS[id].price
            return (
              <label key={id} className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${checked ? 'bg-emerald-50 border-[#1D9E75]' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
                <input type="checkbox" checked={checked} onChange={() => onToggle(id)} className="w-4 h-4 accent-[#1D9E75] flex-shrink-0" />
                <span className="text-lg flex-shrink-0">{APPS[id].icon}</span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-slate-800 truncate">{APPS[id].name}</div>
                  <div className="text-xs text-slate-500">+{fDA(price)}/mois</div>
                </div>
              </label>
            )
          })}
        </div>
      </div>

      {/* Total */}
      <div className="bg-slate-50 rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs text-slate-500 font-medium uppercase tracking-wide mb-1">Core (Ventes + Achats + Stock)</div>
          <div className="text-sm font-bold text-emerald-600 mb-3">Gratuit pour toujours ✓</div>
          <div className="text-xs text-slate-500 font-medium uppercase tracking-wide mb-1">Modules additionnels</div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-4xl font-extrabold text-slate-900 tabular-nums">{fDA(total)}</span>
            <span className="text-base text-slate-500 font-medium">/mois</span>
          </div>
          {annual && saving > 0 && (
            <div className="text-xs text-emerald-600 font-medium mt-1">Économie annuelle : {fDA(saving)}</div>
          )}
          {selected.length === 0 && <div className="text-xs text-slate-400 mt-1">Sélectionnez des modules ci-dessus</div>}
        </div>
        <Link
          href={`/subscriptions/checkout?${checkoutParams.toString()}`}
          className="bg-[#1D9E75] hover:bg-[#178a64] text-white font-semibold px-6 py-3 rounded-xl transition-colors whitespace-nowrap text-sm shadow"
        >
          {selected.length === 0 ? 'Démarrer gratuitement →' : 'Souscrire →'}
        </Link>
      </div>
    </div>
  )
}

// ─── FAQ ─────────────────────────────────────────────────────────────────────

const FAQ_ITEMS = [
  {
    q: 'Les modules Ventes, Achats et Stock sont-ils vraiment gratuits ?',
    a: "Oui, pour toujours. Factures, devis, clients, bons de commande et gestion de stock sont inclus dans tout compte YelhaERP sans limite de durée ni de volume.",
  },
  {
    q: 'Comment fonctionne l\'abonnement par module ?',
    a: 'Chaque module additionnel (Abonnements clients, CRM, RH, etc.) est souscrit séparément. Vous payez uniquement les modules dont vous avez besoin, et vous pouvez en ajouter ou en retirer à tout moment.',
  },
  {
    q: 'Puis-je payer par CCP ?',
    a: 'Oui. Après la souscription, vous recevrez un RIB CCP. Le module est activé dans les 24–48 h après réception du virement.',
  },
  {
    q: 'Que veut dire « Bientôt disponible » ?',
    a: 'Ces modules sont en cours de développement. Vous pouvez les tester durant votre essai gratuit. Ils seront disponibles à l\'abonnement dès leur sortie.',
  },
  {
    q: 'Puis-je changer de modules en cours de mois ?',
    a: 'Oui, à tout moment. En cas d\'ajout, vous payez le prorata du reste du mois. En cas de retrait, le crédit est appliqué au mois suivant.',
  },
  {
    q: 'Mes données sont-elles en sécurité ?',
    a: "Vos données sont hébergées sur Supabase (région EU), chiffrées en transit (TLS) et au repos (AES-256). Chaque entreprise dispose d'un espace isolé. Export possible à tout moment au format JSON/CSV.",
  },
]

function FAQ() {
  const [open, setOpen] = useState<number | null>(null)
  return (
    <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
      {FAQ_ITEMS.map((item, i) => (
        <div key={i}>
          <button onClick={() => setOpen(open === i ? null : i)} className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left hover:bg-slate-50 transition-colors">
            <span className="font-semibold text-slate-800 text-sm sm:text-base">{item.q}</span>
            <span className={`text-[#1D9E75] text-xl font-bold transition-transform duration-200 flex-shrink-0 ${open === i ? 'rotate-45' : 'rotate-0'}`}>+</span>
          </button>
          {open === i && <div className="px-6 pb-5 text-slate-600 text-sm leading-relaxed">{item.a}</div>}
        </div>
      ))}
    </div>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function PricingPage() {
  const [annual, setAnnual] = useState(false)
  const [selected, setSelected] = useState<AppId[]>([])

  function toggle(id: AppId) {
    setSelected(prev => prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id])
  }

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
            Ventes, Achats &amp; Stock<br />
            <span className="text-[#1D9E75]">gratuits pour toujours</span>
          </h1>
          <p className="text-lg text-slate-500 mb-6 max-w-2xl mx-auto">
            Chaque module additionnel a son propre abonnement, à son propre prix.
            Vous ne payez que ce que vous utilisez.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/register" className="bg-[#1D9E75] hover:bg-[#178a64] text-white font-semibold px-6 py-3 rounded-xl transition-colors text-sm shadow">
              Commencer gratuitement →
            </Link>
            <a href="#modules" className="text-slate-500 hover:text-slate-900 text-sm font-medium transition-colors">
              Voir tous les modules ↓
            </a>
          </div>
        </div>
      </section>

      {/* ── Trial banner ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl border px-6 py-5" style={{ backgroundColor: '#E1F5EE', borderColor: '#1D9E75' }}>
          <div className="flex items-start sm:items-center gap-3">
            <span className="text-2xl flex-shrink-0">🎁</span>
            <div>
              <span className="font-bold text-slate-800">Essai gratuit 30 jours</span>
              <span className="text-slate-600 ml-2 text-sm">— Testez 3 modules additionnels, sans carte bancaire</span>
            </div>
          </div>
          <Link href="/register" className="bg-[#1D9E75] hover:bg-[#178a64] text-white font-semibold px-5 py-2.5 rounded-xl transition-colors whitespace-nowrap text-sm flex-shrink-0">
            Commencer gratuitement →
          </Link>
        </div>
      </section>

      {/* ── Core apps (gratuit) ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-14">
        <div className="mb-6">
          <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1.5 rounded-full mb-3">✓ Inclus dans tout compte — Gratuit</div>
          <h2 className="text-2xl font-extrabold text-slate-900">Core — toujours gratuit</h2>
          <p className="text-slate-500 text-sm mt-1">Ces modules sont disponibles immédiatement, sans limite de durée, pour tous les comptes.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {CORE_APPS.map(id => <CorePill key={id} appId={id} />)}
        </div>
      </section>

      {/* ── Paid apps ── */}
      <section id="modules" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-16">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-extrabold text-slate-900">Modules à la carte</h2>
            <p className="text-slate-500 text-sm mt-1">Chaque module est un abonnement indépendant. Cliquez pour les ajouter à votre simulateur.</p>
          </div>
          <AnnualToggle annual={annual} onChange={setAnnual} />
        </div>

        {/* Available now */}
        {AVAIL_APPS.length > 0 && (
          <div className="mb-10">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Disponible maintenant</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {AVAIL_APPS.map(id => (
                <AppSubCard key={id} appId={id} annual={annual} selected={selected.includes(id)} onToggle={() => toggle(id)} />
              ))}
            </div>
          </div>
        )}

        {/* Coming soon */}
        {COMING_APPS.length > 0 && (
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Bientôt disponibles</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {COMING_APPS.map(id => (
                <AppSubCard key={id} appId={id} annual={annual} selected={false} onToggle={() => {}} />
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ── Simulator ── */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mt-16" id="simulator">
        <Calculator annual={annual} selected={selected} onAnnualChange={setAnnual} onToggle={toggle} />
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
          <h2 className="text-3xl font-extrabold text-white mb-3">Commencez avec le Core gratuit</h2>
          <p className="text-emerald-100 mb-8 text-base">Ventes, Achats &amp; Stock sans limite de durée. Ajoutez des modules quand vous en avez besoin.</p>
          <Link href="/register" className="inline-block bg-white hover:bg-slate-50 text-[#1D9E75] font-bold px-8 py-4 rounded-xl transition-colors text-base shadow-lg">
            Créer mon compte gratuit →
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-slate-900 text-slate-400 text-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-white font-bold text-base"><span>📊</span><span>YelhaERP</span></div>
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
