'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { AutoStatusBadge } from '@/components/ui/status-badge'
import { formatDA } from '@/lib/algerian/format'
import { Search, Plus, ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'

interface PurchaseOrder {
  id: string
  number: string
  status: string
  supplier: { name: string }
  orderDate: string
  expectedDate?: string
  total?: number | string
  subtotal?: number | string
}

export default function PurchaseOrdersPage() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const limit = 20

  const fetchOrders = async () => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), limit: String(limit) })
    if (search) params.set('search', search)
    const res = await fetch(`/api/purchase-orders?${params}`)
    const data = await res.json()
    setOrders(data.data?.orders ?? data.data ?? [])
    setTotal(data.data?.total ?? 0)
    setLoading(false)
  }

  useEffect(() => { fetchOrders() }, [page, search])
  const totalPages = Math.ceil(total / limit)

  return (
    <div className="p-4 md:p-6 space-y-6">
      <Breadcrumb items={[{ label: 'Achats', href: '/dashboard/purchases/orders' }, { label: 'Bons de commande' }]} />

      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Bons de commande</h1>
        <Link href="/dashboard/purchases/orders/new">
          <Button><Plus className="w-4 h-4 mr-2" />Nouveau BC</Button>
        </Link>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Numéro</th>
              <th className="text-left px-4 py-3 font-medium">Fournisseur</th>
              <th className="text-left px-4 py-3 font-medium">Date</th>
              <th className="text-left px-4 py-3 font-medium">Livraison prévue</th>
              <th className="text-left px-4 py-3 font-medium">Statut</th>
              <th className="text-right px-4 py-3 font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="text-center py-12 text-muted-foreground">Chargement...</td></tr>
            ) : orders.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-12 text-muted-foreground">Aucun bon de commande</td></tr>
            ) : orders.map(order => (
              <tr key={order.id} className="border-t hover:bg-muted/20">
                <td className="px-4 py-3">
                  <Link href={`/dashboard/purchases/orders/${order.id}`} className="font-mono text-primary hover:underline">
                    {order.number}
                  </Link>
                </td>
                <td className="px-4 py-3">{order.supplier.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{new Date(order.orderDate).toLocaleDateString('fr-DZ')}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {order.expectedDate ? new Date(order.expectedDate).toLocaleDateString('fr-DZ') : '—'}
                </td>
                <td className="px-4 py-3"><AutoStatusBadge status={order.status} /></td>
                <td className="px-4 py-3 text-right font-mono da-amount">
                  {order.total ? formatDA(Number(order.total)) : order.subtotal ? formatDA(Number(order.subtotal)) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{total} commande{total > 1 ? 's' : ''}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm py-1.5 px-3 border rounded-md">{page} / {totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
