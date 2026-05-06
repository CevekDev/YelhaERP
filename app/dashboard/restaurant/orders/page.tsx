'use client'

import { useState, useEffect, useCallback } from 'react'
import { formatDA } from '@/lib/algerian/format'
import { toast } from 'sonner'
import {
  Loader2, UtensilsCrossed, Package, Bike, ChevronRight,
  X, List, LayoutGrid, Clock,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { PageHeader } from '@/components/ui/page-header'

// ── Types ──────────────────────────────────────────────────────────────────────
type OrderType = 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY'
type OrderStatus =
  | 'PENDING' | 'ACCEPTED' | 'PREPARING' | 'READY' | 'DELIVERED' | 'CANCELLED'

type OrderItem = { id: string; name: string; quantity: number }
type Order = {
  id: string
  number: string
  type: OrderType
  status: OrderStatus
  tableNumber?: string | null
  customerName?: string | null
  total: number
  createdAt: string
  items: OrderItem[]
}

// ── Helpers ────────────────────────────────────────────────────────────────────
const TYPE_ICONS: Record<OrderType, React.ReactNode> = {
  DINE_IN:  <UtensilsCrossed className="h-3.5 w-3.5" />,
  TAKEAWAY: <Package className="h-3.5 w-3.5" />,
  DELIVERY: <Bike className="h-3.5 w-3.5" />,
}
const TYPE_LABELS: Record<OrderType, string> = {
  DINE_IN:  'Sur place',
  TAKEAWAY: 'Emporter',
  DELIVERY: 'Livraison',
}
const STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING:   'En attente',
  ACCEPTED:  'Accepté',
  PREPARING: 'En préparation',
  READY:     'Prêt',
  DELIVERED: 'Livré',
  CANCELLED: 'Annulé',
}
const STATUS_BADGE: Record<OrderStatus, string> = {
  PENDING:   'bg-yellow-100 text-yellow-800',
  ACCEPTED:  'bg-blue-100 text-blue-800',
  PREPARING: 'bg-purple-100 text-purple-800',
  READY:     'bg-green-100 text-green-800',
  DELIVERED: 'bg-gray-100 text-gray-600',
  CANCELLED: 'bg-red-100 text-red-600',
}

const NEXT_STATUS: Record<OrderStatus, OrderStatus | null> = {
  PENDING:   'ACCEPTED',
  ACCEPTED:  'PREPARING',
  PREPARING: 'READY',
  READY:     'DELIVERED',
  DELIVERED: null,
  CANCELLED: null,
}
const NEXT_LABEL: Record<OrderStatus, string> = {
  PENDING:   'Accepter',
  ACCEPTED:  'En préparation',
  PREPARING: 'Prêt',
  READY:     'Livré',
  DELIVERED: '',
  CANCELLED: '',
}

const COLUMNS: { id: string; label: string; statuses: OrderStatus[] }[] = [
  { id: 'pending',    label: 'En attente',         statuses: ['PENDING', 'ACCEPTED'] },
  { id: 'preparing',  label: 'En préparation',     statuses: ['PREPARING'] },
  { id: 'ready',      label: 'Prêt / Livraison',   statuses: ['READY', 'DELIVERED'] },
]

function elapsedMin(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
}
function elapsedLabel(iso: string) {
  const m = elapsedMin(iso)
  if (m < 60) return `${m} min`
  return `${Math.floor(m / 60)}h${String(m % 60).padStart(2, '0')}`
}
function elapsedColor(iso: string) {
  const m = elapsedMin(iso)
  if (m < 10) return 'text-green-600'
  if (m < 20) return 'text-orange-500'
  return 'text-red-600'
}

