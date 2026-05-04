'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { formatDA } from '@/lib/algerian/format'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import {
  Plus, Search, Package, Truck, CheckCircle2, RotateCcw, Clock,
  Eye, ChevronDown, Loader2, AlertCircle, Phone, MapPin
} from 'lucide-react'
import { toast } from 'sonner'

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  PENDING:          { label: 'En attente',       color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',      icon: Clock },
  CONFIRMED:        { label: 'Confirmé',          color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',          icon: CheckCircle2 },
  SHIPPED:          { label: 'Expédié',           color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',  icon: Package },
  OUT_FOR_DELIVERY: { label: 'Livreur démarré',   color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400', icon: Truck },
  DELIVERED:        { label: 'Livré',             color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',      icon: CheckCircle2 },
  NO_ANSWER:        { label: 'Client répond pas', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',  icon: Phone },
  RETURNED:         { label: 'Retour',            color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',             icon: RotateCcw },
  CANCELLED:        { label: 'Annulé',            color: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',            icon: AlertCircle },
}

const ALL_STATUSES = Object.keys(STATUS_CONFIG)

type Order = {
  id: string
  orderNumber: string
  status: string
  customerName: string
  customerFirstName: string | null
  customerPhone: string
  customerWilaya: string
  productDescription: string
  productPrice: number
  quantity: number
  deliveryFee: number
  total: number
  isPaid: boolean
  createdAt: string
  deliveryCompany: { id: string; name: string; slug: string } | null
  driver: { id: string; name: string; phone: string } | null
}

export default function EcomOrdersPage() {
  const router = useRouter()
  const [orders, setOrders]     = useState<Order[]>([])
  const [total, setTotal]       = useState(0)
  const [page, setPage]         = useState(1)
  const [status, setStatus]     = useState('ALL')
  const [search, setSearch]     = useState('')
  const [loading, setLoading]   = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' })
      if (status !== 'ALL') params.set('status', status)
      if (search) params.set('search', search)
      const res  = await fetch(`/api/ecommerce/orders?${params}`)
      const data = await res.json()
      setOrders(data.orders ?? [])
      setTotal(data.total ?? 0)
    } catch {
      toast.error('Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }, [page, status, search])

  useEffect(() => {
    const t = setTimeout(fetchOrders, search ? 300 : 0)
    return () => clearTimeout(t)
  }, [fetchOrders])

  async function changeStatus(orderId: string, newStatus: string) {
    setUpdating(orderId)
    try {
      const res = await fetch(`/api/ecommerce/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) { toast.error('Erreur'); return }
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o))
      toast.success('Statut mis à jour')
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setUpdating(null)
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Commandes</h1>
          <p className="text-muted-foreground text-sm">{total} commande{total > 1 ? 's' : ''} au total</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/ecommerce/delivery">Livraison</Link>
          </Button>
          <Button asChild>
            <Link href="/dashboard/ecommerce/new">
              <Plus className="h-4 w-4 mr-2" />Nouvelle commande
            </Link>
          </Button>
        </div>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
        <button
          onClick={() => { setStatus('ALL'); setPage(1) }}
          className={cn(
            'px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
            status === 'ALL'
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted',
          )}
        >
          Tout ({total})
        </button>
        {ALL_STATUSES.map(s => (
          <button
            key={s}
            onClick={() => { setStatus(s); setPage(1) }}
            className={cn(
              'px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
              status === s
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted',
            )}
          >
            {STATUS_CONFIG[s].label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1) }}
          placeholder="Nom, téléphone, numéro..."
          className="pl-9"
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
          <Package className="h-10 w-10 mb-3 opacity-30" />
          <p className="font-medium">Aucune commande</p>
          <Button className="mt-4" asChild>
            <Link href="/dashboard/ecommerce/new">
              <Plus className="h-4 w-4 mr-2" />Créer une commande
            </Link>
          </Button>
        </div>
      ) : (
        <div className="border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Commande</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Client</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Produit</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Livraison</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Total</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Statut</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {orders.map(order => {
                  const sc = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.PENDING
                  const StatusIcon = sc.icon
                  return (
                    <tr key={order.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-mono font-semibold text-xs">{order.orderNumber}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {new Date(order.createdAt).toLocaleDateString('fr-DZ')}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{order.customerName} {order.customerFirstName ?? ''}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <Phone className="h-3 w-3" />{order.customerPhone}
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3" />{order.customerWilaya}
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <div className="max-w-[200px] truncate">{order.productDescription}</div>
                        <div className="text-xs text-muted-foreground">x{order.quantity}</div>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <div className="text-xs">{order.deliveryCompany?.name ?? 'Non assigné'}</div>
                        {order.driver && (
                          <div className="text-xs text-muted-foreground">{order.driver.name}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="font-semibold da-amount">{formatDA(Number(order.total))}</div>
                        {order.isPaid && <div className="text-xs text-green-600">Payé</div>}
                      </td>
                      <td className="px-4 py-3">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className={cn(
                              'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors',
                              sc.color,
                            )}>
                              {updating === order.id
                                ? <Loader2 className="h-3 w-3 animate-spin" />
                                : <StatusIcon className="h-3 w-3" />
                              }
                              <span className="hidden sm:inline">{sc.label}</span>
                              <ChevronDown className="h-3 w-3" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            {ALL_STATUSES.map(s => (
                              <DropdownMenuItem
                                key={s}
                                onClick={() => changeStatus(order.id, s)}
                                className={cn('text-sm', order.status === s && 'font-semibold')}
                              >
                                {STATUS_CONFIG[s].label}
                                {order.status === s && ' ✓'}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                      <td className="px-4 py-3">
                        <Button variant="ghost" size="icon" asChild className="h-7 w-7">
                          <Link href={`/dashboard/ecommerce/${order.id}`}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {/* Pagination */}
          {total > 20 && (
            <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/20">
              <span className="text-sm text-muted-foreground">
                Page {page} / {Math.ceil(total / 20)}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage(p => p - 1)}
                >
                  Préc.
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= Math.ceil(total / 20)}
                  onClick={() => setPage(p => p + 1)}
                >
                  Suiv.
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
