'use client'

import { useState, useEffect } from 'react'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { formatDA } from '@/lib/algerian/format'
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { useParams } from 'next/navigation'

interface MatchingData {
  invoice: {
    id: string
    number: string
    invoiceDate: string
    total: number
    supplier: { name: string }
    lines: { description: string; quantity: number; unitPrice: number; total: number }[]
  }
  purchaseOrder?: {
    number: string
    lines: { description: string; quantity: number; unitPrice: number }[]
  }
  goodsReceipt?: {
    number: string
    receivedDate: string
    lines: { description: string; orderedQty: number; receivedQty: number; unitCost: number }[]
  }
}

export default function InvoiceMatchingPage() {
  const { id } = useParams<{ id: string }>()
  const [data, setData] = useState<MatchingData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/supplier-invoices/${id}/matching`).then(r => r.json()).then(d => {
      setData(d.data)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [id])

  if (loading) return <div className="p-6 text-muted-foreground">Chargement...</div>
  if (!data) return <div className="p-6 text-muted-foreground">Données introuvables</div>

  return (
    <div className="p-4 md:p-6 space-y-6">
      <Breadcrumb items={[
        { label: 'Achats', href: '/dashboard/purchases/orders' },
        { label: 'Factures', href: '/dashboard/purchases/invoices' },
        { label: `Rapprochement — ${data.invoice.number}` },
      ]} />

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Rapprochement 3 voies</h1>
        <div className="text-sm text-muted-foreground">{data.invoice.supplier.name}</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="border rounded-lg overflow-hidden">
          <div className="bg-blue-50 px-4 py-3 border-b flex items-center gap-2">
            <span className="font-semibold text-blue-800">Bon de commande</span>
            {data.purchaseOrder ? <CheckCircle className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-red-400" />}
          </div>
          {data.purchaseOrder ? (
            <table className="w-full text-xs">
              <thead className="bg-muted/20">
                <tr>
                  <th className="text-left px-3 py-2">Article</th>
                  <th className="text-right px-3 py-2">Qté</th>
                  <th className="text-right px-3 py-2">PU</th>
                </tr>
              </thead>
              <tbody>
                {data.purchaseOrder.lines.map((l, i) => (
                  <tr key={i} className="border-t">
                    <td className="px-3 py-1.5 text-muted-foreground">{l.description}</td>
                    <td className="px-3 py-1.5 text-right">{l.quantity}</td>
                    <td className="px-3 py-1.5 text-right da-amount">{formatDA(l.unitPrice)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-8 text-muted-foreground text-sm">Aucun BC associé</div>
          )}
        </div>

        <div className="border rounded-lg overflow-hidden">
          <div className="bg-amber-50 px-4 py-3 border-b flex items-center gap-2">
            <span className="font-semibold text-amber-800">Réception</span>
            {data.goodsReceipt ? <CheckCircle className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-red-400" />}
          </div>
          {data.goodsReceipt ? (
            <table className="w-full text-xs">
              <thead className="bg-muted/20">
                <tr>
                  <th className="text-left px-3 py-2">Article</th>
                  <th className="text-right px-3 py-2">Commandé</th>
                  <th className="text-right px-3 py-2">Reçu</th>
                </tr>
              </thead>
              <tbody>
                {data.goodsReceipt.lines.map((l, i) => {
                  const ok = Number(l.receivedQty) >= Number(l.orderedQty)
                  return (
                    <tr key={i} className="border-t">
                      <td className="px-3 py-1.5 text-muted-foreground">{l.description}</td>
                      <td className="px-3 py-1.5 text-right">{Number(l.orderedQty)}</td>
                      <td className={`px-3 py-1.5 text-right font-medium ${ok ? 'text-green-600' : 'text-red-600'}`}>
                        {Number(l.receivedQty)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-8 text-muted-foreground text-sm">Aucune réception associée</div>
          )}
        </div>

        <div className="border rounded-lg overflow-hidden">
          <div className="bg-green-50 px-4 py-3 border-b flex items-center gap-2">
            <span className="font-semibold text-green-800">Facture fournisseur</span>
            <CheckCircle className="w-4 h-4 text-green-500" />
          </div>
          <table className="w-full text-xs">
            <thead className="bg-muted/20">
              <tr>
                <th className="text-left px-3 py-2">Article</th>
                <th className="text-right px-3 py-2">Qté</th>
                <th className="text-right px-3 py-2">Total</th>
              </tr>
            </thead>
            <tbody>
              {data.invoice.lines.map((l, i) => (
                <tr key={i} className="border-t">
                  <td className="px-3 py-1.5 text-muted-foreground">{l.description}</td>
                  <td className="px-3 py-1.5 text-right">{Number(l.quantity)}</td>
                  <td className="px-3 py-1.5 text-right da-amount">{formatDA(Number(l.total))}</td>
                </tr>
              ))}
              <tr className="border-t bg-green-50/50 font-medium">
                <td colSpan={2} className="px-3 py-2 text-green-800">Total facture</td>
                <td className="px-3 py-2 text-right text-green-800 da-amount">{formatDA(data.invoice.total)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-card border rounded-lg p-4">
        <h2 className="font-semibold mb-3 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />Résultat du rapprochement
        </h2>
        <div className="flex gap-6 text-sm">
          <div className="flex items-center gap-2">
            {data.purchaseOrder ? <CheckCircle className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-red-400" />}
            BC lié
          </div>
          <div className="flex items-center gap-2">
            {data.goodsReceipt ? <CheckCircle className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-red-400" />}
            Réception liée
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-500" />
            Facture présente
          </div>
        </div>
      </div>
    </div>
  )
}
