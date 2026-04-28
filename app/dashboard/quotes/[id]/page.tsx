'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { formatDA } from '@/lib/algerian/format'
import { toast } from 'sonner'
import { ArrowLeft, FileText, Send, CheckCircle, XCircle, Printer, Loader2, Copy, ExternalLink } from 'lucide-react'
import Link from 'next/link'

interface QuoteLine { id: string; description: string; quantity: number; unitPrice: number; taxRate: number; total: number }
interface Quote {
  id: string; number: string; status: string; issueDate: string; expiryDate?: string
  subtotal: number; taxAmount: number; total: number; notes?: string; portalToken?: string
  client: { id: string; name: string; email?: string; phone?: string; address?: string }
  lines: QuoteLine[]
  invoice?: { id: string; number: string }
}

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Brouillon', SENT: 'Envoyé', ACCEPTED: 'Accepté',
  REJECTED: 'Refusé', EXPIRED: 'Expiré', CONVERTED: 'Converti',
}
const STATUS_VARIANTS: Record<string, 'secondary' | 'info' | 'success' | 'destructive' | 'warning' | 'default'> = {
  DRAFT: 'secondary', SENT: 'info', ACCEPTED: 'success',
  REJECTED: 'destructive', EXPIRED: 'warning', CONVERTED: 'default',
}

