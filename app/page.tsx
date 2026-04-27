'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  TrendingUp, Menu, X, ArrowRight, CheckCircle, FileText, Users, Package,
  Calculator, Briefcase, BarChart3, Zap, Shield, Globe, ChevronDown,
  Star, Building2, Receipt, Truck, Brain, Clock, Award, Sparkles,
} from 'lucide-react'

// ─── Navbar ───────────────────────────────────────────────────────────────────
function Navbar() {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', fn)
    return () => window.removeEventListener('scroll', fn)
  }, [])

  const links = [
    { label: 'Fonctionnalités', href: '#features' },
    { label: 'Tarifs', href: '#pricing' },
    { label: 'À propos', href: '#about' },
  ]

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      scrolled ? 'bg-white/95 backdrop-blur-md shadow-sm border-b border-yelha-100' : 'bg-transparent'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-yelha-500 rounded-xl flex items-center justify-center shadow-lg shadow-yelha-500/30">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <span className={`text-xl font-bold transition-colors ${scrolled ? 'text-yelha-700' : 'text-white'}`}>
              YelhaERP
            </span>
          </div>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-8">
            {links.map(l => (
              <a key={l.href} href={l.href} className={`text-sm font-medium transition-colors hover:text-yelha-500 ${
                scrolled ? 'text-slate-600' : 'text-white/80'
              }`}>{l.label}</a>
            ))}
          </div>

          {/* CTA */}
          <div className="hidden md:flex items-center gap-3">
            <Link href="/login" className={`text-sm font-medium transition-colors hover:text-yelha-500 ${
              scrolled ? 'text-slate-600' : 'text-white/80'
            }`}>
              Connexion
            </Link>
            <Link href="/register" className="bg-yelha-500 hover:bg-yelha-600 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-all hover:shadow-lg hover:shadow-yelha-500/25 hover:-translate-y-0.5">
              Essai gratuit
            </Link>
          </div>

          {/* Mobile menu btn */}
          <button onClick={() => setOpen(!open)} className={`md:hidden p-2 rounded-lg transition-colors ${
            scrolled ? 'text-slate-700 hover:bg-slate-100' : 'text-white hover:bg-white/10'
          }`}>
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden bg-white border-t border-slate-100 shadow-lg">
          <div className="px-4 py-4 space-y-3">
            {links.map(l => (
              <a key={l.href} href={l.href} onClick={() => setOpen(false)}
                className="block text-sm font-medium text-slate-700 hover:text-yelha-600 py-2">
                {l.label}
              </a>
            ))}
            <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
              <Link href="/login" className="text-center text-sm font-medium text-slate-700 py-2 border border-slate-200 rounded-lg hover:border-yelha-300">
                Connexion
              </Link>
              <Link href="/register" className="text-center bg-yelha-500 text-white text-sm font-semibold py-2.5 rounded-lg hover:bg-yelha-600">
                Essai gratuit — 10 jours
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}

