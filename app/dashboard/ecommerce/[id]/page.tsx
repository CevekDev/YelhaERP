'use client'
import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import {
  ArrowLeft, ChevronDown, Loader2, Clock, CheckCircle2, Package,
  Truck, Phone, RotateCcw, AlertCircle, MapPin, User, Tag,
  CreditCard, FileText, GitBranch
} from 'lucide-react'
import { toast } from 'sonner'
import { formatDA } from '@/lib/algerian/format'
import { cn } from '@/lib/utils'

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

type StatusHistory = {
  id: string
  status: string
  note: string | null
  source: string
  createdAt: string
}

type Order = {
  id: string
  orderNumber: string
  status: string
  customerName: string
  customerFirstName: string | null
  customerPhone: string
  customerPhone2: string | null
  customerAddress: string
  customerWilaya: string
  customerCommune: string | null
  productDescription: string
  productPrice: number
  quantity: number
  deliveryFee: number
  total: number
  isPaid: boolean
  trackingNumber: string | null
  notes: string | null
  confirmedAt: string | null
  shippedAt: string | null
  deliveredAt: string | null
  returnedAt: string | null
  createdAt: string
  deliveryCompany: { id: string; name: string; slug: string } | null
  deliveryOption: { id: string; name: string; price: number } | null
  driver: { id: string; name: string; phone: string } | null
  statusHistory: StatusHistory[]
}

