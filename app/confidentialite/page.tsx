import Link from 'next/link'
import { TrendingUp } from 'lucide-react'

export const metadata = { title: 'Politique de confidentialité' }

export default function ConfidentialitePage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-yelha-500 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-yelha-700">YelhaERP</span>
          </Link>
          <nav className="flex gap-4 text-sm text-slate-500">
            <Link href="/conditions" className="hover:text-yelha-600">Conditions</Link>
            <Link href="/mentions-legales" className="hover:text-yelha-600">Mentions légales</Link>
          </nav>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Politique de confidentialité</h1>
        <p className="text-slate-400 text-sm mb-10">Dernière mise à jour : 28 avril 2026</p>

        <div className="prose prose-slate max-w-none space-y-8">
          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-3">1. Données collectées</h2>
            <p className="text-slate-600 leading-relaxed">Nous collectons les données suivantes :</p>
            <ul className="list-disc list-inside text-slate-600 space-y-1 mt-2">
              <li><strong>Données d'inscription</strong> : nom, email, numéro de téléphone, date de naissance</li>
              <li><strong>Données de l'entreprise</strong> : nom, secteur d'activité, NIF, RC, AI</li>
              <li><strong>Données commerciales</strong> : factures, clients, fournisseurs, produits, salaires</li>
              <li><strong>Données de navigation</strong> : logs de connexion, adresse IP</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-3">2. Utilisation des données</h2>
            <p className="text-slate-600 leading-relaxed">Vos données sont utilisées pour :</p>
            <ul className="list-disc list-inside text-slate-600 space-y-1 mt-2">
              <li>Fournir et améliorer le service YelhaERP</li>
              <li>Envoyer des notifications importantes (vérification email, bienvenue)</li>
              <li>Assurer la sécurité de la plateforme</li>
              <li>Respecter nos obligations légales en Algérie</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-3">3. Stockage et sécurité</h2>
            <p className="text-slate-600 leading-relaxed">
              Vos données sont stockées sur des serveurs sécurisés (Supabase/PostgreSQL) avec chiffrement en transit (HTTPS/TLS). Les mots de passe sont hachés avec bcrypt. Nous appliquons une isolation stricte des données entre entreprises (multi-tenant).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-3">4. Partage des données</h2>
            <p className="text-slate-600 leading-relaxed">
              Nous ne vendons jamais vos données à des tiers. Vos données peuvent être partagées uniquement avec nos prestataires techniques (hébergement, email) dans le cadre strict de la fourniture du service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-3">5. Vos droits</h2>
            <p className="text-slate-600 leading-relaxed">Conformément à la législation algérienne, vous disposez des droits suivants :</p>
            <ul className="list-disc list-inside text-slate-600 space-y-1 mt-2">
              <li>Droit d'accès à vos données personnelles</li>
              <li>Droit de rectification des données inexactes</li>
              <li>Droit à l'effacement de vos données</li>
              <li>Droit à la portabilité de vos données</li>
            </ul>
            <p className="text-slate-600 leading-relaxed mt-3">
              Pour exercer ces droits, contactez-nous à : <a href="mailto:privacy@yelha.net" className="text-yelha-600 hover:underline">privacy@yelha.net</a>
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-3">6. Cookies</h2>
            <p className="text-slate-600 leading-relaxed">
              YelhaERP utilise des cookies essentiels au fonctionnement du service (session, authentification). Aucun cookie publicitaire ou de tracking n'est utilisé.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-3">7. Conservation des données</h2>
            <p className="text-slate-600 leading-relaxed">
              Vos données sont conservées pendant toute la durée de votre abonnement, plus 5 ans après la résiliation pour respecter les obligations comptables et fiscales algériennes.
            </p>
          </section>
        </div>
      </main>

      <footer className="border-t mt-16">
        <div className="max-w-4xl mx-auto px-6 py-6 flex gap-4 text-sm text-slate-400">
          <Link href="/conditions" className="hover:text-yelha-600">Conditions</Link>
          <Link href="/confidentialite" className="hover:text-yelha-600">Confidentialité</Link>
          <Link href="/mentions-legales" className="hover:text-yelha-600">Mentions légales</Link>
        </div>
      </footer>
    </div>
  )
}
