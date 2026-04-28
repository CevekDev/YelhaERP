import Link from 'next/link'
import { TrendingUp } from 'lucide-react'

export const metadata = { title: 'Mentions légales' }

export default function MentionsLegalesPage() {
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
            <Link href="/confidentialite" className="hover:text-yelha-600">Confidentialité</Link>
          </nav>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Mentions légales</h1>
        <p className="text-slate-400 text-sm mb-10">Dernière mise à jour : 28 avril 2026</p>

        <div className="space-y-8">
          <section className="bg-slate-50 rounded-2xl p-6">
            <h2 className="text-xl font-semibold text-slate-800 mb-4">Éditeur du site</h2>
            <table className="w-full text-sm text-slate-600">
              <tbody className="space-y-2">
                <tr className="border-b border-slate-200">
                  <td className="py-2 font-medium text-slate-700 w-40">Société</td>
                  <td className="py-2">Yelha</td>
                </tr>
                <tr className="border-b border-slate-200">
                  <td className="py-2 font-medium text-slate-700">Forme juridique</td>
                  <td className="py-2">SARL (Société à Responsabilité Limitée)</td>
                </tr>
                <tr className="border-b border-slate-200">
                  <td className="py-2 font-medium text-slate-700">Siège social</td>
                  <td className="py-2">Alger, Algérie</td>
                </tr>
                <tr className="border-b border-slate-200">
                  <td className="py-2 font-medium text-slate-700">Email</td>
                  <td className="py-2"><a href="mailto:contact@yelha.net" className="text-yelha-600 hover:underline">contact@yelha.net</a></td>
                </tr>
                <tr>
                  <td className="py-2 font-medium text-slate-700">Site web</td>
                  <td className="py-2"><a href="https://erp.yelha.net" className="text-yelha-600 hover:underline">erp.yelha.net</a></td>
                </tr>
              </tbody>
            </table>
          </section>

          <section className="bg-slate-50 rounded-2xl p-6">
            <h2 className="text-xl font-semibold text-slate-800 mb-4">Hébergement</h2>
            <table className="w-full text-sm text-slate-600">
              <tbody>
                <tr className="border-b border-slate-200">
                  <td className="py-2 font-medium text-slate-700 w-40">Hébergeur</td>
                  <td className="py-2">Vercel Inc.</td>
                </tr>
                <tr className="border-b border-slate-200">
                  <td className="py-2 font-medium text-slate-700">Adresse</td>
                  <td className="py-2">440 N Barranca Ave #4133, Covina, CA 91723, USA</td>
                </tr>
                <tr>
                  <td className="py-2 font-medium text-slate-700">Site</td>
                  <td className="py-2"><a href="https://vercel.com" className="text-yelha-600 hover:underline">vercel.com</a></td>
                </tr>
              </tbody>
            </table>
          </section>

          <section className="bg-slate-50 rounded-2xl p-6">
            <h2 className="text-xl font-semibold text-slate-800 mb-4">Base de données</h2>
            <table className="w-full text-sm text-slate-600">
              <tbody>
                <tr className="border-b border-slate-200">
                  <td className="py-2 font-medium text-slate-700 w-40">Fournisseur</td>
                  <td className="py-2">Supabase Inc.</td>
                </tr>
                <tr>
                  <td className="py-2 font-medium text-slate-700">Région</td>
                  <td className="py-2">EU Central (Frankfurt, Allemagne)</td>
                </tr>
              </tbody>
            </table>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-3">Propriété intellectuelle</h2>
            <p className="text-slate-600 leading-relaxed">
              L'ensemble du contenu du site YelhaERP (textes, images, logiciels, code source, design) est protégé par le droit d'auteur et appartient à Yelha. Toute reproduction, même partielle, est interdite sans autorisation préalable écrite.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-3">Droit applicable</h2>
            <p className="text-slate-600 leading-relaxed">
              Le présent site est soumis au droit algérien. Tout litige relatif à l'utilisation du site sera soumis à la juridiction exclusive des tribunaux d'Alger.
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
