import Link from 'next/link'
import { RefreshCw, CreditCard, BellRing, Zap, Mail, BarChart3, ShieldCheck, ArrowRight, Check } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* Nav */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#1D9E75] rounded-lg flex items-center justify-center">
              <RefreshCw className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg">YelhaSubs</span>
          </Link>
          <nav className="flex items-center gap-2 sm:gap-4">
            <Link href="/pricing" className="text-sm font-medium text-slate-600 hover:text-slate-900">Tarifs</Link>
            <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900">Connexion</Link>
            <Link
              href="/register"
              className="bg-[#1D9E75] hover:bg-[#178a64] text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
            >
              Essayer gratuitement
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="px-6 pt-20 pb-24 max-w-6xl mx-auto">
        <div className="text-center max-w-3xl mx-auto">
          <span className="inline-block bg-emerald-50 text-emerald-700 text-xs font-semibold px-3 py-1 rounded-full mb-6 border border-emerald-200">
            🇩🇿 Conçu pour les entreprises algériennes
          </span>
          <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-tight">
            Gérez les abonnements de vos clients,<br />
            <span className="text-[#1D9E75]">sans tableur, sans stress.</span>
          </h1>
          <p className="text-lg text-slate-600 mt-6 max-w-2xl mx-auto">
            YelhaSubs centralise vos abonnements récurrents : facturation automatique,
            rappels par email et WhatsApp, paiements en ligne via Chargily Pay ou virement CCP.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-10">
            <Link
              href="/register"
              className="inline-flex items-center justify-center gap-2 bg-[#1D9E75] hover:bg-[#178a64] text-white font-semibold px-6 py-3 rounded-xl text-base transition-colors shadow-lg shadow-emerald-200"
            >
              Démarrer 30 jours gratuits <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center justify-center gap-2 bg-white border border-slate-200 hover:border-slate-300 text-slate-900 font-semibold px-6 py-3 rounded-xl text-base transition-colors"
            >
              Voir les tarifs
            </Link>
          </div>
          <p className="text-xs text-slate-500 mt-4">Sans carte bancaire · Annulation à tout moment</p>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 py-20 bg-slate-50 border-y border-slate-200">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-black">Tout ce qu&apos;il faut pour facturer en récurrent</h2>
            <p className="text-slate-600 mt-3 max-w-2xl mx-auto">Salles de sport, écoles privées, fournisseurs internet, abonnements de service — un seul outil.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <Feature icon={RefreshCw} title="Abonnements récurrents" desc="Hebdo, mensuel, trimestriel, annuel. Calcul automatique de la prochaine échéance." />
            <Feature icon={CreditCard} title="Paiements en ligne" desc="Chargily Pay (Edahabia / CIB) ou virement CCP avec référence unique. L'argent rentre sans vous courir après." />
            <Feature icon={BellRing} title="Rappels automatiques" desc="Email et WhatsApp J-3 et J-1 avant échéance, multilingue FR / EN / AR." />
            <Feature icon={Mail} title="Templates personnalisables" desc="Modifiez les emails de rappel, de bienvenue, de fin d'essai. Aperçu en direct." />
            <Feature icon={BarChart3} title="Tableau de bord clair" desc="MRR, churn, nouveaux clients, clients en retard. Tout d'un coup d'œil." />
            <Feature icon={ShieldCheck} title="API & Intégration" desc="Clés API pour intégrer YelhaSubs à votre site, Shopify, WooCommerce ou app mobile." />
          </div>
        </div>
      </section>

      {/* Pricing teaser */}
      <section className="px-6 py-20 max-w-4xl mx-auto">
        <div className="text-center">
          <h2 className="text-3xl sm:text-4xl font-black">Tarifs simples, transparents</h2>
          <p className="text-slate-600 mt-3">À partir de <strong>990 DA / mois</strong>. 30 jours d&apos;essai gratuit. Pas d&apos;engagement.</p>
        </div>
        <div className="mt-10 grid sm:grid-cols-3 gap-4">
          <PriceCard name="Starter" price="990" feats={['Jusqu\'à 50 abonnements', 'Emails de rappel', 'Paiements CCP', '1 utilisateur']} />
          <PriceCard name="Pro" price="2 490" popular feats={['Jusqu\'à 500 abonnements', 'Rappels WhatsApp', 'Chargily Pay', 'API publique', '3 utilisateurs']} />
          <PriceCard name="Agency" price="4 900" feats={['Abonnements illimités', 'White-label emails', 'Support prioritaire', 'Utilisateurs illimités']} />
        </div>
        <div className="text-center mt-8">
          <Link href="/pricing" className="text-[#1D9E75] font-semibold text-sm hover:underline">Voir tous les tarifs en détail →</Link>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-20 bg-[#0f172a] text-white">
        <div className="max-w-3xl mx-auto text-center">
          <Zap className="w-12 h-12 mx-auto text-emerald-400 mb-6" />
          <h2 className="text-3xl sm:text-4xl font-black">Prêt à automatiser vos abonnements ?</h2>
          <p className="text-slate-300 mt-3">30 jours pour tester sans risque. Pas de carte bancaire demandée.</p>
          <Link
            href="/register"
            className="inline-flex items-center justify-center gap-2 bg-[#1D9E75] hover:bg-[#178a64] text-white font-semibold px-6 py-3 rounded-xl text-base mt-8 transition-colors"
          >
            Créer mon compte <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-10 border-t border-slate-200 text-sm text-slate-500">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <p>© {new Date().getFullYear()} YelhaSubs. Algérie.</p>
          <div className="flex gap-5">
            <Link href="/conditions" className="hover:text-slate-900">Conditions</Link>
            <Link href="/confidentialite" className="hover:text-slate-900">Confidentialité</Link>
            <Link href="/mentions-legales" className="hover:text-slate-900">Mentions légales</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

function Feature({ icon: Icon, title, desc }: { icon: typeof RefreshCw; title: string; desc: string }) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200">
      <div className="w-10 h-10 rounded-xl bg-[#1D9E75]/10 flex items-center justify-center mb-3">
        <Icon className="w-5 h-5 text-[#1D9E75]" />
      </div>
      <h3 className="font-bold text-base mb-1">{title}</h3>
      <p className="text-sm text-slate-600">{desc}</p>
    </div>
  )
}

function PriceCard({ name, price, feats, popular }: { name: string; price: string; feats: string[]; popular?: boolean }) {
  return (
    <div className={`rounded-2xl p-5 border-2 ${popular ? 'border-[#1D9E75] bg-[#1D9E75]/5' : 'border-slate-200 bg-white'}`}>
      {popular && <span className="inline-block bg-[#1D9E75] text-white text-[10px] font-bold px-2 py-0.5 rounded-full mb-2">POPULAIRE</span>}
      <p className="font-bold">{name}</p>
      <p className="text-3xl font-black mt-2">{price} <span className="text-sm font-medium text-slate-500">DA/mois</span></p>
      <ul className="mt-4 space-y-1.5">
        {feats.map(f => (
          <li key={f} className="text-xs text-slate-700 flex gap-1.5 items-start">
            <Check className="w-3.5 h-3.5 text-[#1D9E75] mt-0.5 shrink-0" />{f}
          </li>
        ))}
      </ul>
    </div>
  )
}
