import Link from 'next/link'
import { TrendingUp, ArrowLeft } from 'lucide-react'

export const metadata = {
  title: 'Politique de confidentialité — YelhaERP',
  description: 'Découvrez comment YelhaERP collecte, utilise et protège vos données personnelles.',
}

export default function ConfidentialitePage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white/95 backdrop-blur-md border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2 flex-shrink-0">
            <div className="w-8 h-8 bg-yelha-500 rounded-lg flex items-center justify-center shadow-sm">
              <TrendingUp className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-slate-900">YelhaERP</span>
          </Link>
          <nav className="hidden sm:flex items-center gap-4 text-xs text-slate-500">
            <Link href="/conditions" className="hover:text-yelha-600 transition-colors">Conditions</Link>
            <Link href="/confidentialite" className="text-yelha-600 font-semibold">Confidentialité</Link>
            <Link href="/mentions-legales" className="hover:text-yelha-600 transition-colors">Mentions légales</Link>
          </nav>
          <Link href="/" className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-yelha-600 transition-colors flex-shrink-0">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Accueil</span>
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-16">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Page header */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-700 px-8 sm:px-10 py-10">
            <span className="inline-block bg-white/20 text-white text-xs font-semibold px-3 py-1 rounded-full mb-4 border border-white/20">Légal</span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white mb-2">Politique de confidentialité</h1>
            <p className="text-slate-400 text-sm">Dernière mise à jour : 17 mai 2026</p>
          </div>

          {/* Content */}
          <div className="px-8 sm:px-10 py-10 space-y-8 text-slate-700 leading-relaxed">

            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
                <span className="w-6 h-6 bg-slate-100 text-slate-600 rounded-lg flex items-center justify-center text-xs font-extrabold flex-shrink-0">1</span>
                Données collectées
              </h2>
              <p className="text-sm text-slate-600 mb-3">Nous collectons les catégories de données suivantes :</p>
              <div className="grid sm:grid-cols-2 gap-3">
                {[
                  { label: 'Données d\'inscription', desc: 'Nom, email, téléphone' },
                  { label: 'Données entreprise', desc: 'Raison sociale, secteur, wilaya' },
                  { label: 'Données commerciales', desc: 'Factures, clients, fournisseurs, stocks' },
                  { label: 'Données de navigation', desc: 'Logs de connexion, adresse IP' },
                ].map(d => (
                  <div key={d.label} className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                    <div className="font-semibold text-slate-800 text-sm mb-1">{d.label}</div>
                    <div className="text-slate-500 text-xs">{d.desc}</div>
                  </div>
                ))}
              </div>
            </section>

            <div className="border-t border-slate-100" />

            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
                <span className="w-6 h-6 bg-slate-100 text-slate-600 rounded-lg flex items-center justify-center text-xs font-extrabold flex-shrink-0">2</span>
                Utilisation des données
              </h2>
              <ul className="space-y-2">
                {[
                  'Fournir et améliorer les services YelhaERP.',
                  'Envoyer des notifications essentielles (vérification email, alertes de sécurité).',
                  'Assurer la sécurité de la plateforme et prévenir les abus.',
                  'Respecter nos obligations légales et fiscales en Algérie.',
                ].map(item => (
                  <li key={item} className="flex items-start gap-2 text-sm text-slate-600">
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full mt-1.5 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </section>

            <div className="border-t border-slate-100" />

            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
                <span className="w-6 h-6 bg-slate-100 text-slate-600 rounded-lg flex items-center justify-center text-xs font-extrabold flex-shrink-0">3</span>
                Stockage et sécurité
              </h2>
              <div className="space-y-3 text-sm text-slate-600 leading-relaxed">
                <p>
                  Vos données sont stockées sur des serveurs sécurisés (Supabase/PostgreSQL) avec chiffrement
                  en transit (HTTPS/TLS 1.3). Les mots de passe sont hachés avec bcrypt (coût 12).
                </p>
                <p>
                  Une isolation stricte multi-tenant garantit que vos données sont inaccessibles aux autres entreprises,
                  même en cas d&apos;erreur de requête. Les clés API sont stockées chiffrées et affichées masquées dans l&apos;interface.
                </p>
              </div>
            </section>

            <div className="border-t border-slate-100" />

            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
                <span className="w-6 h-6 bg-slate-100 text-slate-600 rounded-lg flex items-center justify-center text-xs font-extrabold flex-shrink-0">4</span>
                Partage des données
              </h2>
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-4 text-sm text-emerald-800 font-medium">
                Nous ne vendons jamais vos données à des tiers, quelles que soient les circonstances.
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">
                Vos données peuvent être partagées uniquement avec nos prestataires techniques strictement nécessaires
                au fonctionnement du service : hébergement (Vercel), base de données (Supabase), emails transactionnels (Resend).
                Ces prestataires sont contractuellement tenus au respect de la confidentialité.
              </p>
            </section>

            <div className="border-t border-slate-100" />

            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
                <span className="w-6 h-6 bg-slate-100 text-slate-600 rounded-lg flex items-center justify-center text-xs font-extrabold flex-shrink-0">5</span>
                Vos droits
              </h2>
              <p className="text-sm text-slate-600 mb-3">
                Conformément à la législation algérienne sur la protection des données, vous disposez des droits suivants :
              </p>
              <div className="grid sm:grid-cols-2 gap-3">
                {[
                  { label: 'Droit d\'accès', desc: 'Obtenez une copie de vos données.' },
                  { label: 'Droit de rectification', desc: 'Corrigez les données inexactes.' },
                  { label: 'Droit à l\'effacement', desc: 'Demandez la suppression de vos données.' },
                  { label: 'Droit à la portabilité', desc: 'Exportez vos données dans un format standard.' },
                ].map(r => (
                  <div key={r.label} className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                    <div className="font-semibold text-slate-800 text-sm mb-1">{r.label}</div>
                    <div className="text-slate-500 text-xs">{r.desc}</div>
                  </div>
                ))}
              </div>
              <p className="text-sm text-slate-500 mt-4">
                Pour exercer ces droits :{' '}
                <a href="mailto:cvkdev@outlook.fr" className="text-yelha-600 hover:underline font-medium">
                  cvkdev@outlook.fr
                </a>
              </p>
            </section>

            <div className="border-t border-slate-100" />

            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
                <span className="w-6 h-6 bg-slate-100 text-slate-600 rounded-lg flex items-center justify-center text-xs font-extrabold flex-shrink-0">6</span>
                Cookies
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                YelhaERP utilise uniquement des cookies essentiels au fonctionnement du service (session d&apos;authentification JWT,
                préférence de langue). Aucun cookie publicitaire, de tracking tiers ou de profilage n&apos;est utilisé.
              </p>
            </section>

            <div className="border-t border-slate-100" />

            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
                <span className="w-6 h-6 bg-slate-100 text-slate-600 rounded-lg flex items-center justify-center text-xs font-extrabold flex-shrink-0">7</span>
                Conservation des données
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                Vos données sont conservées pendant toute la durée de votre compte actif. En cas de résiliation,
                vos données métier sont conservées 5 ans pour respecter les obligations comptables et fiscales algériennes,
                puis supprimées définitivement. Vous pouvez demander une suppression anticipée sous réserve d&apos;obligations légales.
              </p>
            </section>
          </div>
        </div>
      </main>

      <footer className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <p>© {new Date().getFullYear()} YelhaERP — Alger, Algérie</p>
          <div className="flex items-center gap-4">
            <Link href="/conditions" className="hover:text-yelha-600 transition-colors">Conditions</Link>
            <Link href="/confidentialite" className="text-yelha-600 font-medium">Confidentialité</Link>
            <Link href="/mentions-legales" className="hover:text-yelha-600 transition-colors">Mentions légales</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
