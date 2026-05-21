import Link from 'next/link'
import { ArrowRight, Check, Zap } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0b] text-white antialiased selection:bg-emerald-500/30">
      <Header />
      <Hero />
      <LogoStrip />
      <Showcase />
      <FeatureGrid />
      <UseCases />
      <PricingTeaser />
      <FAQ />
      <CTA />
      <Footer />
    </div>
  )
}

/* ─────────────────── Header ─────────────────── */

function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#0a0a0b]/80 backdrop-blur-xl">
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-7 h-7 rounded-md bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center font-black text-[#0a0a0b] text-sm">
            Y
          </div>
          <span className="font-semibold tracking-tight">YelhaSubs</span>
        </Link>
        <nav className="hidden md:flex items-center gap-8 text-sm">
          <Link href="#features" className="text-white/60 hover:text-white transition-colors">Fonctionnalités</Link>
          <Link href="/pricing" className="text-white/60 hover:text-white transition-colors">Tarifs</Link>
          <Link href="#faq" className="text-white/60 hover:text-white transition-colors">FAQ</Link>
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/login" className="text-sm text-white/70 hover:text-white transition-colors px-3 py-1.5">
            Connexion
          </Link>
          <Link
            href="/register"
            className="text-sm font-medium bg-white text-[#0a0a0b] hover:bg-white/90 transition-colors px-4 py-1.5 rounded-lg"
          >
            Commencer
          </Link>
        </div>
      </div>
    </header>
  )
}

/* ─────────────────── Hero ─────────────────── */

function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Grid backdrop */}
      <div className="absolute inset-0 [background-image:linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] [background-size:64px_64px]" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#0a0a0b]" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-emerald-500/10 blur-[120px] rounded-full" />

      <div className="relative max-w-6xl mx-auto px-6 pt-24 pb-32 text-center">
        <Link
          href="#features"
          className="inline-flex items-center gap-2 text-xs font-medium bg-white/[0.04] border border-white/[0.08] px-3 py-1.5 rounded-full hover:bg-white/[0.08] transition-colors mb-8"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Nouveau : intégration Chargily Pay
          <ArrowRight className="w-3 h-3" />
        </Link>

        <h1 className="text-5xl sm:text-7xl font-semibold tracking-tight leading-[1.05] max-w-4xl mx-auto">
          Les abonnements,<br />
          <span className="text-white/40">sans les tableurs.</span>
        </h1>

        <p className="text-lg text-white/60 mt-7 max-w-xl mx-auto leading-relaxed">
          YelhaSubs automatise la facturation récurrente de vos clients en Algérie.
          Paiement Chargily Pay, CCP, rappels WhatsApp.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center mt-10">
          <Link
            href="/register"
            className="inline-flex items-center justify-center gap-2 bg-white text-[#0a0a0b] hover:bg-white/90 font-medium px-5 py-2.5 rounded-lg text-sm transition-colors"
          >
            Démarrer 15 jours gratuits <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/pricing"
            className="inline-flex items-center justify-center gap-2 bg-white/[0.04] border border-white/[0.08] text-white hover:bg-white/[0.08] font-medium px-5 py-2.5 rounded-lg text-sm transition-colors"
          >
            Voir les tarifs
          </Link>
        </div>

        <p className="text-xs text-white/40 mt-5">Sans carte bancaire · Annulation en 1 clic</p>

        {/* Product mockup */}
        <div className="mt-20 relative">
          <div className="absolute inset-x-0 -top-10 h-32 bg-gradient-to-b from-emerald-500/5 to-transparent blur-2xl" />
          <ProductMockup />
        </div>
      </div>
    </section>
  )
}

/* ─────────────────── Product mockup (faux dashboard) ─────────────────── */

