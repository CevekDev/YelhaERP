import Link from 'next/link'
import { TrendingUp } from 'lucide-react'

export const metadata = { title: "Conditions d'utilisation" }

export default function ConditionsPage() {
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
            <Link href="/confidentialite" className="hover:text-yelha-600">Confidentialité</Link>
            <Link href="/mentions-legales" className="hover:text-yelha-600">Mentions légales</Link>
          </nav>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Conditions d'utilisation</h1>
        <p className="text-slate-400 text-sm mb-10">Dernière mise à jour : 28 avril 2026</p>

        <div className="prose prose-slate max-w-none space-y-8">
          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-3">1. Acceptation des conditions</h2>
            <p className="text-slate-600 leading-relaxed">
              En accédant et en utilisant la plateforme YelhaERP accessible à l'adresse <strong>erp.yelha.net</strong>, vous acceptez d'être lié par les présentes conditions d'utilisation. Si vous n'acceptez pas ces conditions, veuillez ne pas utiliser notre service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-3">2. Description du service</h2>
            <p className="text-slate-600 leading-relaxed">
              YelhaERP est un logiciel de gestion d'entreprise (ERP) en mode SaaS destiné aux entreprises algériennes. Il comprend des modules de facturation, comptabilité, gestion des stocks, paie, gestion des fournisseurs et clients, ainsi qu'un assistant IA.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-3">3. Compte utilisateur</h2>
            <p className="text-slate-600 leading-relaxed">
              Pour accéder au service, vous devez créer un compte avec des informations exactes et complètes. Vous êtes responsable de la confidentialité de vos identifiants de connexion. Vous devez avoir au moins 18 ans pour utiliser ce service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-3">4. Période d'essai et abonnement</h2>
            <p className="text-slate-600 leading-relaxed">
              YelhaERP offre une période d'essai gratuite de 10 jours. À l'expiration de cette période, un abonnement payant est requis pour continuer à utiliser le service. Les tarifs sont disponibles sur la page d'accueil.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-3">5. Utilisation acceptable</h2>
            <p className="text-slate-600 leading-relaxed">Il est interdit d'utiliser YelhaERP pour :</p>
            <ul className="list-disc list-inside text-slate-600 space-y-1 mt-2">
              <li>Toute activité illégale ou contraire à la législation algérienne</li>
              <li>La fraude fiscale ou la falsification de documents comptables</li>
              <li>L'accès non autorisé aux données d'autres entreprises</li>
              <li>La transmission de contenu malveillant</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-3">6. Propriété intellectuelle</h2>
            <p className="text-slate-600 leading-relaxed">
              YelhaERP et tous ses composants (code, design, contenu) sont la propriété exclusive de Yelha. Toute reproduction ou utilisation non autorisée est strictement interdite.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-3">7. Limitation de responsabilité</h2>
            <p className="text-slate-600 leading-relaxed">
              YelhaERP est fourni "tel quel". Nous ne garantissons pas que le service sera ininterrompu ou exempt d'erreurs. Notre responsabilité est limitée au montant payé pour le service au cours des 12 derniers mois.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-3">8. Droit applicable</h2>
            <p className="text-slate-600 leading-relaxed">
              Ces conditions sont régies par le droit algérien. Tout litige sera soumis à la juridiction compétente d'Alger.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-3">9. Contact</h2>
            <p className="text-slate-600 leading-relaxed">
              Pour toute question relative aux présentes conditions, contactez-nous à : <a href="mailto:contact@yelha.net" className="text-yelha-600 hover:underline">contact@yelha.net</a>
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
