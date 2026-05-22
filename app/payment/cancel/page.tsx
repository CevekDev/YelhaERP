'use client'

import Link from 'next/link'
import { XCircle, TrendingUp, ArrowLeft, RotateCcw } from 'lucide-react'

export default function PaymentCancelPage() {
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
          <div className="w-20 h-20 bg-red-50 rounded-3xl flex items-center justify-center mx-auto shadow-sm">
            <XCircle className="w-10 h-10 text-red-400" />
          </div>

          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">Paiement annulé</h1>
            <p className="text-slate-500 mt-2 text-sm leading-relaxed">
              Le paiement n'a pas abouti. Aucun montant n'a été débité.
              Vous pouvez réessayer depuis votre espace de facturation.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/dashboard/settings/billing"
              className="inline-flex items-center justify-center gap-2 h-11 px-6 bg-yelha-500 hover:bg-yelha-600 text-white font-semibold rounded-xl text-sm transition-colors shadow-sm shadow-yelha-500/20"
            >
              <RotateCcw className="w-4 h-4" />
              Réessayer le paiement
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center gap-2 h-11 px-6 bg-white hover:bg-slate-50 text-slate-700 font-semibold rounded-xl text-sm transition-colors border border-slate-200"
            >
              <ArrowLeft className="w-4 h-4" />
              Retour au tableau de bord
            </Link>
          </div>

          <p className="text-xs text-slate-400">
            Un problème ?{' '}
            <a href="mailto:cvkdev@outlook.fr" className="text-yelha-600 hover:underline">cvkdev@outlook.fr</a>
            {' '}ou{' '}
            <a href="https://wa.me/33761179379" target="_blank" rel="noopener noreferrer" className="text-yelha-600 hover:underline">WhatsApp +33 7 61 17 93 79</a>
          </p>
        </div>
      </div>
    </div>
  )
}