// ── Component ──────────────────────────────────────────────────────────────────
export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'kanban' | 'table'>('kanban')
  const [filterType, setFilterType] = useState<string>('ALL')
  const [filterStatus, setFilterStatus] = useState<string>('ALL')
  const [advancing, setAdvancing] = useState<string | null>(null)
  const [cancelling, setCancelling] = useState<string | null>(null)

  const fetchOrders = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true)
    try {
      const res = await fetch('/api/restaurant/orders?status=active')
      const data = await res.json()
      setOrders(data.data ?? [])
    } catch {
      if (!quiet) toast.error('Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchOrders() }, [fetchOrders])

  // Poll every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => fetchOrders(true), 10000)
    return () => clearInterval(interval)
  }, [fetchOrders])

  async function advanceOrder(order: Order) {
    const next = NEXT_STATUS[order.status]
    if (!next) return
    setAdvancing(order.id)
    try {
      const res = await fetch(`/api/restaurant/orders/${order.id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      })
      if (!res.ok) { toast.error('Erreur'); return }
      toast.success(`Commande ${order.number} → ${STATUS_LABELS[next]}`)
      fetchOrders(true)
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setAdvancing(null)
    }
  }

  async function cancelOrder(order: Order) {
    setCancelling(order.id)
    try {
      const res = await fetch(`/api/restaurant/orders/${order.id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CANCELLED' }),
      })
      if (!res.ok) { toast.error('Erreur'); return }
      toast.success(`Commande ${order.number} annulée`)
      fetchOrders(true)
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setCancelling(null)
    }
  }

  // Filtered orders
  const filtered = orders.filter(o => {
    if (filterType !== 'ALL' && o.type !== filterType) return false
    if (filterStatus !== 'ALL' && o.status !== filterStatus) return false
    return true
  })

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  )

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Restaurant — Commandes</h2>
          <p className="text-muted-foreground mt-1">{filtered.length} commande(s) active(s)</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={view === 'kanban' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setView('kanban')}
          >
            <LayoutGrid className="h-4 w-4 mr-1.5" />Kanban
          </Button>
          <Button
            variant={view === 'table' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setView('table')}
          >
            <List className="h-4 w-4 mr-1.5" />Tableau
          </Button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex gap-3 mb-5 flex-wrap">
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Tous les types</SelectItem>
            <SelectItem value="DINE_IN">Sur place</SelectItem>
            <SelectItem value="TAKEAWAY">Emporter</SelectItem>
            <SelectItem value="DELIVERY">Livraison</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Tous les statuts</SelectItem>
            {(Object.entries(STATUS_LABELS) as [OrderStatus, string][]).map(([s, l]) => (
              <SelectItem key={s} value={s}>{l}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Kanban view */}
      {view === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {COLUMNS.map(col => {
            const colOrders = filtered.filter(o => col.statuses.includes(o.status))
            return (
              <div key={col.id} className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm">{col.label}</h3>
                  <Badge variant="secondary">{colOrders.length}</Badge>
                </div>
                <div className="space-y-3 min-h-24">
                  {colOrders.length === 0 ? (
                    <div className="border-2 border-dashed rounded-xl h-24 flex items-center justify-center text-muted-foreground text-sm">
                      Aucune commande
                    </div>
                  ) : colOrders.map(order => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      onAdvance={advanceOrder}
                      onCancel={cancelOrder}
                      advancing={advancing === order.id}
                      cancelling={cancelling === order.id}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Table view */}
      {view === 'table' && (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Numéro</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Table</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Temps</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Aucune commande
                  </TableCell>
                </TableRow>
              ) : filtered.map(order => (
                <TableRow key={order.id}>
                  <TableCell className="font-mono font-semibold">{order.number}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      {TYPE_ICONS[order.type]}
                      <span className="text-sm">{TYPE_LABELS[order.type]}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[order.status]}`}>
                      {STATUS_LABELS[order.status]}
                    </span>
                  </TableCell>
                  <TableCell>{order.tableNumber ?? '—'}</TableCell>
                  <TableCell className="font-semibold da-amount">{formatDA(order.total)}</TableCell>
                  <TableCell>
                    <span className={`text-sm font-medium ${elapsedColor(order.createdAt)}`}>
                      {elapsedLabel(order.createdAt)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {NEXT_STATUS[order.status] && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => advanceOrder(order)}
                          disabled={advancing === order.id}
                        >
                          {advancing === order.id
                            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            : <><ChevronRight className="h-3.5 w-3.5 mr-1" />{NEXT_LABEL[order.status]}</>
                          }
                        </Button>
                      )}
                      {!['DELIVERED', 'CANCELLED'].includes(order.status) && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => cancelOrder(order)}
                          disabled={cancelling === order.id}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}

// ── Order Card (Kanban) ────────────────────────────────────────────────────────
function OrderCard({
  order, onAdvance, onCancel, advancing, cancelling,
}: {
  order: Order
  onAdvance: (o: Order) => void
  onCancel: (o: Order) => void
  advancing: boolean
  cancelling: boolean
}) {
  const displayItems = order.items.slice(0, 3)
  const extraCount = order.items.length - 3

  return (
    <Card className="shadow-sm">
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-1.5">
            {TYPE_ICONS[order.type]}
            <span className="font-bold text-sm font-mono">{order.number}</span>
            {order.tableNumber && (
              <Badge variant="outline" className="text-xs">T{order.tableNumber}</Badge>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            <span className={`text-xs font-semibold ${elapsedColor(order.createdAt)}`}>
              {elapsedLabel(order.createdAt)}
            </span>
            {!['DELIVERED', 'CANCELLED'].includes(order.status) && (
              <button
                onClick={() => onCancel(order)}
                disabled={cancelling}
                className="text-muted-foreground hover:text-red-500 transition-colors ml-1"
              >
                {cancelling ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
              </button>
            )}
          </div>
        </div>

        {/* Items */}
        <div className="text-xs text-muted-foreground space-y-0.5 mb-3">
          {displayItems.map(item => (
            <div key={item.id}>× {item.quantity} {item.name}</div>
          ))}
          {extraCount > 0 && <div className="italic">et {extraCount} autre(s)…</div>}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between">
          <span className="font-bold text-sm da-amount">{formatDA(order.total)}</span>
          {NEXT_STATUS[order.status] && (
            <Button
              size="sm"
              onClick={() => onAdvance(order)}
              disabled={advancing}
              className="h-7 text-xs"
            >
              {advancing
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <><ChevronRight className="h-3.5 w-3.5 mr-1" />{NEXT_LABEL[order.status]}</>
              }
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
