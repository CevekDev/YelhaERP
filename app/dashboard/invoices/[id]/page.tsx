'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { formatDA } from '@/lib/algerian/format'
import { toast } from 'sonner'
import { ArrowLeft, Download, Send, Link as LinkIcon, Loader2 } from 'lucide-react'
import Link from 'next/link'

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Brouillon', SENT: 'Envoyée', PAID: 'Payée',
  PARTIAL: 'Partielle', OVERDUE: 'En retard', CANCELLED: 'Annulée',
}
const STATUS_VARIANTS: Record<string, 'secondary' | 'info' | 'success' | 'warning' | 'destructive' | 'outline'> = {
  DRAFT: 'secondary', SENT: 'info', PAID: 'success',
  PARTIAL: 'warning', OVERDUE: 'destructive', CANCELLED: 'outline',
}

interface InvoiceFull {
  id: string; number: string; type: string; status: string
  issueDate: string; dueDate?: string; subtotal: number; taxAmount: number; total: number
  currency: string; notes?: string; portalToken?: string
  client: { name: string; email?: string; phone?: string; address?: string; nif?: string }
  company: { name: string; nif?: string; address?: string; phone?: string; email?: string; legalForm?: string }
  lines: { id: string; description: string; quantity: number; unitPrice: number; taxRate: number; total: number }[]
}

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [invoice, setInvoice] = useState<InvoiceFull | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    fetch(`/api/invoices/${id}`).then(r => r.json()).then(setInvoice).finally(() => setLoading(false))
  }, [id])

  const updateStatus = async (status: string) => {
    setUpdating(true)
    const res = await fetch(`/api/invoices/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    setUpdating(false)
    if (res.ok) { const d = await res.json(); setInvoice(prev => prev ? { ...prev, status: d.status } : prev); toast.success('Statut mis à jour') }
    else toast.error('Erreur lors de la mise à jour')
  }

  const generatePortalLink = async () => {
    const res = await fetch(`/api/invoices/${id}/portal`, { method: 'POST' })
    if (res.ok) {
      const d = await res.json()
      const url = `${window.location.origin}${d.url}`
      navigator.clipboard.writeText(url)
      toast.success('Lien portail copié !')
    }
  }

  const downloadPDF = () => {
    window.open(`/api/invoices/${id}/pdf`, '_blank')
  }

  if (loading) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin text-yelha-500" /></div>
  if (!invoice) return <div className="p-6 text-muted-foreground">Facture introuvable</div>

  return (
    <div>
      <Header title={`Facture ${invoice.number}`} />
      <div className="p-6 max-w-4xl space-y-6">
        {/* Actions */}
        <div className="flex items-center gap-3">
          <Link href="/dashboard/invoices"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <Badge variant={STATUS_VARIANTS[invoice.status]}>{STATUS_LABELS[invoice.status]}</Badge>
          <div className="flex-1" />
          <Button variant="outline" size="sm" onClick={generatePortalLink}><LinkIcon className="h-4 w-4 mr-2" />Lien client</Button>
          <Button variant="outline" size="sm" onClick={downloadPDF}><Download className="h-4 w-4 mr-2" />PDF</Button>
          {invoice.status === 'DRAFT' && (
            <Button size="sm" onClick={() => updateStatus('SENT')} disabled={updating}>
              <Send className="h-4 w-4 mr-2" />Envoyer
            </Button>
          )}
          {invoice.status === 'SENT' && (
            <Button size="sm" variant="default" onClick={() => updateStatus('PAID')} disabled={updating}>
              Marquer payée
            </Button>
          )}
        </div>

        {/* En-tête facture */}
        <Card>
          <CardContent className="p-6 grid grid-cols-2 gap-6">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Émetteur</p>
              <p className="font-bold mt-1">{invoice.company.name}</p>
              {invoice.company.legalForm && <p className="text-sm text-muted-foreground">{invoice.company.legalForm}</p>}
              {invoice.company.nif && <p className="text-sm">NIF : {invoice.company.nif}</p>}
              {invoice.company.address && <p className="text-sm text-muted-foreground">{invoice.company.address}</p>}
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Facturé à</p>
              <p className="font-bold mt-1">{invoice.client.name}</p>
              {invoice.client.nif && <p className="text-sm">NIF : {invoice.client.nif}</p>}
              {invoice.client.address && <p className="text-sm text-muted-foreground">{invoice.client.address}</p>}
            </div>
            <div>
              <p className="text-xs text-muted-foreground">N° {invoice.number}</p>
              <p className="text-xs text-muted-foreground">Émise le {new Date(invoice.issueDate).toLocaleDateString('fr-DZ')}</p>
              {invoice.dueDate && <p className="text-xs text-muted-foreground">Échéance {new Date(invoice.dueDate).toLocaleDateString('fr-DZ')}</p>}
            </div>
          </CardContent>
        </Card>

        {/* Lignes */}
        <Card>
          <CardHeader><CardTitle className="text-base">Détail des prestations</CardTitle></CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Description</th>
                  <th className="text-right px-4 py-3 font-medium">Qté</th>
                  <th className="text-right px-4 py-3 font-medium">P.U.</th>
                  <th className="text-right px-4 py-3 font-medium">TVA</th>
                  <th className="text-right px-4 py-3 font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {invoice.lines.map(line => (
                  <tr key={line.id} className="border-b last:border-0">
                    <td className="px-4 py-3">{line.description}</td>
                    <td className="px-4 py-3 text-right da-amount">{Number(line.quantity)}</td>
                    <td className="px-4 py-3 text-right da-amount">{formatDA(Number(line.unitPrice))}</td>
                    <td className="px-4 py-3 text-right">{Number(line.taxRate)}%</td>
                    <td className="px-4 py-3 text-right da-amount font-medium">{formatDA(Number(line.total))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="p-4 flex flex-col items-end gap-1 border-t da-amount">
              <div className="flex justify-between w-52 text-sm">
                <span className="text-muted-foreground">Sous-total HT</span>
                <span>{formatDA(Number(invoice.subtotal))}</span>
              </div>
              <div className="flex justify-between w-52 text-sm">
                <span className="text-muted-foreground">TVA 19%</span>
                <span>{formatDA(Number(invoice.taxAmount))}</span>
              </div>
              <Separator className="w-52 my-1" />
              <div className="flex justify-between w-52 text-lg font-bold">
                <span>Total TTC</span>
                <span className="text-yelha-600">{formatDA(Number(invoice.total))}</span>
              </div>
            </div>
            {invoice.notes && (
              <div className="px-4 pb-4 text-sm text-muted-foreground border-t pt-3">
                <span className="font-medium">Note : </span>{invoice.notes}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