export default function QuoteDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [quote, setQuote] = useState<Quote | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [portalUrl, setPortalUrl] = useState<string | null>(null)

  const fetchQuote = useCallback(async () => {
    const res = await fetch(`/api/quotes/${id}`)
    if (res.ok) setQuote(await res.json())
    else toast.error('Devis introuvable')
    setLoading(false)
  }, [id])

  useEffect(() => { fetchQuote() }, [fetchQuote])

  const handleSend = async () => {
    setActionLoading('send')
    const res = await fetch(`/api/quotes/${id}/send`, { method: 'POST' })
    setActionLoading(null)
    if (!res.ok) { toast.error('Erreur lors de l\'envoi'); return }
    const d = await res.json()
    setPortalUrl(d.portalUrl)
    toast.success('Devis marqué comme envoyé')
    fetchQuote()
  }

  const handleConvert = async () => {
    setActionLoading('convert')
    const res = await fetch(`/api/quotes/${id}/convert`, { method: 'POST' })
    setActionLoading(null)
    if (!res.ok) { const e = await res.json(); toast.error(e.error ?? 'Erreur'); return }
    const inv = await res.json()
    toast.success('Facture créée !')
    router.push(`/dashboard/invoices/${inv.id}`)
  }

  const handleStatusChange = async (status: 'ACCEPTED' | 'REJECTED') => {
    setActionLoading(status)
    const res = await fetch(`/api/quotes/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    setActionLoading(null)
    if (!res.ok) { toast.error('Erreur'); return }
    toast.success(status === 'ACCEPTED' ? 'Devis accepté' : 'Devis refusé')
    fetchQuote()
  }

  if (loading) return <div className="p-6"><Loader2 className="h-6 w-6 animate-spin" /></div>
  if (!quote) return null

  const canSend = ['DRAFT', 'REJECTED', 'EXPIRED'].includes(quote.status)
  const canAcceptReject = quote.status === 'SENT'
  const canConvert = ['ACCEPTED', 'SENT'].includes(quote.status)

  return (
    <div>
      <Header title={`Devis ${quote.number}`} />
      <div className="p-6 max-w-5xl space-y-4">
        {/* Top bar */}
        <div className="flex items-center gap-3">
          <Link href="/dashboard/quotes"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <h2 className="text-2xl font-bold flex-1">{quote.number}</h2>
          <Badge variant={STATUS_VARIANTS[quote.status]}>{STATUS_LABELS[quote.status]}</Badge>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          <a href={`/api/quotes/${id}/pdf`} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm" className="gap-2">
              <Printer className="h-4 w-4" />Aperçu PDF
            </Button>
          </a>
          {canSend && (
            <Button size="sm" className="gap-2" onClick={handleSend} disabled={actionLoading === 'send'}>
              {actionLoading === 'send' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Marquer comme envoyé
            </Button>
          )}
          {canAcceptReject && (
            <>
              <Button size="sm" variant="outline" className="gap-2 border-green-300 text-green-700 hover:bg-green-50"
                onClick={() => handleStatusChange('ACCEPTED')} disabled={!!actionLoading}>
                {actionLoading === 'ACCEPTED' ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                Accepté
              </Button>
              <Button size="sm" variant="outline" className="gap-2 border-red-300 text-red-700 hover:bg-red-50"
                onClick={() => handleStatusChange('REJECTED')} disabled={!!actionLoading}>
                {actionLoading === 'REJECTED' ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                Refusé
              </Button>
            </>
          )}
          {canConvert && (
            <Button size="sm" className="gap-2 bg-yelha-600 hover:bg-yelha-700" onClick={handleConvert} disabled={actionLoading === 'convert'}>
              {actionLoading === 'convert' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
              Convertir en facture
            </Button>
          )}
        </div>

        {/* Portal URL */}
        {(portalUrl ?? quote.portalToken) && (
          <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200 text-sm">
            <ExternalLink className="h-4 w-4 text-blue-600 shrink-0" />
            <span className="text-blue-700 font-medium">Lien portail client :</span>
            <code className="flex-1 text-blue-800 truncate text-xs">{portalUrl ?? `${window.location.origin}/portal/quote/${quote.portalToken}`}</code>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
              navigator.clipboard.writeText(portalUrl ?? `${window.location.origin}/portal/quote/${quote.portalToken}`)
              toast.success('Lien copié !')
            }}>
              <Copy className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}

        {/* Linked invoice */}
        {quote.invoice && (
          <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg border border-green-200 text-sm">
            <FileText className="h-4 w-4 text-green-600 shrink-0" />
            <span className="text-green-700">Converti en facture</span>
            <Link href={`/dashboard/invoices/${quote.invoice.id}`} className="font-semibold text-green-800 hover:underline">
              {quote.invoice.number}
            </Link>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          {/* Client */}
          <Card>
            <CardHeader><CardTitle className="text-sm text-muted-foreground uppercase tracking-wide">Client</CardTitle></CardHeader>
            <CardContent className="space-y-1">
              <Link href={`/dashboard/clients/${quote.client.id}`} className="font-semibold hover:underline text-yelha-600">
                {quote.client.name}
              </Link>
              {quote.client.email && <p className="text-sm text-muted-foreground">{quote.client.email}</p>}
              {quote.client.phone && <p className="text-sm text-muted-foreground">{quote.client.phone}</p>}
              {quote.client.address && <p className="text-sm text-muted-foreground">{quote.client.address}</p>}
            </CardContent>
          </Card>

          {/* Dates */}
          <Card>
            <CardHeader><CardTitle className="text-sm text-muted-foreground uppercase tracking-wide">Informations</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Date d&apos;émission</span>
                <span>{new Date(quote.issueDate).toLocaleDateString('fr-DZ')}</span>
              </div>
              {quote.expiryDate && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Expiration</span>
                  <span className={new Date(quote.expiryDate) < new Date() && quote.status !== 'CONVERTED' ? 'text-red-600 font-medium' : ''}>
                    {new Date(quote.expiryDate).toLocaleDateString('fr-DZ')}
                  </span>
                </div>
              )}
              {quote.notes && (
                <div className="pt-2 border-t">
                  <span className="text-muted-foreground">Notes : </span>{quote.notes}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Lines */}
        <Card>
          <CardHeader><CardTitle className="text-base">Lignes du devis</CardTitle></CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-slate-50">
                  <th className="text-left p-3 font-medium">Description</th>
                  <th className="text-right p-3 font-medium">Qté</th>
                  <th className="text-right p-3 font-medium">P.U.</th>
                  <th className="text-right p-3 font-medium">TVA %</th>
                  <th className="text-right p-3 font-medium">Total TTC</th>
                </tr>
              </thead>
              <tbody>
                {quote.lines.map(l => (
                  <tr key={l.id} className="border-b last:border-0">
                    <td className="p-3">{l.description}</td>
                    <td className="p-3 text-right">{Number(l.quantity)}</td>
                    <td className="p-3 text-right da-amount">{formatDA(Number(l.unitPrice))}</td>
                    <td className="p-3 text-right">{Number(l.taxRate)}%</td>
                    <td className="p-3 text-right da-amount">{formatDA(Number(l.total))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Separator />
            <div className="p-4 flex flex-col items-end gap-1 da-amount">
              <div className="flex justify-between w-52 text-sm">
                <span className="text-muted-foreground">Sous-total HT</span>
                <span>{formatDA(Number(quote.subtotal))}</span>
              </div>
              <div className="flex justify-between w-52 text-sm">
                <span className="text-muted-foreground">TVA</span>
                <span>{formatDA(Number(quote.taxAmount))}</span>
              </div>
              <div className="flex justify-between w-52 font-bold text-lg mt-1 pt-1 border-t">
                <span>Total TTC</span>
                <span className="text-yelha-600">{formatDA(Number(quote.total))}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
