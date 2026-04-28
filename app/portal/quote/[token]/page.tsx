'use client'

import { useState, useEffect, useRef } from 'react'
import { notFound } from 'next/navigation'
import { formatDA } from '@/lib/algerian/format'
import { TrendingUp, Printer, CheckCircle, XCircle, Send, MessageCircle } from 'lucide-react'

interface QuoteData {
  id: string; number: string; status: string; issueDate: string; expiryDate?: string
  subtotal: number; taxAmount: number; total: number; notes?: string
  client: { name: string; email?: string }
  company: { name: string; nif?: string; address?: string; phone?: string; legalForm?: string; rc?: string }
  lines: { id: string; description: string; quantity: number; unitPrice: number; taxRate: number; total: number }[]
  messages: { id: string; content: string; fromClient: boolean; createdAt: string }[]
}

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Brouillon', SENT: 'En attente', ACCEPTED: 'Accepté',
  REJECTED: 'Refusé', EXPIRED: 'Expiré', CONVERTED: 'Converti',
}
const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700', SENT: 'bg-blue-100 text-blue-700',
  ACCEPTED: 'bg-green-100 text-green-700', REJECTED: 'bg-red-100 text-red-700',
  EXPIRED: 'bg-amber-100 text-amber-700', CONVERTED: 'bg-purple-100 text-purple-700',
}

