import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export const metadata = {
  title: "Conditions d'utilisation — YelhaSubs",
  description: "Conditions générales d'utilisation de la plateforme YelhaSubs.",
}

const LEGAL_LINKS = [
  { href: '/conditions',      label: 'Conditions' },
  { href: '/confidentialite', label: 'Confidentialité' },
  { href: '/mentions-legales', label: 'Mentions légales' },
]

function LegalHeader({ active }: { active: string }) {
  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#0a0a0b]/80 backdrop-blur-xl">
      <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center font-black text-[#0a0a0b] text-sm">Y</div>
          <span className="font-semibold tracking-tight text-white">YelhaSubs</span>
        </Link>
        <nav className="hidden sm:flex items-center gap-1">
          {LEGAL_LINKS.map(l => (
            <Link
              key={l.href}
              href={l.href}
              className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${
                l.href === active
                  ? 'bg-white/[0.08] text-white font-medium'
                  : 'text-white/50 hover:text-white'
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <Link href="/" className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /><span className="hidden sm:inline">Accueil</span>
        </Link>
      </div>
    </header>
  )
}

function Section({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-base font-semibold text-white flex items-center gap-3">
        <span className="w-6 h-6 rounded-md bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-bold shrink-0">{n}</span>
        {title}
      </h2>
      <div className="pl-9 text-sm text-white/60 leading-relaxed space-y-2">{children}</div>
    </section>
  )
}

export default function ConditionsPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0b] text-white antialiased">
      <LegalHeader active="/conditions" />

      <main className="max-w-3xl mx-auto px-6 py-14">
        <div className="mb-10">
          <span className="text-xs font-medium text-emerald-400 uppercase tracking-widest">Légal</span>
          <h1 className="text-3xl font-semibold tracking-tight mt-2">Conditions d&apos;utilisation</h1>
          <p className="text-white/40 text-sm mt-1">Dernière mise à jour : 17 mai 2026</p>
        </div>

        <div className="space-y-8 divide-y divide-white/[0.06]">
          <Section n={1} title="Objet">
            <p>
              Les présentes conditions générales d&apos;utilisation (CGU) régissent l&apos;accès et l&apos;utilisation de la plateforme
              <strong className="text-white"> YelhaSubs</strong>, éditée par YelhaSubs, dont le siège social est situé à Alger, Algérie.
              En accédant à la plateforme, vous acceptez sans réserve les présentes CGU.
            </p>
          </Section>

          <div className="pt-8">
            <Section n={2} title="Description du service">
              <p>YelhaSubs est une solution de gestion d&apos;entreprise en mode SaaS destinée aux entreprises algériennes. Elle comprend :</p>
              <ul className="space-y-1.5 mt-2">
                {[
                  'Core ERP gratuit à vie : facturation, devis, achats, stocks, clients et fournisseurs.',
                  'Module Abonnements clients (payant) : gestion des abonnements récurrents avec paiement Chargily.',
                  'Modules additionnels à venir : CRM, RH, Comptabilité SCF, Point de vente, Assistant IA.',
                  "API publique permettant d'intégrer YelhaSubs à des applications tierces.",
                ].map(item => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="w-1 h-1 rounded-full bg-emerald-500 mt-2 shrink-0" />{item}
                  </li>
                ))}
              </ul>
            </Section>
          </div>

          <div className="pt-8">
            <Section n={3} title="Accès et inscription">
              <p>
                L&apos;accès au Core ERP est gratuit et illimité dans le temps. L&apos;accès aux modules additionnels nécessite
                la souscription d&apos;un abonnement payant, précédée d&apos;un essai gratuit de 15 jours.
              </p>
              <p>
                L&apos;inscription est réservée aux personnes physiques ou morales capables juridiquement, exerçant une activité
                professionnelle légale. Vous êtes responsable de la confidentialité de vos identifiants.
              </p>
            </Section>
          </div>

          <div className="pt-8">
            <Section n={4} title="Tarifs et facturation">
              <p>
                Les tarifs des modules additionnels sont libellés en dinars algériens (DA) et peuvent être modifiés
                avec un préavis de 30 jours. Les abonnements sont mensuels et renouvelés automatiquement sauf résiliation.
              </p>
              <p>
                Le paiement est traité via Chargily (Edahabia, CIB). Toute période commencée est due en intégralité.
                Aucun remboursement proratisé n&apos;est accordé en cas de résiliation en cours de période.
              </p>
            </Section>
          </div>

          <div className="pt-8">
            <Section n={5} title="Obligations de l'utilisateur">
              <ul className="space-y-1.5">
                {[
                  "Fournir des informations exactes et à jour lors de l'inscription.",
                  'Utiliser la plateforme conformément à la législation algérienne en vigueur.',
                  "Ne pas tenter de contourner les mesures de sécurité ou d'accéder aux données d'autres utilisateurs.",
                  "Ne pas utiliser la plateforme à des fins illicites, frauduleuses ou contraires à l'ordre public.",
                  'Respecter les droits de propriété intellectuelle de YelhaSubs et de ses partenaires.',
                ].map(item => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="w-1 h-1 rounded-full bg-emerald-500 mt-2 shrink-0" />{item}
                  </li>
                ))}
              </ul>
            </Section>
          </div>

          <div className="pt-8">
            <Section n={6} title="Propriété intellectuelle">
              <p>
                L&apos;ensemble des éléments de la plateforme YelhaSubs (code source, interfaces, marques, logos, algorithmes)
                est la propriété exclusive de YelhaSubs et protégé par les lois algériennes et internationales.
                L&apos;utilisateur bénéficie d&apos;un droit d&apos;utilisation personnel, non exclusif et non transférable.
              </p>
            </Section>
          </div>

          <div className="pt-8">
            <Section n={7} title="Données et confidentialité">
              <p>
                Le traitement de vos données est régi par notre{' '}
                <Link href="/confidentialite" className="text-emerald-400 hover:text-emerald-300 underline underline-offset-2">
                  Politique de confidentialité
                </Link>
                . Vos données métier vous appartiennent et ne sont jamais partagées ni revendues à des tiers.
              </p>
            </Section>
          </div>

          <div className="pt-8">
            <Section n={8} title="Limitation de responsabilité">
              <p>
                YelhaSubs ne pourra être tenu responsable des dommages indirects, pertes de données ou manques à gagner.
                La responsabilité totale est limitée aux sommes versées au titre de l&apos;abonnement au cours des 3 derniers mois.
              </p>
            </Section>
          </div>

          <div className="pt-8">
            <Section n={9} title="Droit applicable et contact">
              <p>
                Les présentes CGU sont régies par le droit algérien. Tout litige sera soumis aux tribunaux d&apos;Alger.
                Pour toute question :{' '}
                <a href="mailto:cvkdev@outlook.fr" className="text-emerald-400 hover:text-emerald-300 underline underline-offset-2">
                  cvkdev@outlook.fr
                </a>
              </p>
            </Section>
          </div>
        </div>
      </main>

      <footer className="border-t border-white/[0.06] py-8 px-6">
        <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-white/30">
          <p>© {new Date().getFullYear()} YelhaSubs — Alger, Algérie</p>
          <div className="flex items-center gap-4">
            {LEGAL_LINKS.map(l => (
              <Link key={l.href} href={l.href} className="hover:text-white transition-colors">{l.label}</Link>
            ))}
          </div>
        </div>
      </footer>
    </div>
  )
}
