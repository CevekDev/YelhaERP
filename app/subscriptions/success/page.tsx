'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import Link from 'next/link'
import { CheckCircle, ArrowRight, MailOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'

function SuccessContent() {
  const params = useSearchParams()
  const method = params.get('method') ?? 'card'
  const plan   = params.get('plan')  ?? ''
  const isCCP  = method === 'ccp'

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-100 p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-6">
          {isCCP
            ? <MailOpen className="h-8 w-8 text-emerald-600" />
            : <CheckCircle className="h-8 w-8 text-emerald-600" />
          }
        </div>

        <h1 className="text-2xl font-bold text-slate-900 mb-3">
          {isCCP ? 'Demande envoyée !' : 'Paiement confirmé !'}
        </h1>

        {isCCP ? (
          <>
            <p className="text-slate-500 text-sm leading-relaxed mb-6">
              Votre demande d'abonnement <strong>{plan}</strong> par virement CCP a bien été reçue.
              Notre équipe vérifiera votre virement et activera votre compte dans les <strong>24–48h</strong>.
            </p>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-left mb-6">
              <p className="text-sm font-semibold text-amber-800 mb-2">Instructions CCP</p>
              <ul className="text-sm text-amber-700 space-y-1">
                <li>• Effectuez le virement au CCP <strong>1234567890</strong></li>
                <li>• Mentionnez votre email comme référence</li>
                <li>• Envoyez le reçu à <a href="mailto:cvkdev@outlook.fr" className="underline">cvkdev@outlook.fr</a></li>
              </ul>
            </div>
          </>
        ) : (
          <p className="text-slate-500 text-sm leading-relaxed mb-6">
            Votre abonnement <strong>{plan}</strong> est maintenant actif.
            Vous pouvez accéder à toutes les fonctionnalités de YelhaERP.
          </p>
        )}

        <div className="space-y-3">
          <Button asChild className="w-full bg-emerald-600 hover:bg-emerald-700">
            <Link href="/dashboard">
              Accéder au dashboard <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
          <Button asChild variant="outline" className="w-full">
            <Link href="/">Retour à l'accueil</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function SubscriptionSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-slate-400">Chargement…</div>}>
      <SuccessContent />
    </Suspense>
  )
}
