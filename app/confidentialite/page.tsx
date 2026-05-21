import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export const metadata = {
  title: 'Politique de confidentialité — YelhaSubs',
  description: 'Découvrez comment YelhaSubs collecte, utilise et protège vos données personnelles.',
}

const LEGAL_LINKS = [
  { href: '/conditions',       label: 'Conditions' },
  { href: '/confidentialite',  label: 'Confidentialité' },
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

export default function ConfidentialitePage() {
  return (
    <div className="min-h-screen bg-[#0a0a0b] text-white antialiased">
      <LegalHeader active="/confidentialite" />

      <main className="max-w-3xl mx-auto px-6 py-14">
        <div className="mb-10">
          <span className="text-xs font-medium text-emerald-400 uppercase tracking-widest">Légal</span>
          <h1 className="text-3xl font-semibold tracking-tight mt-2">Politique de confidentialité</h1>
          <p className="text-white/40 text-sm mt-1">Dernière mise à jour : 17 mai 2026</p>
        </div>

        <div className="space-y-8 divide-y divide-white/[0.06]">
          <Section n={1} title="Données collectées">
            <p>Nous collectons les catégories de données suivantes :</p>
            <div className="grid sm:grid-cols-2 gap-3 mt-3">
              {[
                { label: "Données d'inscription", desc: 'Nom, email, téléphone' },
                { label: 'Données entreprise',    desc: 'Raison sociale, secteur, wilaya' },
                { label: 'Données commerciales',  desc: 'Factures, clients, fournisseurs, stocks' },
                { label: 'Données de navigation', desc: 'Logs de connexion, adresse IP' },
              ].map(d => (
                <div key={d.label} className="bg-white/[0.03] border border-white/[0.07] rounded-xl p-4">
                  <p className="font-medium text-white/90 text-xs mb-1">{d.label}</p>
                  <p className="text-white/40 text-xs">{d.desc}</p>
                </div>
              ))}
            </div>
          </Section>

          <div className="pt-8">
            <Section n={2} title="Utilisation des données">
              <ul className="space-y-1.5">
                {[
                  'Fournir et améliorer les services YelhaSubs.',
                  'Envoyer des notifications essentielles (vérification email, alertes de sécurité).',
                  'Assurer la sécurité de la plateforme et prévenir les abus.',
                  'Respecter nos obligations légales et fiscales en Algérie.',
                ].map(item => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="w-1 h-1 rounded-full bg-emerald-500 mt-2 shrink-0" />{item}
                  </li>
                ))}
              </ul>
            </Section>
          </div>

          <div className="pt-8">
            <Section n={3} title="Stockage et sécurité">
              <p>
                Vos données sont stockées sur des serveurs sécurisés (Supabase/PostgreSQL) avec chiffrement
                en transit (HTTPS/TLS 1.3). Les mots de passe sont hachés avec bcrypt (coût 12).
              </p>
              <p>
                Une isolation stricte multi-tenant garantit que vos données sont inaccessibles aux autres entreprises,
                même en cas d&apos;erreur de requête. Les clés API sont stockées chiffrées et affichées masquées dans l&apos;interface.
              </p>
            </Section>
          </div>

          <div className="pt-8">
            <Section n={4} title="Partage des données">
              <div className="bg-emerald-500/[0.08] border border-emerald-500/20 rounded-xl px-4 py-3 text-emerald-300 font-medium text-xs">
                Nous ne vendons jamais vos données à des tiers, quelles que soient les circonstances.
              </div>
              <p className="mt-3">
                Vos données peuvent être partagées uniquement avec nos prestataires techniques strictement nécessaires
                au fonctionnement du service : hébergement (Vercel), base de données (Supabase), emails transactionnels (Resend).
                Ces prestataires sont contractuellement tenus au respect de la confidentialité.
              </p>
            </Section>
          </div>

          <div className="pt-8">
            <Section n={5} title="Vos droits">
              <p>Conformément à la législation algérienne sur la protection des données, vous disposez des droits suivants :</p>
              <div className="grid sm:grid-cols-2 gap-3 mt-3">
                {[
                  { label: "Droit d'accès",         desc: 'Obtenez une copie de vos données.' },
                  { label: 'Droit de rectification', desc: 'Corrigez les données inexactes.' },
                  { label: "Droit à l'effacement",   desc: 'Demandez la suppression de vos données.' },
                  { label: 'Droit à la portabilité', desc: 'Exportez vos données dans un format standard.' },
                ].map(r => (
                  <div key={r.label} className="bg-white/[0.03] border border-white/[0.07] rounded-xl p-4">
                    <p className="font-medium text-white/90 text-xs mb-1">{r.label}</p>
                    <p className="text-white/40 text-xs">{r.desc}</p>
                  </div>
                ))}
              </div>
              <p className="mt-3">
                Pour exercer ces droits :{' '}
                <a href="mailto:cvkdev@outlook.fr" className="text-emerald-400 hover:text-emerald-300 underline underline-offset-2">
                  cvkdev@outlook.fr
                </a>
              </p>
            </Section>
          </div>

          <div className="pt-8">
            <Section n={6} title="Cookies">
              <p>
                YelhaSubs utilise uniquement des cookies essentiels au fonctionnement du service (session d&apos;authentification JWT,
                préférence de langue). Aucun cookie publicitaire, de tracking tiers ou de profilage n&apos;est utilisé.
              </p>
            </Section>
          </div>

          <div className="pt-8">
            <Section n={7} title="Conservation des données">
              <p>
                Vos données sont conservées pendant toute la durée de votre compte actif. En cas de résiliation,
                vos données métier sont conservées 5 ans pour respecter les obligations comptables et fiscales algériennes,
                puis supprimées définitivement. Vous pouvez demander une suppression anticipée sous réserve d&apos;obligations légales.
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