// ─── Hero ──────────────────────────────────────────────────────────────────────
function Hero() {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-slate-950">
      {/* Animated background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-yelha-500/20 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute top-1/2 -right-40 w-[500px] h-[500px] bg-yelha-400/10 rounded-full blur-[100px] animate-pulse delay-1000" />
        <div className="absolute bottom-0 left-1/3 w-[400px] h-[400px] bg-yelha-600/15 rounded-full blur-[100px]" />
        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left */}
          <div className="text-center lg:text-left">
            <div className="inline-flex items-center gap-2 bg-yelha-500/10 border border-yelha-500/20 text-yelha-400 text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
              <Sparkles className="w-3.5 h-3.5" />
              ERP conçu pour les entreprises algériennes
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-[1.1] tracking-tight mb-6">
              Gérez votre{' '}
              <span className="relative inline-block">
                <span className="bg-gradient-to-r from-yelha-400 to-yelha-300 bg-clip-text text-transparent">
                  entreprise
                </span>
                <svg className="absolute -bottom-1 left-0 w-full" viewBox="0 0 200 8" fill="none">
                  <path d="M2 6 Q100 2 198 6" stroke="url(#grad)" strokeWidth="2.5" strokeLinecap="round"/>
                  <defs><linearGradient id="grad" x1="0" y1="0" x2="200" y2="0">
                    <stop stopColor="#3ec79c"/><stop offset="1" stopColor="#1D9E75"/>
                  </linearGradient></defs>
                </svg>
              </span>
              {' '}en toute simplicité
            </h1>

            <p className="text-slate-400 text-lg leading-relaxed mb-8 max-w-lg mx-auto lg:mx-0">
              Facturation, stock, paie, comptabilité SCF, déclarations fiscales —
              tout ce dont votre entreprise a besoin, dans une seule plateforme adaptée au droit algérien.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 mb-10">
              <Link href="/register"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-yelha-500 hover:bg-yelha-400 text-white font-semibold px-6 py-3.5 rounded-xl transition-all hover:shadow-xl hover:shadow-yelha-500/30 hover:-translate-y-0.5 text-sm">
                Commencer gratuitement
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/login"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium px-6 py-3.5 rounded-xl transition-all text-sm">
                Voir la démo
              </Link>
            </div>

            {/* Trust signals */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-5 text-xs text-slate-500">
              {['Aucune carte requise', '10 jours gratuits', 'Support en français'].map(t => (
                <span key={t} className="flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-yelha-500 flex-shrink-0" />
                  {t}
                </span>
              ))}
            </div>
          </div>

          {/* Right — Dashboard mockup */}
          <div className="hidden lg:block relative">
            <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl shadow-black/50 bg-slate-900">
              {/* Window chrome */}
              <div className="flex items-center gap-1.5 px-4 py-3 bg-slate-800/80 border-b border-white/5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-500/70" />
                <div className="ml-3 flex-1 bg-slate-700 rounded h-4 max-w-[140px]" />
              </div>
              {/* Mockup content */}
              <div className="p-5 space-y-4">
                {/* KPI row */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Chiffre d\'affaires', value: '1 247 800 DA', up: true },
                    { label: 'Factures impayées', value: '3', up: false },
                    { label: 'Produits en stock', value: '142', up: true },
                  ].map((k, i) => (
                    <div key={i} className="bg-slate-800 rounded-xl p-3 border border-white/5">
                      <p className="text-slate-500 text-[9px] mb-1">{k.label}</p>
                      <p className="text-white text-xs font-bold">{k.value}</p>
                      <div className={`text-[9px] mt-1 ${k.up ? 'text-yelha-400' : 'text-red-400'}`}>
                        {k.up ? '↑ +12%' : '↓ -2'}
                      </div>
                    </div>
                  ))}
                </div>
                {/* Chart mockup */}
                <div className="bg-slate-800 rounded-xl p-4 border border-white/5">
                  <p className="text-slate-400 text-[10px] mb-3">Revenus — 6 derniers mois</p>
                  <div className="flex items-end gap-2 h-20">
                    {[45, 62, 38, 75, 55, 88].map((h, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <div className="w-full rounded-t-md" style={{
                          height: `${h}%`,
                          background: i === 5 ? 'linear-gradient(to top, #1D9E75, #3ec79c)' : '#1e293b',
                          border: '1px solid rgba(255,255,255,0.05)',
                        }} />
                        <span className="text-[8px] text-slate-600">{['N','D','J','F','M','A'][i]}</span>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Recent invoices */}
                <div className="bg-slate-800 rounded-xl border border-white/5 overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-white/5">
                    <p className="text-slate-400 text-[10px] font-medium">Factures récentes</p>
                  </div>
                  {[
                    { ref: 'FAC-2024-0089', client: 'SARL TechDZ', amount: '245 000 DA', status: 'PAYÉE' },
                    { ref: 'FAC-2024-0088', client: 'ETS Benhamed', amount: '87 500 DA', status: 'EN ATTENTE' },
                    { ref: 'FAC-2024-0087', client: 'SPA Importex', amount: '512 000 DA', status: 'PAYÉE' },
                  ].map((inv, i) => (
                    <div key={i} className="flex items-center justify-between px-4 py-2.5 border-b border-white/5 last:border-0">
                      <div>
                        <p className="text-white text-[10px] font-medium">{inv.ref}</p>
                        <p className="text-slate-500 text-[9px]">{inv.client}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-white text-[10px]">{inv.amount}</p>
                        <span className={`text-[8px] px-1.5 py-0.5 rounded-full ${
                          inv.status === 'PAYÉE' ? 'bg-yelha-500/20 text-yelha-400' : 'bg-yellow-500/20 text-yellow-400'
                        }`}>{inv.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            {/* Floating badge */}
            <div className="absolute -bottom-4 -left-4 bg-yelha-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-lg shadow-yelha-500/40 flex items-center gap-2">
              <Zap className="w-3.5 h-3.5" />
              IRG & TVA calculés automatiquement
            </div>
            <div className="absolute -top-4 -right-4 bg-white text-slate-800 text-xs font-bold px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2">
              <Shield className="w-3.5 h-3.5 text-yelha-500" />
              Conforme droit algérien
            </div>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/30 animate-bounce">
        <ChevronDown className="w-6 h-6" />
      </div>
    </section>
  )
}

// ─── Stats bar ────────────────────────────────────────────────────────────────
function StatsBar() {
  const stats = [
    { value: '10 000+', label: 'Factures générées' },
    { value: '500+', label: 'Entreprises actives' },
    { value: '58', label: 'Wilayas couvertes' },
    { value: '99.9%', label: 'Disponibilité' },
  ]
  return (
    <div className="bg-yelha-500 py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 lg:gap-8">
          {stats.map(s => (
            <div key={s.label} className="text-center">
              <div className="text-3xl lg:text-4xl font-extrabold text-white mb-1">{s.value}</div>
              <div className="text-yelha-100 text-sm">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Features ─────────────────────────────────────────────────────────────────
const FEATURES = [
  {
    icon: FileText, color: 'bg-blue-50 text-blue-600',
    title: 'Facturation Pro',
    desc: 'Créez des factures conformes, gérez les acomptes, générez des PDFs et partagez un portail client unique.',
  },
  {
    icon: Package, color: 'bg-orange-50 text-orange-600',
    title: 'Gestion des Stocks',
    desc: 'Suivez vos entrées/sorties, recevez des alertes de stock faible et valorisez votre inventaire en temps réel.',
  },
  {
    icon: Users, color: 'bg-purple-50 text-purple-600',
    title: 'Paie & RH',
    desc: 'Calcul automatique du salaire net selon le barème IRG 2022 et les cotisations CNAS 9% / 26%.',
  },
  {
    icon: Calculator, color: 'bg-yelha-50 text-yelha-600',
    title: 'Comptabilité SCF',
    desc: 'Journal général et balance des comptes conformes au Système Comptable Financier algérien.',
  },
  {
    icon: Receipt, color: 'bg-red-50 text-red-600',
    title: 'Déclarations Fiscales',
    desc: 'Calcul automatique G50 (TVA 19%), suivi des échéances et historique des déclarations DGI.',
  },
  {
    icon: Truck, color: 'bg-cyan-50 text-cyan-600',
    title: 'Fournisseurs & Achats',
    desc: 'Gérez vos bons de commande, suivez vos achats et centralisez vos relations fournisseurs.',
  },
  {
    icon: Globe, color: 'bg-indigo-50 text-indigo-600',
    title: 'Intégrations E-commerce',
    desc: 'Synchronisez automatiquement vos commandes Shopify et WooCommerce comme factures.',
  },
  {
    icon: Brain, color: 'bg-pink-50 text-pink-600',
    title: 'Assistant IA',
    desc: 'Un assistant intelligent formé sur la réglementation algérienne pour répondre à vos questions comptables.',
  },
]

function Features() {
  return (
    <section id="features" className="py-20 lg:py-28 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <span className="inline-block bg-yelha-100 text-yelha-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-4">
            Fonctionnalités
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 mb-4">
            Tout ce qu'il vous faut,{' '}
            <span className="bg-gradient-to-r from-yelha-600 to-yelha-400 bg-clip-text text-transparent">
              rien de plus
            </span>
          </h2>
          <p className="text-slate-500 text-lg max-w-2xl mx-auto">
            Une suite complète pensée pour les PME et auto-entrepreneurs algériens, sans complexité inutile.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {FEATURES.map((f) => {
            const Icon = f.icon
            return (
              <div key={f.title}
                className="group bg-white rounded-2xl p-6 border border-slate-100 hover:border-yelha-200 hover:shadow-lg hover:shadow-yelha-500/5 transition-all duration-300 hover:-translate-y-1">
                <div className={`w-11 h-11 rounded-xl ${f.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">{f.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

// ─── Algeria section ──────────────────────────────────────────────────────────
function AlgeriaSection() {
  const items = [
    { icon: Award, title: 'IRG Barème 2022', desc: 'Calcul exact de l\'impôt sur le revenu global selon le dernier barème en vigueur.' },
    { icon: Building2, title: 'Plan Comptable SCF', desc: 'Tous les comptes du Système Comptable Financier algérien intégrés nativement.' },
    { icon: Receipt, title: 'G50 & TVA 19%', desc: 'Génération automatique de la déclaration mensuelle avec calcul de la TVA.' },
    { icon: Clock, title: 'CNAS 9% / 26%', desc: 'Cotisations sociales employé et employeur calculées automatiquement à la paie.' },
    { icon: Globe, title: '58 Wilayas', desc: 'Base de données complète des 58 wilayas pour vos clients et fournisseurs.' },
    { icon: Briefcase, title: 'SARL, SPA, AE', desc: 'Adapté à toutes les formes juridiques : société, auto-entrepreneur ou artisan.' },
  ]

  return (
    <section id="about" className="py-20 lg:py-28 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-14 lg:gap-20 items-center">
          <div>
            <span className="inline-block bg-yelha-100 text-yelha-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-4">
              🇩🇿 Conçu pour l'Algérie
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 mb-6 leading-tight">
              100% conforme à la{' '}
              <span className="bg-gradient-to-r from-yelha-600 to-yelha-400 bg-clip-text text-transparent">
                réglementation
              </span>{' '}
              algérienne
            </h2>
            <p className="text-slate-500 text-lg leading-relaxed mb-8">
              YelhaERP n'est pas une adaptation d'un ERP étranger. Il a été conçu depuis le premier jour
              pour respecter les spécificités du droit fiscal, comptable et social algérien.
            </p>
            <Link href="/register"
              className="inline-flex items-center gap-2 bg-yelha-500 hover:bg-yelha-600 text-white font-semibold px-5 py-3 rounded-xl text-sm transition-all hover:shadow-lg hover:shadow-yelha-500/30">
              Commencer l'essai gratuit
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {items.map(item => {
              const Icon = item.icon
              return (
                <div key={item.title} className="flex gap-4 p-4 rounded-xl bg-slate-50 hover:bg-yelha-50 transition-colors border border-transparent hover:border-yelha-100">
                  <div className="w-10 h-10 bg-yelha-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5 text-yelha-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900 text-sm mb-1">{item.title}</h4>
                    <p className="text-slate-500 text-xs leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── Pricing ──────────────────────────────────────────────────────────────────
const PLANS = [
  {
    name: 'TRIAL',
    price: 'Gratuit',
    period: '10 jours',
    desc: 'Découvrez toutes les fonctionnalités sans engagement.',
    features: ['Factures illimitées', 'Gestion des clients', 'Stock de base', 'Support email'],
    cta: 'Commencer',
    popular: false,
  },
  {
    name: 'STARTER',
    price: '1 500 DA',
    period: 'par mois',
    desc: 'Pour les auto-entrepreneurs et petites structures.',
    features: ['Tout TRIAL', 'Paie & RH (5 employés)', 'Comptabilité SCF', 'Déclarations G50', 'Support prioritaire'],
    cta: 'Choisir STARTER',
    popular: false,
  },
  {
    name: 'PRO',
    price: '3 200 DA',
    period: 'par mois',
    desc: 'La solution complète pour les PME en croissance.',
    features: ['Tout STARTER', 'Paie illimitée', 'Intégrations Shopify/Woo', 'Assistant IA', 'Portail client', 'Multi-utilisateurs'],
    cta: 'Choisir PRO',
    popular: true,
  },
  {
    name: 'AGENCY',
    price: '9 900 DA',
    period: 'par mois',
    desc: 'Pour les cabinets comptables et groupes multi-entités.',
    features: ['Tout PRO', 'Entreprises illimitées', 'Tableau de bord multi-tenant', 'API dédiée', 'SLA garanti', 'Onboarding dédié'],
    cta: 'Contacter',
    popular: false,
  },
]

function Pricing() {
  return (
    <section id="pricing" className="py-20 lg:py-28 bg-slate-950 relative overflow-hidden">
      <div className="absolute inset-0 opacity-[0.04]"
        style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-yelha-500/10 rounded-full blur-[100px]" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <span className="inline-block bg-yelha-500/10 border border-yelha-500/20 text-yelha-400 text-xs font-semibold px-3 py-1.5 rounded-full mb-4">
            Tarifs
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white mb-4">
            Des prix adaptés à votre{' '}
            <span className="bg-gradient-to-r from-yelha-400 to-yelha-300 bg-clip-text text-transparent">
              croissance
            </span>
          </h2>
          <p className="text-slate-400 text-lg max-w-xl mx-auto">
            Commencez gratuitement, évoluez quand vous en avez besoin. Pas de surprise.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {PLANS.map(plan => (
            <div key={plan.name} className={`relative rounded-2xl p-6 border transition-all ${
              plan.popular
                ? 'bg-yelha-500 border-yelha-400 shadow-2xl shadow-yelha-500/30 scale-105'
                : 'bg-slate-900 border-slate-800 hover:border-slate-600'
            }`}>
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white text-yelha-700 text-[10px] font-extrabold px-3 py-1 rounded-full tracking-wide flex items-center gap-1">
                  <Star className="w-3 h-3 fill-current" /> POPULAIRE
                </div>
              )}
              <div className="mb-5">
                <span className={`text-xs font-bold tracking-widest uppercase ${plan.popular ? 'text-yelha-100' : 'text-slate-500'}`}>
                  {plan.name}
                </span>
                <div className="mt-2 flex items-end gap-1">
                  <span className={`text-3xl font-extrabold ${plan.popular ? 'text-white' : 'text-white'}`}>{plan.price}</span>
                  <span className={`text-sm mb-1 ${plan.popular ? 'text-yelha-100' : 'text-slate-400'}`}>/{plan.period}</span>
                </div>
                <p className={`text-xs mt-2 ${plan.popular ? 'text-yelha-100' : 'text-slate-400'}`}>{plan.desc}</p>
              </div>

              <ul className="space-y-2.5 mb-6">
                {plan.features.map(f => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <CheckCircle className={`w-4 h-4 flex-shrink-0 mt-0.5 ${plan.popular ? 'text-yelha-100' : 'text-yelha-500'}`} />
                    <span className={plan.popular ? 'text-yelha-50' : 'text-slate-300'}>{f}</span>
                  </li>
                ))}
              </ul>

              <Link href="/register"
                className={`block text-center text-sm font-semibold py-2.5 rounded-xl transition-all ${
                  plan.popular
                    ? 'bg-white text-yelha-700 hover:bg-yelha-50'
                    : 'bg-slate-800 text-white hover:bg-slate-700 border border-slate-700'
                }`}>
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── CTA Banner ───────────────────────────────────────────────────────────────
function CTABanner() {
  return (
    <section className="py-20 lg:py-24 bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-yelha-600 to-yelha-500 p-12 lg:p-16 shadow-2xl shadow-yelha-500/30">
          <div className="absolute inset-0 opacity-10"
            style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 50%, white 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
          <div className="relative">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white mb-4">
              Prêt à moderniser votre gestion ?
            </h2>
            <p className="text-yelha-100 text-lg mb-8 max-w-xl mx-auto">
              Rejoignez plus de 500 entreprises algériennes qui font confiance à YelhaERP.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/register"
                className="inline-flex items-center justify-center gap-2 bg-white text-yelha-700 font-bold px-6 py-3.5 rounded-xl hover:bg-yelha-50 transition-all text-sm shadow-lg">
                Démarrer l'essai gratuit
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/login"
                className="inline-flex items-center justify-center gap-2 bg-white/10 border border-white/20 text-white font-medium px-6 py-3.5 rounded-xl hover:bg-white/20 transition-all text-sm">
                Se connecter
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── Footer ───────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="bg-slate-950 text-slate-400 py-12 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-yelha-500 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-white" />
              </div>
              <span className="text-white font-bold">YelhaERP</span>
            </div>
            <p className="text-xs leading-relaxed">
              L'ERP SaaS pensé pour les entreprises algériennes. Simple, conforme, efficace.
            </p>
          </div>
          <div>
            <h4 className="text-white text-sm font-semibold mb-3">Produit</h4>
            <ul className="space-y-2 text-xs">
              {['Fonctionnalités', 'Tarifs', 'Roadmap', 'Changelog'].map(l => (
                <li key={l}><a href="#" className="hover:text-yelha-400 transition-colors">{l}</a></li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-white text-sm font-semibold mb-3">Légal</h4>
            <ul className="space-y-2 text-xs">
              {['Conditions d\'utilisation', 'Confidentialité', 'Mentions légales'].map(l => (
                <li key={l}><a href="#" className="hover:text-yelha-400 transition-colors">{l}</a></li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-white text-sm font-semibold mb-3">Contact</h4>
            <ul className="space-y-2 text-xs">
              <li><a href="mailto:contact@yelha.net" className="hover:text-yelha-400 transition-colors">contact@yelha.net</a></li>
              <li><span>Alger, Algérie</span></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-slate-800 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <p>© {new Date().getFullYear()} YelhaERP. Tous droits réservés.</p>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-yelha-500 rounded-full animate-pulse" />
            <span>Tous les systèmes opérationnels</span>
          </div>
        </div>
      </div>
    </footer>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <Hero />
      <StatsBar />
      <Features />
      <AlgeriaSection />
      <Pricing />
      <CTABanner />
      <Footer />
    </div>
  )
}