export default function QuotePortalPage({ params }: { params: { token: string } }) {
  const [quote, setQuote] = useState<QuoteData | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [confirmed, setConfirmed] = useState<'accepted' | 'rejected' | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch(`/api/portal/${params.token}/quotes`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setQuote(d); else setLoading(false) })
      .finally(() => setLoading(false))
  }, [params.token])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [quote?.messages])

  const handleDecision = async (action: 'accept' | 'reject') => {
    if (!quote) return
    setActionLoading(action)
    const res = await fetch(`/api/portal/${params.token}/quotes/${quote.id}/accept`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })
    setActionLoading(null)
    if (res.ok) {
      setConfirmed(action === 'accept' ? 'accepted' : 'rejected')
      setQuote(q => q ? { ...q, status: action === 'accept' ? 'ACCEPTED' : 'REJECTED' } : q)
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim() || !quote) return
    setSending(true)
    const res = await fetch(`/api/portal/${params.token}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: message }),
    })
    setSending(false)
    if (res.ok) {
      const msg = await res.json()
      setQuote(q => q ? { ...q, messages: [...q.messages, msg] } : q)
      setMessage('')
    }
  }

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-500">Chargement...</div>
  if (!quote) return notFound()

  const isExpired = quote.expiryDate && new Date(quote.expiryDate) < new Date()
  const canDecide = quote.status === 'SENT' && !isExpired

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-yelha-500 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-yelha-700">YelhaERP</span>
          </div>
          <a href={`/api/quotes/${quote.id}/pdf`} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 rounded-md border border-gray-200 text-sm hover:bg-gray-50 transition-colors">
            <Printer className="h-4 w-4" />Aperçu
          </a>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {/* Confirmation banner */}
        {confirmed === 'accepted' && (
          <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl">
            <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />
            <div>
              <p className="font-medium text-green-800">Devis accepté</p>
              <p className="text-sm text-green-600">Merci ! Nous avons bien reçu votre accord et allons vous contacter prochainement.</p>
            </div>
          </div>
        )}
        {confirmed === 'rejected' && (
          <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
            <XCircle className="h-5 w-5 text-red-600 shrink-0" />
            <div>
              <p className="font-medium text-red-800">Devis refusé</p>
              <p className="text-sm text-red-600">Votre réponse a été enregistrée. N&apos;hésitez pas à nous contacter pour toute question.</p>
            </div>
          </div>
        )}

        {/* Quote header */}
        <div className="bg-white rounded-xl border p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Devis</p>
              <h1 className="text-3xl font-bold mt-1">{quote.number}</h1>
              <p className="text-gray-500 mt-1">Émis le {new Date(quote.issueDate).toLocaleDateString('fr-DZ')}</p>
              {quote.expiryDate && (
                <p className={`mt-1 text-sm ${isExpired ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                  Valide jusqu&apos;au {new Date(quote.expiryDate).toLocaleDateString('fr-DZ')}
                  {isExpired && ' — Expiré'}
                </p>
              )}
            </div>
            <div className="text-right">
              <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${STATUS_COLORS[quote.status] ?? 'bg-gray-100 text-gray-700'}`}>
                {STATUS_LABELS[quote.status] ?? quote.status}
              </span>
              <p className="text-3xl font-bold text-yelha-600 mt-3 da-amount">{formatDA(Number(quote.total))}</p>
            </div>
          </div>
        </div>

        {/* Decision buttons */}
        {canDecide && (
          <div className="bg-white rounded-xl border p-6">
            <h2 className="font-semibold mb-1">Votre décision</h2>
            <p className="text-sm text-gray-500 mb-4">Acceptez ou refusez ce devis. Vous pouvez également nous envoyer un message ci-dessous.</p>
            <div className="flex gap-3">
              <button
                onClick={() => handleDecision('accept')}
                disabled={!!actionLoading}
                className="flex items-center gap-2 px-6 py-3 rounded-lg bg-green-600 text-white font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                <CheckCircle className="h-4 w-4" />
                {actionLoading === 'accept' ? 'Traitement...' : 'Accepter le devis'}
              </button>
              <button
                onClick={() => handleDecision('reject')}
                disabled={!!actionLoading}
                className="flex items-center gap-2 px-6 py-3 rounded-lg border border-red-200 text-red-700 font-medium hover:bg-red-50 transition-colors disabled:opacity-50"
              >
                <XCircle className="h-4 w-4" />
                {actionLoading === 'reject' ? 'Traitement...' : 'Refuser'}
              </button>
            </div>
          </div>
        )}

        {/* Parties */}
        <div className="grid grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border p-6">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-3">De</p>
            <p className="font-bold text-lg">{quote.company.name}</p>
            {quote.company.legalForm && <p className="text-gray-600 text-sm">{quote.company.legalForm}</p>}
            {quote.company.nif && <p className="text-gray-600 text-sm">NIF : {quote.company.nif}</p>}
            {quote.company.address && <p className="text-gray-500 text-sm">{quote.company.address}</p>}
          </div>
          <div className="bg-white rounded-xl border p-6">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-3">À</p>
            <p className="font-bold text-lg">{quote.client.name}</p>
            {quote.client.email && <p className="text-gray-500 text-sm">{quote.client.email}</p>}
          </div>
        </div>

        {/* Lines */}
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-6 py-4 font-medium text-gray-600">Description</th>
                <th className="text-right px-4 py-4 font-medium text-gray-600">Qté</th>
                <th className="text-right px-4 py-4 font-medium text-gray-600">Prix unitaire</th>
                <th className="text-right px-4 py-4 font-medium text-gray-600">TVA %</th>
                <th className="text-right px-6 py-4 font-medium text-gray-600">Total TTC</th>
              </tr>
            </thead>
            <tbody>
              {quote.lines.map(l => (
                <tr key={l.id} className="border-b last:border-0">
                  <td className="px-6 py-4">{l.description}</td>
                  <td className="px-4 py-4 text-right">{Number(l.quantity)}</td>
                  <td className="px-4 py-4 text-right da-amount">{formatDA(Number(l.unitPrice))}</td>
                  <td className="px-4 py-4 text-right">{Number(l.taxRate)}%</td>
                  <td className="px-6 py-4 text-right da-amount font-medium">{formatDA(Number(l.total))}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50 border-t">
              <tr><td colSpan={4} className="px-6 py-3 text-right text-sm text-gray-500">Sous-total HT</td><td className="px-6 py-3 text-right da-amount">{formatDA(Number(quote.subtotal))}</td></tr>
              <tr><td colSpan={4} className="px-6 py-2 text-right text-sm text-gray-500">TVA</td><td className="px-6 py-2 text-right da-amount">{formatDA(Number(quote.taxAmount))}</td></tr>
              <tr className="font-bold text-yelha-700"><td colSpan={4} className="px-6 py-4 text-right text-base">TOTAL TTC</td><td className="px-6 py-4 text-right da-amount text-lg">{formatDA(Number(quote.total))}</td></tr>
            </tfoot>
          </table>
        </div>

        {/* Notes */}
        {quote.notes && (
          <div className="bg-white rounded-xl border p-6 text-sm text-gray-600">
            <span className="font-medium">Note : </span>{quote.notes}
          </div>
        )}

        {/* Messaging */}
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="px-6 py-4 border-b flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-yelha-600" />
            <h2 className="font-semibold">Messages</h2>
          </div>
          <div className="p-6 space-y-3 max-h-72 overflow-y-auto">
            {quote.messages.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">Aucun message. Envoyez-nous un message ci-dessous.</p>
            ) : (
              quote.messages.map(m => (
                <div key={m.id} className={`flex ${m.fromClient ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] rounded-xl px-4 py-3 text-sm ${
                    m.fromClient ? 'bg-yelha-500 text-white' : 'bg-gray-100 text-gray-800'
                  }`}>
                    <p className="font-medium text-xs opacity-70 mb-1">{m.fromClient ? 'Vous' : quote.company.name}</p>
                    <p>{m.content}</p>
                    <p className="text-[10px] opacity-60 mt-1">{new Date(m.createdAt).toLocaleDateString('fr-DZ')}</p>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
          <div className="px-6 py-4 border-t">
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <input
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Votre message..."
                className="flex-1 rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-yelha-500/30"
              />
              <button type="submit" disabled={sending || !message.trim()}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-yelha-500 text-white text-sm font-medium hover:bg-yelha-600 transition-colors disabled:opacity-50">
                <Send className="h-4 w-4" />{sending ? 'Envoi...' : 'Envoyer'}
              </button>
            </form>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400">Généré par YelhaERP · Accès réservé au destinataire</p>
      </div>
    </div>
  )
}
