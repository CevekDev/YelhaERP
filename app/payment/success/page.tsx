'use client'

import Link from 'next/link'
import { CheckCircle, TrendingUp, ArrowRight, Clock } from 'lucide-react'

export default function PaymentSuccessPage() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <div className="flex items-center px-6 py-4 bg-white border-b border-slate-100">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-yelha-500 rounded-lg flex items-center justify-center shadow-sm">
            <TrendingUp className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-slate-900">YelhaSubs</span>
        </Link>
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md text-center space-y-6">
          <div className="w-20 h-20 bg-emerald-50 rounded-3xl flex items-center justify-center mx-auto shadow-sm">
            <CheckCircle className="w-10 h-10 text-emerald-500" />
          </div>

          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">Paiement reçu !</h1>
            <p className="text-slate-500 mt-2 text-sm leading-relaxed">
              Votre paiement a bien été transmis à notre équipe pour validation.
              Votre abonnement sera activé sous peu.
            </p>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-left space-y-2">
            <div className="flex items-center gap-2 text-amber-700 font-semibold text-sm">
              <Clock className="w-4 h-4" />
              Activation en cours
            </div>
            <p className="text-amber-600 text-xs leading-relaxed">
              Pour les paiements CCP, la vérification prend généralement moins de 24h ouvrées.
              Vous recevrez un email de confirmation dès que votre abonnement sera actif.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center gap-2 h-11 px-6 bg-yelha-500 hover:bg-yelha-600 text-white font-semibold rounded-xl text-sm transition-colors shadow-sm shadow-yelha-500/20"
            >
              Accéder au tableau de bord
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/dashboard/settings/billing"
              className="inline-flex items-center justify-center gap-2 h-11 px-6 bg-white hover:bg-slate-50 text-slate-700 font-semibold rounded-xl text-sm transition-colors border border-slate-200"
            >
              Voir mon abonnement
            </Link>
          </div>

          <p className="text-xs text-slate-400">
            Une question ?{' '}
            <a href="mailto:cvkdev@outlook.fr" className="text-yelha-600 hover:underline">cvkdev@outlook.fr</a>
            {' '}ou{' '}
            <a href="https://wa.me/33761179379" target="_blank" rel="noopener noreferrer" className="text-yelha-600 hover:underline">WhatsApp</a>
          </p>
        </div>
      </div>
    </div>
  )
}
