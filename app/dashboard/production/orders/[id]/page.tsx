'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { StatusBar } from '@/components/ui/status-bar'
import { AutoStatusBadge } from '@/components/ui/status-badge'
import { useParams } from 'next/navigation'

interface ProductionOrder {
  id: string
  number: string
  status: string
  plannedQty: number | string
  producedQty: number | string
  scheduledStart?: string
  scheduledEnd?: string
  actualStart?: string
  notes?: string
  bom: {
    name: string
    version: string
    yieldQty: number | string
    product: { name: string; sku?: string }
    components: { id: string; quantity: number; unit?: string; product: { name: string; sku?: string } }[]
  }
  consumptions: { id: string; productId: string; quantity: number }[]
}

const PRODUCTION_STEPS = ['DRAFT', 'CONFIRMED', 'IN_PROGRESS', 'DONE']

export default function ProductionOrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [order, setOrder] = useState<ProductionOrder | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchOrder = async () => {
    const res = await fetch(`/api/production/orders/${id}`)
    const data = await res.json()
    setOrder(data.data)
    setLoading(false)
  }

  useEffect(() => { fetchOrder() }, [id])

  const confirm = async () => {
    await fetch(`/api/production/orders/${id}/confirm`, { method: 'POST' })
    fetchOrder()
  }

  const start = async () => {
    await fetch(`/api/production/orders/${id}/start`, { method: 'POST' })
    fetchOrder()
  }

  if (loading) return <div className="p-6 text-muted-foreground">Chargement...</div>
  if (!order) return <div className="p-6 text-muted-foreground">Ordre introuvable</div>

  return (
    <div className="p-4 md:p-6 space-y-6">
      <Breadcrumb items={[
        { label: 'Production', href: '/dashboard/production/bom' },
        { label: 'Ordres', href: '/dashboard/production/orders' },
        { label: order.number },
      ]} />

      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">OF — {order.number}</h1>
          <p className="text-muted-foreground">{order.bom.product.sku ?? order.bom.product.name} — {order.bom.product.name}</p>
        </div>
        <div className="flex gap-2">
          {order.status === 'DRAFT' && <Button onClick={confirm}>Confirmer</Button>}
          {order.status === 'CONFIRMED' && <Button onClick={start}>Démarrer la production</Button>}
          <AutoStatusBadge status={order.status} />
        </div>
      </div>

      <StatusBar steps={PRODUCTION_STEPS} current={['CANCELLED', 'DONE'].includes(order.status) ? order.status : order.status} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="border rounded-lg p-4 space-y-4 bg-card">
          <h2 className="font-semibold">Détails de l'ordre</h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-xs text-muted-foreground">BOM</div>
              <div className="font-medium">{order.bom.name} v{order.bom.version}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Qté planifiée</div>
              <div className="font-medium font-mono">{Number(order.plannedQty)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Qté produite</div>
              <div className="font-medium font-mono">{Number(order.producedQty)}</div>
            </div>
            {order.scheduledStart && (
              <div>
                <div className="text-xs text-muted-foreground">Début prévu</div>
                <div className="font-medium">{new Date(order.scheduledStart).toLocaleDateString('fr-DZ')}</div>
              </div>
            )}
            {order.scheduledEnd && (
              <div>
                <div className="text-xs text-muted-foreground">Fin prévue</div>
                <div className="font-medium">{new Date(order.scheduledEnd).toLocaleDateString('fr-DZ')}</div>
              </div>
            )}
            {order.actualStart && (
              <div>
                <div className="text-xs text-muted-foreground">Démarré le</div>
                <div className="font-medium">{new Date(order.actualStart).toLocaleDateString('fr-DZ')}</div>
              </div>
            )}
          </div>
          {order.notes && <div className="text-sm text-muted-foreground border-t pt-3">{order.notes}</div>}
        </div>

        <div className="border rounded-lg overflow-hidden bg-card">
          <div className="px-4 py-3 border-b font-semibold bg-muted/30">Composants requis (pour {Number(order.plannedQty)} unités)</div>
          <table className="w-full text-sm">
            <thead className="bg-muted/20">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Composant</th>
                <th className="text-right px-4 py-2 font-medium">Qté/unité</th>
                <th className="text-right px-4 py-2 font-medium">Total requis</th>
              </tr>
            </thead>
            <tbody>
              {order.bom.components.map((c, i) => (
                <tr key={c.id} className={`border-t ${i % 2 === 1 ? 'bg-muted/10' : ''}`}>
                  <td className="px-4 py-2">
                    <div className="font-medium">{c.product.sku ?? c.product.name}</div>
                    <div className="text-xs text-muted-foreground">{c.product.name}</div>
                  </td>
                  <td className="px-4 py-2 text-right font-mono">{Number(c.quantity)} {c.unit ?? 'u'}</td>
                  <td className="px-4 py-2 text-right font-mono font-medium">
                    {(Number(c.quantity) * Number(order.plannedQty)).toFixed(3)} {c.unit ?? 'u'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