export default function OrderDetailPage() {
  const params  = useParams()
  const id      = params.id as string
  const [order, setOrder]     = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [trackingInput, setTrackingInput] = useState('')

  const fetchOrder = useCallback(async () => {
    setLoading(true)
    try {
      const res  = await fetch(`/api/ecommerce/orders/${id}`)
      const data = await res.json()
      if (data.data) {
        setOrder(data.data)
        setTrackingInput(data.data.trackingNumber ?? '')
      }
    } catch {
      toast.error('Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { fetchOrder() }, [fetchOrder])

  async function patch(body: Record<string, unknown>) {
    setUpdating(true)
    try {
      const res  = await fetch(`/api/ecommerce/orders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? 'Erreur'); return }
      setOrder(prev => prev ? { ...prev, ...data.data } : prev)
      toast.success('Mis à jour')
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setUpdating(false)
    }
  }

  async function changeStatus(newStatus: string) {
    await patch({ status: newStatus })
    await fetchOrder() // reload to get updated history
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  )

  if (!order) return (
    <div className="p-6 text-center">
      <p className="text-muted-foreground">Commande introuvable</p>
      <Button asChild className="mt-4"><Link href="/dashboard/ecommerce">Retour</Link></Button>
    </div>
  )

  const sc = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.PENDING
  const StatusIcon = sc.icon

  return (
    <div className="p-4 md:p-6 max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" asChild className="h-8 w-8">
            <Link href="/dashboard/ecommerce"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold font-mono">{order.orderNumber}</h1>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className={cn('inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium', sc.color)}>
                    {updating
                      ? <Loader2 className="h-3 w-3 animate-spin" />
                      : <StatusIcon className="h-3 w-3" />
                    }
                    {sc.label}
                    <ChevronDown className="h-3 w-3" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {ALL_STATUSES.map(s => (
                    <DropdownMenuItem
                      key={s}
                      onClick={() => changeStatus(s)}
                      className={cn(order.status === s && 'font-semibold')}
                    >
                      {STATUS_CONFIG[s].label}
                      {order.status === s && ' ✓'}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <p className="text-sm text-muted-foreground">
              {new Date(order.createdAt).toLocaleString('fr-DZ')}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Customer */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />Client
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="font-semibold">{order.customerName} {order.customerFirstName ?? ''}</p>
            <p className="flex items-center gap-2 text-muted-foreground">
              <Phone className="h-3.5 w-3.5" />{order.customerPhone}
              {order.customerPhone2 && <span>/ {order.customerPhone2}</span>}
            </p>
            <p className="flex items-start gap-2 text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span>
                {order.customerAddress},&nbsp;
                {order.customerCommune ? `${order.customerCommune}, ` : ''}
                {order.customerWilaya}
              </span>
            </p>
          </CardContent>
        </Card>

        {/* Product */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Tag className="h-4 w-4 text-muted-foreground" />Produit
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="font-semibold">{order.productDescription}</p>
            <p className="text-muted-foreground">
              {order.quantity} x <span className="da-amount">{formatDA(Number(order.productPrice))}</span>
            </p>
          </CardContent>
        </Card>

        {/* Delivery */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Truck className="h-4 w-4 text-muted-foreground" />Livraison
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-xs text-muted-foreground">Société</p>
                <p className="font-medium">{order.deliveryCompany?.name ?? 'Non assigné'}</p>
              </div>
              {order.deliveryOption && (
                <div>
                  <p className="text-xs text-muted-foreground">Type</p>
                  <p className="font-medium">{order.deliveryOption.name}</p>
                </div>
              )}
              {order.driver && (
                <div>
                  <p className="text-xs text-muted-foreground">Livreur</p>
                  <p className="font-medium">{order.driver.name}</p>
                  <p className="text-xs text-muted-foreground">{order.driver.phone}</p>
                </div>
              )}
            </div>
            {/* Tracking number */}
            <div className="flex gap-2 items-end">
              <div className="flex-1 space-y-1">
                <Label className="text-xs">N° de suivi</Label>
                <Input
                  value={trackingInput}
                  onChange={e => setTrackingInput(e.target.value)}
                  placeholder="Ex: YLD123456789"
                  className="h-8 text-sm"
                />
              </div>
              <Button
                size="sm"
                variant="outline"
                className="h-8"
                disabled={updating || trackingInput === (order.trackingNumber ?? '')}
                onClick={() => patch({ trackingNumber: trackingInput || null })}
              >
                Enreg.
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Financial */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-muted-foreground" />Finances
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Produit ({order.quantity} x)</span>
              <span className="da-amount">{formatDA(Number(order.productPrice) * order.quantity)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Frais livraison</span>
              <span className="da-amount">{formatDA(Number(order.deliveryFee))}</span>
            </div>
            <div className="flex justify-between font-bold border-t pt-2">
              <span>Total</span>
              <span className="da-amount">{formatDA(Number(order.total))}</span>
            </div>
            <div className="flex items-center justify-between pt-1">
              <span className="text-muted-foreground">Paiement</span>
              <button
                onClick={() => patch({ isPaid: !order.isPaid })}
                disabled={updating}
                className={cn(
                  'px-3 py-1 rounded-full text-xs font-medium transition-colors',
                  order.isPaid
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
                )}
              >
                {order.isPaid ? 'Payé' : 'Non payé'}
              </button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Notes */}
      {order.notes && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{order.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Status history */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <GitBranch className="h-4 w-4 text-muted-foreground" />Historique
          </CardTitle>
        </CardHeader>
        <CardContent>
          {order.statusHistory.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Aucun historique</p>
          ) : (
            <ol className="relative border-l border-border space-y-4 ml-3">
              {order.statusHistory.map(h => {
                const hsc = STATUS_CONFIG[h.status] ?? STATUS_CONFIG.PENDING
                const HIcon = hsc.icon
                return (
                  <li key={h.id} className="ml-4">
                    <div className="absolute -left-1.5 w-3 h-3 rounded-full bg-border flex items-center justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
                    </div>
                    <div className="flex items-start gap-2">
                      <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium', hsc.color)}>
                        <HIcon className="h-3 w-3" />{hsc.label}
                      </span>
                      <span className={cn(
                        'text-xs px-1.5 py-0.5 rounded font-medium',
                        h.source === 'WEBHOOK'
                          ? 'bg-blue-100 text-blue-600'
                          : h.source === 'API'
                          ? 'bg-violet-100 text-violet-600'
                          : 'bg-gray-100 text-gray-500',
                      )}>
                        {h.source}
                      </span>
                    </div>
                    {h.note && (
                      <p className="text-xs text-muted-foreground mt-1">{h.note}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(h.createdAt).toLocaleString('fr-DZ')}
                    </p>
                  </li>
                )
              })}
            </ol>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