function ProductMockup() {
  return (
    <div className="relative rounded-xl bg-[#111113] border border-white/[0.06] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.6)] overflow-hidden text-left">
      {/* Browser bar */}
      <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-white/[0.06] bg-[#0e0e10]">
        <span className="w-2.5 h-2.5 rounded-full bg-white/10" />
        <span className="w-2.5 h-2.5 rounded-full bg-white/10" />
        <span className="w-2.5 h-2.5 rounded-full bg-white/10" />
        <div className="ml-3 px-2.5 py-0.5 text-[10px] text-white/40 bg-white/[0.04] rounded">subs.yelha.net/dashboard</div>
      </div>

      {/* Dashboard grid */}
      <div className="grid grid-cols-12 min-h-[400px]">
        {/* Sidebar */}
        <div className="col-span-2 border-r border-white/[0.06] p-3 hidden sm:block">
          <div className="flex items-center gap-2 mb-5 px-2">
            <div className="w-5 h-5 rounded bg-gradient-to-br from-emerald-400 to-emerald-600" />
            <span className="text-xs font-semibold">YelhaSubs</span>
          </div>
          {['Abonnements', 'Clients', 'Plans', 'Paramètres'].map((l, i) => (
            <div key={l} className={`px-2 py-1.5 rounded text-[11px] mb-0.5 ${i === 0 ? 'bg-white/[0.06] text-white' : 'text-white/40'}`}>{l}</div>
          ))}
        </div>

        {/* Main */}
        <div className="col-span-12 sm:col-span-10 p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-semibold text-sm">Abonnements</h3>
              <p className="text-xs text-white/40 mt-0.5">142 actifs · 8 à renouveler cette semaine</p>
            </div>
            <div className="px-3 py-1.5 bg-emerald-500/10 text-emerald-400 text-xs font-medium rounded-md border border-emerald-500/20">+ Nouveau</div>
          </div>

          {/* KPI row */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            <KPI label="MRR" value="356 480 DA" trend="+12%" />
            <KPI label="Actifs" value="142" trend="+8" />
            <KPI label="Churn" value="2.1%" trend="-0.3pp" neg />
          </div>

          {/* List */}
          <div className="border border-white/[0.06] rounded-lg overflow-hidden">
            {[
              { name: 'Salima Bouzid',   plan: 'Premium Coaching', next: 'dans 2 jours', amount: '4 500 DA' },
              { name: 'Karim Hadj',      plan: 'Abo Salle',        next: 'dans 5 jours', amount: '2 800 DA' },
              { name: 'Yacine Mansouri', plan: 'Box du mois',      next: 'dans 1 sem.',  amount: '6 000 DA' },
              { name: 'Lina Cherif',     plan: 'École Anglais',    next: 'dans 12 jours', amount: '8 500 DA' },
            ].map((s, i) => (
              <div key={s.name} className={`flex items-center justify-between px-4 py-2.5 text-xs ${i !== 0 ? 'border-t border-white/[0.04]' : ''}`}>
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-[9px] font-medium">
                    {s.name.split(' ').map(p => p[0]).join('')}
                  </div>
                  <div>
                    <p className="text-white/90 font-medium">{s.name}</p>
                    <p className="text-white/40 text-[10px]">{s.plan}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium">{s.amount}</p>
                  <p className="text-white/40 text-[10px]">{s.next}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function KPI({ label, value, trend, neg }: { label: string; value: string; trend: string; neg?: boolean }) {
  return (
    <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-3">
      <p className="text-[10px] text-white/40 uppercase tracking-wide font-medium">{label}</p>
      <p className="text-sm font-semibold mt-1">{value}</p>
      <p className={`text-[10px] mt-0.5 ${neg ? 'text-rose-400' : 'text-emerald-400'}`}>{trend}</p>
    </div>
  )
}

/* ─────────────────── Logo strip ─────────────────── */

function LogoStrip() {
  return (
    <section className="border-y border-white/[0.06] bg-white/[0.01]">
      <div className="max-w-6xl mx-auto px-6 py-10">
        <p className="text-xs text-white/40 text-center uppercase tracking-widest font-medium mb-6">
          Utilisé par des entreprises algériennes
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-4 opacity-50">
          {['Salle Fitness Alger', 'École Numérique', 'BoxNutrition', 'Coworking Oran', 'Auto-École Pro', 'Pressing Express'].map(n => (
            <span key={n} className="text-sm font-medium text-white/70 tracking-tight">{n}</span>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ─────────────────── Showcase ─────────────────── */

function Showcase() {
  return (
    <section id="features" className="max-w-6xl mx-auto px-6 py-32">
      <div className="text-center mb-20">
        <p className="text-xs font-semibold text-emerald-400 uppercase tracking-widest">Workflow</p>
        <h2 className="text-4xl sm:text-5xl font-semibold tracking-tight mt-3 max-w-2xl mx-auto leading-tight">
          De la souscription au paiement,<br />en un seul outil.
        </h2>
      </div>

      <div className="space-y-24">
        <Row
          step="01"
          title="Créez un plan en 30 secondes"
          desc="Définissez le nom, le prix, l'intervalle (hebdo / mensuel / trimestriel / annuel) et la période d'essai. C'est tout."
          mock={<MockPlan />}
        />
        <Row
          reverse
          step="02"
          title="Vos clients souscrivent"
          desc="Ajoutez-les manuellement, importez un CSV, ou laissez-les souscrire via votre API publique. Chargily Pay ou CCP au choix."
          mock={<MockSub />}
        />
        <Row
          step="03"
          title="On s'occupe du reste"
          desc="Rappels J-3 et J-1 par email et WhatsApp. Lien de paiement automatique. Vous voyez juste l'argent rentrer."
          mock={<MockEmail />}
        />
      </div>
    </section>
  )
}

function Row({ step, title, desc, mock, reverse }: { step: string; title: string; desc: string; mock: React.ReactNode; reverse?: boolean }) {
  return (
    <div className={`grid md:grid-cols-2 gap-12 items-center ${reverse ? 'md:[direction:rtl]' : ''}`}>
      <div className="md:[direction:ltr]">
        <p className="text-xs font-mono text-white/30 mb-3">— {step}</p>
        <h3 className="text-3xl font-semibold tracking-tight leading-tight">{title}</h3>
        <p className="text-white/60 mt-4 leading-relaxed">{desc}</p>
      </div>
      <div className="md:[direction:ltr]">{mock}</div>
    </div>
  )
}

function MockPlan() {
  return (
    <div className="bg-[#111113] border border-white/[0.06] rounded-lg p-5 text-sm">
      <div className="flex justify-between items-center mb-4">
        <span className="font-semibold">Nouveau plan</span>
        <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">Brouillon</span>
      </div>
      <div className="space-y-3">
        <Field label="Nom" value="Abonnement mensuel Premium" />
        <Field label="Prix" value="4 500 DA" />
        <Field label="Intervalle" value="Mensuel · sans engagement" />
        <Field label="Essai" value="7 jours gratuits" />
      </div>
      <button className="mt-5 w-full bg-emerald-500 text-[#0a0a0b] font-medium py-2 rounded-md text-xs">
        Créer le plan
      </button>
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white/[0.02] border border-white/[0.06] rounded-md px-3 py-2">
      <p className="text-[10px] text-white/40 uppercase tracking-wide">{label}</p>
      <p className="text-xs text-white mt-0.5">{value}</p>
    </div>
  )
}

function MockSub() {
  return (
    <div className="bg-[#111113] border border-white/[0.06] rounded-lg overflow-hidden text-sm">
      <div className="px-5 py-3 border-b border-white/[0.06] flex justify-between items-center">
        <span className="font-semibold">142 abonnés</span>
        <div className="flex gap-1">
          {['Tous', 'Actifs', 'Essai', 'En retard'].map((t, i) => (
            <span key={t} className={`text-[10px] px-2 py-0.5 rounded ${i === 1 ? 'bg-white/10 text-white' : 'text-white/40'}`}>{t}</span>
          ))}
        </div>
      </div>
      {[
        { n: 'Salima B.', s: 'Actif', c: 'emerald' },
        { n: 'Karim H.',  s: 'Actif', c: 'emerald' },
        { n: 'Lina C.',   s: 'Essai 4j',  c: 'amber' },
        { n: 'Yacine M.', s: 'En retard', c: 'rose' },
      ].map((r, i) => (
        <div key={r.n} className={`px-5 py-2.5 flex justify-between items-center text-xs ${i !== 0 ? 'border-t border-white/[0.04]' : ''}`}>
          <span>{r.n}</span>
          <span className={`text-[10px] px-2 py-0.5 rounded bg-${r.c}-500/10 text-${r.c}-400`}>{r.s}</span>
        </div>
      ))}
    </div>
  )
}

function MockEmail() {
  return (
    <div className="bg-[#111113] border border-white/[0.06] rounded-lg p-5 text-sm">
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-white/[0.06]">
        <div className="w-7 h-7 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-xs font-semibold">M</div>
        <div>
          <p className="text-xs font-medium">Mehdi de Salle Fitness</p>
          <p className="text-[10px] text-white/40">pour Salima — il y a 2 min</p>
        </div>
      </div>
      <p className="text-xs text-white/80 leading-relaxed">
        Bonjour Salima 👋<br /><br />
        Votre abonnement <strong>Premium Coaching</strong> arrive à échéance dans 3 jours.
        Vous pouvez renouveler en 1 clic :
      </p>
      <div className="flex gap-2 mt-4">
        <div className="text-[10px] bg-emerald-500 text-[#0a0a0b] font-medium px-3 py-1.5 rounded">Payer en ligne</div>
        <div className="text-[10px] bg-white/[0.04] border border-white/[0.08] px-3 py-1.5 rounded">Voir CCP</div>
      </div>
    </div>
  )
}

/* ─────────────────── Feature grid ─────────────────── */

function FeatureGrid() {
  const features = [
    { t: 'Chargily Pay intégré',     d: 'Edahabia et CIB. Webhooks automatiques. Réconciliation immédiate.' },
    { t: 'Virement CCP',             d: 'Chaque paiement a une référence unique. Vous confirmez en 1 clic.' },
    { t: 'Rappels WhatsApp',         d: 'Multilingue FR / EN / AR. Templates personnalisables.' },
    { t: 'API publique',             d: 'Intégrez votre site, Shopify, WooCommerce ou app mobile.' },
    { t: 'Webhooks sortants',        d: 'Notifiez votre stack à chaque événement (créé, payé, expiré).' },
    { t: 'Multi-devises',            d: 'DZD, EUR, USD. Pour vos clients à l\'export.' },
  ]
  return (
    <section className="border-t border-white/[0.06] bg-white/[0.01]">
      <div className="max-w-6xl mx-auto px-6 py-24">
        <div className="text-center mb-14">
          <p className="text-xs font-semibold text-emerald-400 uppercase tracking-widest">Tout est inclus</p>
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight mt-3">Pas de surprise dans la facture.</h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-px bg-white/[0.06] border border-white/[0.06] rounded-xl overflow-hidden">
          {features.map(f => (
            <div key={f.t} className="bg-[#0a0a0b] p-7 hover:bg-white/[0.02] transition-colors">
              <h3 className="font-semibold text-base">{f.t}</h3>
              <p className="text-sm text-white/50 mt-2 leading-relaxed">{f.d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ─────────────────── Use cases ─────────────────── */

function UseCases() {
  const cases = [
    { t: 'Salles de sport',        d: 'Gérez les abonnements mensuels, les essais 1 semaine, les abonnés en retard.' },
    { t: 'Écoles privées',         d: 'Mensualités scolaires, périodes d\'essai cours pilotes, multi-enfants par famille.' },
    { t: 'Fournisseurs internet',  d: 'Forfaits mensuels, suspensions automatiques, relances avant coupure.' },
    { t: 'Coworkings',             d: 'Pass jour, pass semaine, abonnements bureau. Tout en un.' },
  ]
  return (
    <section className="max-w-6xl mx-auto px-6 py-24">
      <div className="text-center mb-12">
        <p className="text-xs font-semibold text-emerald-400 uppercase tracking-widest">Cas d&apos;usage</p>
        <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight mt-3">Pour qui ?</h2>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        {cases.map(c => (
          <div key={c.t} className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-6 hover:border-white/[0.12] transition-colors">
            <h3 className="font-semibold text-base">{c.t}</h3>
            <p className="text-sm text-white/50 mt-2 leading-relaxed">{c.d}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

/* ─────────────────── Pricing teaser ─────────────────── */

function PricingTeaser() {
  return (
    <section className="border-y border-white/[0.06] bg-white/[0.01]">
      <div className="max-w-3xl mx-auto px-6 py-24 text-center">
        <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight">Tarification simple.</h2>
        <p className="text-white/60 mt-4 max-w-lg mx-auto">À partir de <strong className="text-white">990 DA / mois</strong>. 15 jours d&apos;essai gratuit. Sans carte bancaire.</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
          <Link
            href="/pricing"
            className="inline-flex items-center justify-center gap-2 bg-white text-[#0a0a0b] hover:bg-white/90 font-medium px-5 py-2.5 rounded-lg text-sm"
          >
            Voir les 3 plans <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  )
}

/* ─────────────────── FAQ ─────────────────── */

function FAQ() {
  const q = [
    { q: 'Comment ça fonctionne avec Chargily Pay ?',         a: 'Vous renseignez votre clé API Chargily dans les paramètres. À chaque rappel, un lien de paiement personnalisé est généré. Le paiement est encaissé sur votre compte Chargily, pas le nôtre.' },
    { q: 'Et si je n\'ai pas Chargily ?',                     a: 'Vous pouvez fonctionner uniquement en CCP. Chaque abonnement génère une référence unique que le client met dans le commentaire du virement. Vous confirmez le paiement manuellement en 1 clic.' },
    { q: 'Combien d\'abonnements puis-je gérer ?',            a: 'Starter : 50. Pro : 500. Agency : illimité.' },
    { q: 'Mes données sont-elles en sécurité ?',              a: 'Oui. Données chiffrées, sauvegardes quotidiennes, hébergement européen. Conforme aux exigences algériennes de souveraineté des données business.' },
    { q: 'Annulation ?',                                      a: 'En 1 clic depuis votre tableau de bord. Pas d\'engagement, pas de pénalité.' },
  ]
  return (
    <section id="faq" className="max-w-3xl mx-auto px-6 py-24">
      <div className="text-center mb-12">
        <p className="text-xs font-semibold text-emerald-400 uppercase tracking-widest">FAQ</p>
        <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight mt-3">Questions fréquentes</h2>
      </div>
      <div className="space-y-px bg-white/[0.06] border border-white/[0.06] rounded-xl overflow-hidden">
        {q.map(item => (
          <details key={item.q} className="group bg-[#0a0a0b] open:bg-white/[0.02]">
            <summary className="px-6 py-5 cursor-pointer text-sm font-medium flex items-center justify-between hover:bg-white/[0.02] transition-colors">
              {item.q}
              <span className="text-white/40 group-open:rotate-180 transition-transform text-xs">▼</span>
            </summary>
            <div className="px-6 pb-5 text-sm text-white/60 leading-relaxed">{item.a}</div>
          </details>
        ))}
      </div>
    </section>
  )
}

/* ─────────────────── CTA ─────────────────── */

function CTA() {
  return (
    <section className="relative overflow-hidden border-t border-white/[0.06]">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-emerald-500/10 blur-[100px] rounded-full" />
      <div className="relative max-w-3xl mx-auto px-6 py-28 text-center">
        <div className="inline-flex w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 items-center justify-center mb-6">
          <Zap className="w-5 h-5 text-emerald-400" />
        </div>
        <h2 className="text-4xl sm:text-5xl font-semibold tracking-tight leading-tight">
          Prêt à arrêter Excel ?
        </h2>
        <p className="text-white/60 mt-4 max-w-lg mx-auto">15 jours pour tester. Sans CB. Sans bullshit.</p>
        <Link
          href="/register"
          className="inline-flex items-center justify-center gap-2 bg-white text-[#0a0a0b] hover:bg-white/90 font-medium px-6 py-3 rounded-lg text-sm mt-8"
        >
          Créer mon compte <ArrowRight className="w-4 h-4" />
        </Link>
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mt-6 text-xs text-white/40">
          <span className="flex items-center gap-1.5"><Check className="w-3 h-3 text-emerald-400" /> 15 jours gratuits</span>
          <span className="flex items-center gap-1.5"><Check className="w-3 h-3 text-emerald-400" /> Sans CB</span>
          <span className="flex items-center gap-1.5"><Check className="w-3 h-3 text-emerald-400" /> Support FR/AR</span>
        </div>
      </div>
    </section>
  )
}

/* ─────────────────── Footer ─────────────────── */

function Footer() {
  return (
    <footer className="border-t border-white/[0.06] py-12 px-6">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-white/40">
        <div className="flex items-center gap-2.5">
          <div className="w-5 h-5 rounded bg-gradient-to-br from-emerald-400 to-emerald-600" />
          <span>© {new Date().getFullYear()} YelhaSubs · Alger</span>
        </div>
        <div className="flex gap-6">
          <Link href="/conditions" className="hover:text-white transition-colors">Conditions</Link>
          <Link href="/confidentialite" className="hover:text-white transition-colors">Confidentialité</Link>
          <Link href="/mentions-legales" className="hover:text-white transition-colors">Mentions légales</Link>
        </div>
      </div>
    </footer>
  )
}
