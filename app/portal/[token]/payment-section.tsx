'use client'

import { useState } from 'react'
import { CreditCard, Building2, CheckCircle, Loader2, MessageCircle, Copy, Check } from 'lucide-react'

const CCP_ACCOUNT = '00799999004399346548'
const WHATSAPP_NUMBER = '+33761179379'

interface Props {
  invoiceId: string
  portalToken: string
  total: number
  invoiceNumber: string
  status: string
}

export function PortalPaymentSection({ invoiceId, portalToken, total, invoiceNumber, status }: Props) {
  const [tab, setTab] = useState<'ccp' | 'chargily'>('chargily')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')

  if (status === 'PAID') {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-6 flex items-center gap-4">
        <CheckCircle className="w-8 h-8 text-green-500 shrink-0" />
        <div>
          <p className="font-semibold text-green-800">Facture payée</p>
          <p className="text-sm text-green-600">Le paiement de cette facture a bien été enregistré.</p>
        </div>
      </div>
    )
  }

  if (status === 'CANCELLED') return null

  const handleChargily = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/chargily?token=${portalToken}`)
      const data = await res.json()
      if (data.checkout_url) {
        window.location.href = data.checkout_url
      } else {
        setError(data.error ?? 'Erreur lors de la création du paiement.')
        setLoading(false)
      }
    } catch {
      setError('Erreur de connexion. Veuillez réessayer.')
      setLoading(false)
    }
  }

  const copyAccount = () => {
    navigator.clipboard.writeText(CCP_ACCOUNT)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const whatsappText = encodeURIComponent(
    `Bonjour, je souhaite envoyer la preuve de paiement pour la facture ${invoiceNumber} (montant : ${total.toLocaleString('fr-DZ')} DA). Numéro de compte CCP : ${CCP_ACCOUNT}`
  )

  return (
    <div className="bg-white rounded-xl border overflow-hidden">
      <div className="px-6 py-4 border-b">
        <h2 className="font-semibold text-gray-800">Payer cette facture</h2>
        <p className="text-sm text-gray-500 mt-0.5">Choisissez votre mode de paiement</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b">
        <button
          onClick={() => setTab('chargily')}
          className={`flex-1 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${tab === 'chargily' ? 'border-b-2 border-yelha-500 text-yelha-600 bg-yelha-50' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <CreditCard className="w-4 h-4" />
          EDAHABIA / CIB
        </button>
        <button
          onClick={() => setTab('ccp')}
          className={`flex-1 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${tab === 'ccp' ? 'border-b-2 border-yelha-500 text-yelha-600 bg-yelha-50' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <Building2 className="w-4 h-4" />
          Virement CCP
        </button>
      </div>

      <div className="p-6">
        {tab === 'chargily' && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Payez en ligne en toute sécurité avec votre carte <strong>EDAHABIA</strong> (Algérie Poste) ou <strong>CIB</strong> (SATIM), via Chargily Pay.
            </p>
            <div className="flex items-center gap-3 text-xs text-gray-500 bg-gray-50 rounded-lg p-3">
              <span className="text-green-500">🔒</span>
              Paiement 100% sécurisé — Chargily Pay est agréé par la Banque d'Algérie
            </div>
            {error && (
              <div className="text-sm text-red-600 bg-red-50 rounded-lg p-3">{error}</div>
            )}
            <button
              onClick={handleChargily}
              disabled={loading}
              className="w-full py-3 px-6 rounded-xl bg-yelha-500 hover:bg-yelha-600 text-white font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" />Redirection en cours...</>
              ) : (
                <><CreditCard className="w-4 h-4" />Payer {total.toLocaleString('fr-DZ')} DA en ligne</>
              )}
            </button>
          </div>
        )}

        {tab === 'ccp' && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Effectuez un virement postal vers le compte CCP suivant, puis envoyez la preuve de paiement par WhatsApp.
            </p>

            {/* CCP Account */}
            <div className="bg-gray-50 rounded-xl p-4 border">
              <p className="text-xs text-gray-500 mb-1">Numéro de compte CCP</p>
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono text-lg font-bold text-gray-800 tracking-wider">{CCP_ACCOUNT}</span>
                <button
                  onClick={copyAccount}
                  className="flex items-center gap-1.5 text-xs text-yelha-600 hover:text-yelha-700 transition-colors shrink-0"
                >
                  {copied ? <><Check className="w-3.5 h-3.5 text-green-500" />Copié</> : <><Copy className="w-3.5 h-3.5" />Copier</>}
                </button>
              </div>
            </div>

            {/* Montant */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm">
              <p className="text-amber-800 font-medium">Montant à virer : <span className="font-bold text-lg">{total.toLocaleString('fr-DZ')} DA</span></p>
              <p className="text-amber-600 text-xs mt-1">Indiquer la référence : <span className="font-mono font-medium">{invoiceNumber}</span></p>
            </div>

            {/* Steps */}
            <ol className="space-y-2 text-sm text-gray-600">
              <li className="flex gap-2"><span className="w-5 h-5 rounded-full bg-yelha-100 text-yelha-700 text-xs font-bold flex items-center justify-center shrink-0">1</span>Effectuez le virement depuis votre bureau de poste ou l'application Baridimob</li>
              <li className="flex gap-2"><span className="w-5 h-5 rounded-full bg-yelha-100 text-yelha-700 text-xs font-bold flex items-center justify-center shrink-0">2</span>Photographiez ou scannez le reçu de virement</li>
              <li className="flex gap-2"><span className="w-5 h-5 rounded-full bg-yelha-100 text-yelha-700 text-xs font-bold flex items-center justify-center shrink-0">3</span>Envoyez la preuve par WhatsApp au numéro ci-dessous</li>
            </ol>

            {/* WhatsApp button */}
            <a
              href={`https://wa.me/${WHATSAPP_NUMBER.replace('+', '')}?text=${whatsappText}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3 px-6 rounded-xl bg-green-500 hover:bg-green-600 text-white font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              Envoyer la preuve par WhatsApp
            </a>
            <p className="text-xs text-center text-gray-400">
              WhatsApp : {WHATSAPP_NUMBER}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
