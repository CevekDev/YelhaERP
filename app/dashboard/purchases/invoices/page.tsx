'use client'

import { useState, useEffect } from 'react'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { AutoStatusBadge } from '@/components/ui/status-badge'
import { formatDA } from '@/lib/algerian/format'
import { FileText } from 'lucide-react'
import Link from 'next/link'

interface SupplierInvoice {
  id: string
  number: string
  status: string
  invoiceDate: string
  dueDate?: string
  total: number | string
  supplier: { name: string }
  matchingStatus: string
}

const MATCHING_COLORS: Record<string, string> = {
  UNMATCHED: 'bg-slate-100 text-slate-600',
  PARTIAL: 'bg-amber-100 text-amber-700',
  MATCHED: 'bg-green-100 text-green-700',
}

export default function SupplierInvoicesPage() {
  const [invoices, setInvoices] = useState<SupplierInvoice[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/supplier-invoices').then(r => r.json()).then(d => {
      setInvoices(d.data ?? [])
      setLoading(false)
    })
  }, [])

  return (
    <div className="p-4 md:p-6 space-y-6">
      <Breadcrumb items={[{ label: 'Achats', href: '/dashboard/purchases/orders' }, { label: 'Factures fournisseurs' }]} />

      <h1 className="text-2xl font-bold">Factures fournisseurs</h1>

      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Numéro</th>
              <th className="text-left px-4 py-3 font-medium">Fournisseur</th>
              <th className="text-left px-4 py-3 font-medium">Date</th>
              <th className="text-left px-4 py-3 font-medium">Échéance</th>
              <th className="text-left px-4 py-3 font-medium">Rapprochement</th>
              <th className="text-left px-4 py-3 font-medium">Statut</th>
              <th className="text-right px-4 py-3 font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="text-center py-12 text-muted-foreground">Chargement...</td></tr>
            ) : invoices.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-12 text-muted-foreground">
                <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
                Aucune facture fournisseur
              </td></tr>
            ) : invoices.map(inv => (
              <tr key={inv.id} className="border-t hover:bg-muted/20">
                <td className="px-4 py-3">
                  <Link href={`/dashboard/purchases/invoices/${inv.id}/matching`} className="font-mono text-xs text-primary hover:underline">
                    {inv.number}
                  </Link>
                </td>
                <td className="px-4 py-3">{inv.supplier.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{new Date(inv.invoiceDate).toLocaleDateString('fr-DZ')}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString('fr-DZ') : '—'}
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${MATCHING_COLORS[inv.matchingStatus] ?? ''}`}>
                    {inv.matchingStatus === 'UNMATCHED' ? 'Non rapproché' : inv.matchingStatus === 'PARTIAL' ? 'Partiel' : 'Rapproché'}
                  </span>
                </td>
                <td className="px-4 py-3"><AutoStatusBadge status={inv.status} /></td>
                <td className="px-4 py-3 text-right font-mono da-amount">{formatDA(Number(inv.total))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
