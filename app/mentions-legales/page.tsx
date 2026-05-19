import Link from 'next/link'
import { TrendingUp, ArrowLeft } from 'lucide-react'

export const metadata = {
  title: 'Mentions légales — YelhaSubs',
  description: 'Mentions légales de la plateforme YelhaSubs — éditeur, hébergeur, propriété intellectuelle.',
}

export default function MentionsLegalesPage() {
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
            <Link href="/conditions" className="hover:text-yelha-600 transition-colors">Conditions</Link>
            <Link href="/confidentialite" className="hover:text-yelha-600 transition-colors">Confidentialité</Link>
            <Link href="/mentions-legales" className="text-yelha-600 font-semibold">Mentions légales</Link>
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
          <div className="bg-gradient-to-br from-indigo-700 to-indigo-600 px-8 sm:px-10 py-10">
            <span className="inline-block bg-white/20 text-white text-xs font-semibold px-3 py-1 rounded-full mb-4 border border-white/20">Légal</span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white mb-2">Mentions légales</h1>
            <p className="text-indigo-200 text-sm">Dernière mise à jour : 17 mai 2026</p>
          </div>

          {/* Content */}
          <div className="px-8 sm:px-10 py-10 space-y-8">

            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-4">Éditeur du site</h2>
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                {[
                  { key: 'Dénomination', val: 'YelhaSubs' },
                  { key: 'Forme juridique', val: 'Entreprise individuelle / Startup' },
                  { key: 'Siège social', val: 'Alger, Algérie' },
                  { key: 'Email', val: 'cvkdev@outlook.fr', link: 'mailto:cvkdev@outlook.fr' },
                  { key: 'Directeur de la publication', val: 'Équipe YelhaSubs' },
                ].map((row, i) => (
                  <div key={row.key} className={`flex gap-4 px-5 py-3.5 text-sm ${i % 2 === 0 ? 'bg-slate-50' : 'bg-white'} border-b border-slate-100 last:border-0`}>
                    <span className="font-semibold text-slate-700 w-48 flex-shrink-0">{row.key}</span>
                    {row.link
                      ? <a href={row.link} className="text-yelha-600 hover:underline">{row.val}</a>
                      : <span className="text-slate-600">{row.val}</span>
                    }
                  </div>
                ))}
              </div>
            </section>

            <div className="border-t border-slate-100" />

            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-4">Hébergement</h2>
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                {[
                  { key: 'Hébergeur', val: 'Vercel Inc.' },
                  { key: 'Adresse', val: '440 N Barranca Ave #4133, Covina, CA 91723, USA' },
                  { key: 'Site web', val: 'vercel.com', link: 'https://vercel.com' },
                ].map((row, i) => (
                  <div key={row.key} className={`flex gap-4 px-5 py-3.5 text-sm ${i % 2 === 0 ? 'bg-slate-50' : 'bg-white'} border-b border-slate-100 last:border-0`}>
                    <span className="font-semibold text-slate-700 w-48 flex-shrink-0">{row.key}</span>
                    {row.link
                      ? <a href={row.link} target="_blank" rel="noopener noreferrer" className="text-yelha-600 hover:underline">{row.val}</a>
                      : <span className="text-slate-600">{row.val}</span>
                    }
                  </div>
                ))}
              </div>
            </section>

            <div className="border-t border-slate-100" />

            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-4">Base de données</h2>
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                {[
                  { key: 'Fournisseur', val: 'Supabase Inc.' },
                  { key: 'Type', val: 'PostgreSQL managé' },
                  { key: 'Région', val: 'EU Central (Frankfurt, Allemagne)' },
                  { key: 'Site web', val: 'supabase.com', link: 'https://supabase.com' },
                ].map((row, i) => (
                  <div key={row.key} className={`flex gap-4 px-5 py-3.5 text-sm ${i % 2 === 0 ? 'bg-slate-50' : 'bg-white'} border-b border-slate-100 last:border-0`}>
                    <span className="font-semibold text-slate-700 w-48 flex-shrink-0">{row.key}</span>
                    {row.link
                      ? <a href={row.link} target="_blank" rel="noopener noreferrer" className="text-yelha-600 hover:underline">{row.val}</a>
                      : <span className="text-slate-600">{row.val}</span>
                    }
                  </div>
                ))}
              </div>
            </section>

            <div className="border-t border-slate-100" />

            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-3">Paiements</h2>
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                {[
                  { key: 'Prestataire', val: 'Chargily' },
                  { key: 'Méthodes', val: 'Edahabia, CIB (carte interbancaire)' },
                  { key: 'Conformité', val: 'Réglementation bancaire algérienne' },
                ].map((row, i) => (
                  <div key={row.key} className={`flex gap-4 px-5 py-3.5 text-sm ${i % 2 === 0 ? 'bg-slate-50' : 'bg-white'} border-b border-slate-100 last:border-0`}>
                    <span className="font-semibold text-slate-700 w-48 flex-shrink-0">{row.key}</span>
                    <span className="text-slate-600">{row.val}</span>
                  </div>
                ))}
              </div>
            </section>

            <div className="border-t border-slate-100" />

            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-3">Propriété intellectuelle</h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                L&apos;ensemble du contenu du site YelhaSubs (textes, images, code source, design, algorithmes) est protégé
                par le droit d&apos;auteur et appartient à YelhaSubs. Toute reproduction, même partielle, est strictement
                interdite sans autorisation préalable écrite de YelhaSubs.
              </p>
            </section>

            <div className="border-t border-slate-100" />

            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-3">Droit applicable</h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                Le présent site est soumis au droit algérien. Tout litige relatif à son utilisation sera soumis
                à la juridiction exclusive des tribunaux d&apos;Alger, Algérie.
              </p>
            </section>
          </div>
        </div>
      </main>

      <footer className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <p>© {new Date().getFullYear()} YelhaSubs — Alger, Algérie</p>
          <div className="flex items-center gap-4">
            <Link href="/conditions" className="hover:text-yelha-600 transition-colors">Conditions</Link>
            <Link href="/confidentialite" className="hover:text-yelha-600 transition-colors">Confidentialité</Link>
            <Link href="/mentions-legales" className="text-yelha-600 font-medium">Mentions légales</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
