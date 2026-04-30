'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { AutoStatusBadge } from '@/components/ui/status-badge'
import { Package } from 'lucide-react'

interface Receipt {
  id: string
  number: string
  status: string
  receivedDate: string
  purchaseOrder: { number: string; supplier: { name: string } }
  lines: { id: string; description: string; orderedQty: number; receivedQty: number }[]
}

export default function ReceiptsPage() {
  const [receipts, setReceipts] = useState<Receipt[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/goods-receipts').then(r => r.json()).then(d => {
      setReceipts(d.data ?? [])
      setLoading(false)
    })
  }, [])

  return (
    <div className="p-4 md:p-6 space-y-6">
      <Breadcrumb items={[{ label: 'Achats', href: '/dashboard/purchases/orders' }, { label: 'Réceptions' }]} />

      <h1 className="text-2xl font-bold">Réceptions de marchandises</h1>

      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Numéro</th>
              <th className="text-left px-4 py-3 font-medium">BC associé</th>
              <th className="text-left px-4 py-3 font-medium">Fournisseur</th>
              <th className="text-left px-4 py-3 font-medium">Date réception</th>
              <th className="text-left px-4 py-3 font-medium">Lignes</th>
              <th className="text-left px-4 py-3 font-medium">Statut</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="text-center py-12 text-muted-foreground">Chargement...</td></tr>
            ) : receipts.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-12 text-muted-foreground">
                <Package className="w-8 h-8 mx-auto mb-2 opacity-30" />
                Aucune réception
              </td></tr>
            ) : receipts.map(r => (
              <tr key={r.id} className="border-t hover:bg-muted/20">
                <td className="px-4 py-3 font-mono text-xs">{r.number}</td>
                <td className="px-4 py-3 font-mono text-xs">{r.purchaseOrder?.number ?? '—'}</td>
                <td className="px-4 py-3">{r.purchaseOrder?.supplier?.name ?? '—'}</td>
                <td className="px-4 py-3 text-muted-foreground">{new Date(r.receivedDate).toLocaleDateString('fr-DZ')}</td>
                <td className="px-4 py-3 text-muted-foreground">{r.lines.length} ligne{r.lines.length > 1 ? 's' : ''}</td>
                <td className="px-4 py-3"><AutoStatusBadge status={r.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
