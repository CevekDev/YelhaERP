import Link from 'next/link'
import { TrendingUp, ArrowLeft } from 'lucide-react'

export const metadata = {
  title: "Conditions d'utilisation — YelhaSubs",
  description: "Conditions générales d'utilisation de la plateforme YelhaSubs.",
}

export default function ConditionsPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white/95 backdrop-blur-md border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2 flex-shrink-0">
            <div className="w-8 h-8 bg-yelha-500 rounded-lg flex items-center justify-center shadow-sm">
              <TrendingUp className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-slate-900">YelhaSubs</span>
          </Link>
          <nav className="hidden sm:flex items-center gap-4 text-xs text-slate-500">
            <Link href="/conditions" className="text-yelha-600 font-semibold">Conditions</Link>
            <Link href="/confidentialite" className="hover:text-yelha-600 transition-colors">Confidentialité</Link>
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
          <div className="bg-gradient-to-br from-yelha-600 to-yelha-500 px-8 sm:px-10 py-10">
            <span className="inline-block bg-white/20 text-white text-xs font-semibold px-3 py-1 rounded-full mb-4 border border-white/20">Légal</span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white mb-2">Conditions d&apos;utilisation</h1>
            <p className="text-yelha-100 text-sm">Dernière mise à jour : 22 mai 2026</p>
          </div>

          {/* Content */}
          <div className="px-8 sm:px-10 py-10 space-y-8 text-slate-700 leading-relaxed">

            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
                <span className="w-6 h-6 bg-yelha-100 text-yelha-700 rounded-lg flex items-center justify-center text-xs font-extrabold flex-shrink-0">1</span>
                Objet
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                Les présentes conditions générales d&apos;utilisation (CGU) régissent l&apos;accès et l&apos;utilisation de la plateforme
                <strong className="text-slate-800"> YelhaSubs</strong>, éditée par YelhaSubs, dont le siège social est situé à Alger, Algérie.
                En accédant à la plateforme, vous acceptez sans réserve les présentes CGU.
              </p>
            </section>

            <div className="border-t border-slate-100" />

            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
                <span className="w-6 h-6 bg-yelha-100 text-yelha-700 rounded-lg flex items-center justify-center text-xs font-extrabold flex-shrink-0">2</span>
                Description du service
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed mb-3">
                YelhaSubs est une solution de gestion d&apos;entreprise en mode SaaS destinée aux entreprises algériennes. Elle comprend :
              </p>
              <ul className="space-y-2">
                {[
                  'Core ERP gratuit à vie : facturation, devis, achats, stocks, clients et fournisseurs.',
                  'Module Abonnements clients (payant) : gestion des abonnements récurrents avec paiement Chargily.',
                  'Modules additionnels à venir : CRM, RH, Comptabilité SCF, Point de vente, Assistant IA.',
                  'API publique permettant d\'intégrer YelhaSubs à des applications tierces.',
                ].map(item => (
                  <li key={item} className="flex items-start gap-2 text-sm text-slate-600">
                    <span className="w-1.5 h-1.5 bg-yelha-500 rounded-full mt-1.5 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </section>

            <div className="border-t border-slate-100" />

            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
                <span className="w-6 h-6 bg-yelha-100 text-yelha-700 rounded-lg flex items-center justify-center text-xs font-extrabold flex-shrink-0">3</span>
                Accès et inscription
              </h2>
              <div className="space-y-3 text-sm text-slate-600 leading-relaxed">
                <p>
                  L&apos;accès au Core ERP est gratuit et illimité dans le temps. L&apos;accès aux modules additionnels nécessite
                  la souscription d&apos;un abonnement payant, précédée d&apos;un essai gratuit de 15 jours.
                </p>
                <p>
                  L&apos;inscription est réservée aux personnes physiques ou morales capables juridiquement, exerçant une activité
                  professionnelle légale. Vous êtes responsable de la confidentialité de vos identifiants.
                </p>
              </div>
            </section>

            <div className="border-t border-slate-100" />

            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
                <span className="w-6 h-6 bg-yelha-100 text-yelha-700 rounded-lg flex items-center justify-center text-xs font-extrabold flex-shrink-0">4</span>
                Tarifs et facturation
              </h2>
              <div className="space-y-3 text-sm text-slate-600 leading-relaxed">
                <p>
                  Les tarifs des modules additionnels sont libellés en dinars algériens (DA) hors taxes et peuvent être modifiés
                  avec un préavis de 30 jours notifié par email. Les abonnements sont mensuels ou annuels et renouvelés
                  automatiquement sauf résiliation avant la date d&apos;échéance.
                </p>
                <p>
                  <strong className="text-slate-800">Moyens de paiement acceptés :</strong> Chargily ePay (Edahabia, CIB algérien)
                  et virement CCP. Pour les paiements CCP, la validation manuelle intervient sous 24h ouvrées.
                </p>
                <p>
                  Toute période commencée est due en intégralité. Aucun remboursement proratisé n&apos;est accordé en cas
                  de résiliation en cours de période, conformément à l&apos;article 9 ci-dessous.
                </p>
                <p>
                  Une facture en format PDF est disponible au téléchargement depuis votre espace de facturation
                  pour chaque paiement confirmé.
                </p>
              </div>
            </section>

            <div className="border-t border-slate-100" />

            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
                <span className="w-6 h-6 bg-yelha-100 text-yelha-700 rounded-lg flex items-center justify-center text-xs font-extrabold flex-shrink-0">5</span>
                Obligations de l&apos;utilisateur
              </h2>
              <ul className="space-y-2">
                {[
                  'Fournir des informations exactes et à jour lors de l\'inscription.',
                  'Utiliser la plateforme conformément à la législation algérienne en vigueur.',
                  'Ne pas tenter de contourner les mesures de sécurité ou d\'accéder aux données d\'autres utilisateurs.',
                  'Ne pas utiliser la plateforme à des fins illicites, frauduleuses ou contraires à l\'ordre public.',
                  'Respecter les droits de propriété intellectuelle de YelhaSubs et de ses partenaires.',
                ].map(item => (
                  <li key={item} className="flex items-start gap-2 text-sm text-slate-600">
                    <span className="w-1.5 h-1.5 bg-yelha-500 rounded-full mt-1.5 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </section>

            <div className="border-t border-slate-100" />

            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
                <span className="w-6 h-6 bg-yelha-100 text-yelha-700 rounded-lg flex items-center justify-center text-xs font-extrabold flex-shrink-0">6</span>
                Propriété intellectuelle
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                L&apos;ensemble des éléments de la plateforme YelhaSubs (code source, interfaces, marques, logos, algorithmes)
                est la propriété exclusive de YelhaSubs et protégé par les lois algériennes et internationales.
                L&apos;utilisateur bénéficie d&apos;un droit d&apos;utilisation personnel, non exclusif et non transférable.
              </p>
            </section>

            <div className="border-t border-slate-100" />

            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
                <span className="w-6 h-6 bg-yelha-100 text-yelha-700 rounded-lg flex items-center justify-center text-xs font-extrabold flex-shrink-0">7</span>
                Données et confidentialité
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                Le traitement de vos données est régi par notre{' '}
                <Link href="/confidentialite" className="text-yelha-600 hover:underline font-medium">
                  Politique de confidentialité
                </Link>
                . Vos données métier vous appartiennent et ne sont jamais partagées ni revendues à des tiers.
              </p>
            </section>

            <div className="border-t border-slate-100" />

            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
                <span className="w-6 h-6 bg-yelha-100 text-yelha-700 rounded-lg flex items-center justify-center text-xs font-extrabold flex-shrink-0">8</span>
                Limitation de responsabilité
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                YelhaSubs ne pourra être tenu responsable des dommages indirects, pertes de données ou manques à gagner.
                La responsabilité totale est limitée aux sommes versées au titre de l&apos;abonnement au cours des 3 derniers mois.
              </p>
            </section>

            <div className="border-t border-slate-100" />

            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
                <span className="w-6 h-6 bg-yelha-100 text-yelha-700 rounded-lg flex items-center justify-center text-xs font-extrabold flex-shrink-0">9</span>
                Résiliation et droit de rétractation
              </h2>
              <div className="space-y-3 text-sm text-slate-600 leading-relaxed">
                <p>
                  <strong className="text-slate-800">Résiliation par l&apos;utilisateur :</strong> Vous pouvez résilier votre abonnement à tout moment
                  depuis votre espace client. La résiliation prend effet à la fin de la période en cours.
                  Le Core ERP reste accessible gratuitement sans limitation dans le temps.
                </p>
                <p>
                  <strong className="text-slate-800">Suppression de compte :</strong> Vous pouvez demander la suppression complète de votre compte
                  et de vos données depuis les paramètres de votre profil, conformément à la loi algérienne n° 18-07
                  relative à la protection des personnes physiques dans le traitement des données à caractère personnel.
                </p>
                <p>
                  <strong className="text-slate-800">Résiliation par YelhaSubs :</strong> En cas de violation grave des présentes CGU,
                  YelhaSubs se réserve le droit de suspendre ou résilier votre accès avec un préavis de 48h,
                  sauf en cas d&apos;urgence liée à la sécurité.
                </p>
              </div>
            </section>

            <div className="border-t border-slate-100" />

            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
                <span className="w-6 h-6 bg-yelha-100 text-yelha-700 rounded-lg flex items-center justify-center text-xs font-extrabold flex-shrink-0">10</span>
                Droit applicable et contact
              </h2>
              <div className="space-y-3 text-sm text-slate-600 leading-relaxed">
                <p>
                  Les présentes CGU sont régies par le droit algérien, notamment la loi n° 18-05 du 10 mai 2018
                  relative au commerce électronique, l&apos;ordonnance n° 03-03 relative à la concurrence,
                  et la loi n° 18-07 relative à la protection des données personnelles.
                  Tout litige sera soumis aux juridictions compétentes d&apos;Alger.
                </p>
                <p>
                  <strong className="text-slate-800">Support :</strong>
                </p>
                <ul className="space-y-1.5">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-yelha-500 rounded-full flex-shrink-0" />
                    Email :{' '}
                    <a href="mailto:cvkdev@outlook.fr" className="text-yelha-600 hover:underline font-medium">
                      cvkdev@outlook.fr
                    </a>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-yelha-500 rounded-full flex-shrink-0" />
                    WhatsApp :{' '}
                    <a href="https://wa.me/33761179379" target="_blank" rel="noopener noreferrer" className="text-yelha-600 hover:underline font-medium">
                      +33 7 61 17 93 79
                    </a>
                  </li>
                </ul>
              </div>
            </section>
          </div>
        </div>
      </main>

      <footer className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <p>© {new Date().getFullYear()} YelhaSubs — Alger, Algérie</p>
          <div className="flex items-center gap-4">
            <Link href="/conditions" className="text-yelha-600 font-medium">Conditions</Link>
            <Link href="/confidentialite" className="hover:text-yelha-600 transition-colors">Confidentialité</Link>
            <Link href="/mentions-legales" className="hover:text-yelha-600 transition-colors">Mentions légales</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
