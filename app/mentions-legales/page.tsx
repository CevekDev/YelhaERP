import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export const metadata = {
  title: 'Mentions légales — YelhaSubs',
  description: 'Mentions légales de la plateforme YelhaSubs — éditeur, hébergeur, propriété intellectuelle.',
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

function InfoTable({ rows }: { rows: { key: string; val: string; link?: string }[] }) {
  return (
    <div className="rounded-xl border border-white/[0.07] overflow-hidden">
      {rows.map((row, i) => (
        <div key={row.key} className={`flex gap-4 px-5 py-3.5 text-sm border-b border-white/[0.05] last:border-0 ${i % 2 === 0 ? 'bg-white/[0.02]' : ''}`}>
          <span className="font-medium text-white/60 w-44 shrink-0 text-xs">{row.key}</span>
          {row.link
            ? <a href={row.link} target={row.link.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer" className="text-emerald-400 hover:text-emerald-300 text-xs">{row.val}</a>
            : <span className="text-white/80 text-xs">{row.val}</span>
          }
        </div>
      ))}
    </div>
  )
}

export default function MentionsLegalesPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0b] text-white antialiased">
      <LegalHeader active="/mentions-legales" />

      <main className="max-w-3xl mx-auto px-6 py-14">
        <div className="mb-10">
          <span className="text-xs font-medium text-emerald-400 uppercase tracking-widest">Légal</span>
          <h1 className="text-3xl font-semibold tracking-tight mt-2">Mentions légales</h1>
          <p className="text-white/40 text-sm mt-1">Dernière mise à jour : 17 mai 2026</p>
        </div>

        <div className="space-y-10">
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-white/50 uppercase tracking-widest">Éditeur du site</h2>
            <InfoTable rows={[
              { key: 'Dénomination',               val: 'YelhaSubs' },
              { key: 'Forme juridique',             val: 'Entreprise individuelle / Startup' },
              { key: 'Siège social',                val: 'Alger, Algérie' },
              { key: 'Email',                       val: 'cvkdev@outlook.fr', link: 'mailto:cvkdev@outlook.fr' },
              { key: 'Directeur de la publication', val: 'Équipe YelhaSubs' },
            ]} />
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-white/50 uppercase tracking-widest">Hébergement</h2>
            <InfoTable rows={[
              { key: 'Hébergeur', val: 'Vercel Inc.' },
              { key: 'Adresse',   val: '440 N Barranca Ave #4133, Covina, CA 91723, USA' },
              { key: 'Site web',  val: 'vercel.com', link: 'https://vercel.com' },
            ]} />
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-white/50 uppercase tracking-widest">Base de données</h2>
            <InfoTable rows={[
              { key: 'Fournisseur', val: 'Supabase Inc.' },
              { key: 'Type',        val: 'PostgreSQL managé' },
              { key: 'Région',      val: 'EU Central (Frankfurt, Allemagne)' },
              { key: 'Site web',    val: 'supabase.com', link: 'https://supabase.com' },
            ]} />
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-white/50 uppercase tracking-widest">Paiements</h2>
            <InfoTable rows={[
              { key: 'Prestataire', val: 'Chargily' },
              { key: 'Méthodes',    val: 'Edahabia, CIB (carte interbancaire)' },
              { key: 'Conformité',  val: 'Réglementation bancaire algérienne' },
            ]} />
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-white/50 uppercase tracking-widest">Propriété intellectuelle</h2>
            <p className="text-sm text-white/60 leading-relaxed">
              L&apos;ensemble du contenu du site YelhaSubs (textes, images, code source, design, algorithmes) est protégé
              par le droit d&apos;auteur et appartient à YelhaSubs. Toute reproduction, même partielle, est strictement
              interdite sans autorisation préalable écrite de YelhaSubs.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-white/50 uppercase tracking-widest">Droit applicable</h2>
            <p className="text-sm text-white/60 leading-relaxed">
              Le présent site est soumis au droit algérien. Tout litige relatif à son utilisation sera soumis
              à la juridiction exclusive des tribunaux d&apos;Alger, Algérie.
            </p>
          </section>
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
