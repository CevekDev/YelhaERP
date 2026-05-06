'use client'

import { useState, useEffect, useCallback } from 'react'
import { formatDA } from '@/lib/algerian/format'
import { toast } from 'sonner'
import {
  Loader2, RefreshCw, Plus, X, Search, ShoppingCart,
  Users, Clock, UtensilsCrossed, Package, Bike,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { PageHeader } from '@/components/ui/page-header'

// ── Types ──────────────────────────────────────────────────────────────────────
type Room = { id: string; name: string; description?: string | null }
type TableStatus = 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'CLEANING'
type RestaurantTable = {
  id: string
  number: string
  capacity: number
  status: TableStatus
  posX: number
  posY: number
  width: number
  height: number
  roomId: string
  activeOrdersCount?: number
}
type OrderType = 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY'
type MenuItem = { id: string; name: string; price: number; categoryName?: string }
type CartItem = MenuItem & { quantity: number }
type ActiveOrder = {
  id: string
  number: string
  type: OrderType
  status: string
  total: number
  createdAt: string
  items: { name: string; quantity: number }[]
}

// ── Helpers ────────────────────────────────────────────────────────────────────
const STATUS_STYLES: Record<TableStatus, string> = {
  AVAILABLE: 'bg-green-100 border-green-400 text-green-800',
  OCCUPIED:  'bg-orange-100 border-orange-400 text-orange-800',
  RESERVED:  'bg-blue-100 border-blue-400 text-blue-800',
  CLEANING:  'bg-gray-100 border-gray-400 text-gray-600',
}
const STATUS_LABELS: Record<TableStatus, string> = {
  AVAILABLE: 'Libre',
  OCCUPIED:  'Occupée',
  RESERVED:  'Réservée',
  CLEANING:  'Nettoyage',
}
const ORDER_TYPE_LABELS: Record<OrderType, string> = {
  DINE_IN:  'Sur place',
  TAKEAWAY: 'Emporter',
  DELIVERY: 'Livraison',
}

function elapsed(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (diff < 60) return `${diff} min`
  return `${Math.floor(diff / 60)}h${diff % 60 > 0 ? String(diff % 60).padStart(2, '0') : ''}`
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function RestaurantPage() {
  const [rooms, setRooms] = useState<Room[]>([])
  const [tables, setTables] = useState<RestaurantTable[]>([])
  const [activeRoom, setActiveRoom] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // New order modal
  const [showOrderModal, setShowOrderModal] = useState(false)
  const [selectedTable, setSelectedTable] = useState<RestaurantTable | null>(null)
  const [orderType, setOrderType] = useState<OrderType>('DINE_IN')
  const [customerName, setCustomerName] = useState('')
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [menuSearch, setMenuSearch] = useState('')
  const [cart, setCart] = useState<CartItem[]>([])
  const [submitting, setSubmitting] = useState(false)

  // Table detail panel
  const [showTablePanel, setShowTablePanel] = useState(false)
  const [panelTable, setPanelTable] = useState<RestaurantTable | null>(null)
  const [panelOrders, setPanelOrders] = useState<ActiveOrder[]>([])
  const [panelLoading, setPanelLoading] = useState(false)

  const fetchData = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true)
    else setRefreshing(true)
    try {
      const [roomsRes, tablesRes] = await Promise.all([
        fetch('/api/restaurant/rooms'),
        fetch('/api/restaurant/tables'),
      ])
      const roomsData = await roomsRes.json()
      const tablesData = await tablesRes.json()
      const roomList: Room[] = roomsData.data ?? []
      setRooms(roomList)
      setTables(tablesData.data ?? [])
      if (!activeRoom && roomList.length > 0) setActiveRoom(roomList[0].id)
    } catch {
      toast.error('Erreur de chargement')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [activeRoom])

  useEffect(() => {
    fetchData()
  }, [])

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => fetchData(true), 30000)
    return () => clearInterval(interval)
  }, [fetchData])

  async function fetchMenuItems() {
    try {
      const res = await fetch('/api/restaurant/menu/items')
      const data = await res.json()
      setMenuItems(data.data ?? [])
    } catch { /* ignore */ }
  }

  function openOrderModal(table?: RestaurantTable) {
    setSelectedTable(table ?? null)
    setOrderType(table ? 'DINE_IN' : 'DINE_IN')
    setCustomerName('')
    setCart([])
    setMenuSearch('')
    setShowOrderModal(true)
    fetchMenuItems()
  }

  async function openTablePanel(table: RestaurantTable) {
    setPanelTable(table)
    setShowTablePanel(true)
    setPanelLoading(true)
    try {
      const res = await fetch(`/api/restaurant/orders?tableId=${table.id}&status=active`)
      const data = await res.json()
      setPanelOrders(data.data ?? [])
    } catch {
      toast.error('Erreur de chargement des commandes')
    } finally {
      setPanelLoading(false)
    }
  }

  function handleTableClick(table: RestaurantTable) {
    if (table.status === 'AVAILABLE') openOrderModal(table)
    else if (table.status === 'OCCUPIED') openTablePanel(table)
  }

  function addToCart(item: MenuItem) {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id)
      if (existing) return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i)
      return [...prev, { ...item, quantity: 1 }]
    })
  }

  function updateCartQty(id: string, delta: number) {
    setCart(prev =>
      prev.map(i => i.id === id ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i)
          .filter(i => i.quantity > 0)
    )
  }

  const cartTotal = cart.reduce((s, i) => s + i.price * i.quantity, 0)

  async function submitOrder() {
    if (cart.length === 0) { toast.error('Ajoutez des articles'); return }
    setSubmitting(true)
    try {
      const res = await fetch('/api/restaurant/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: orderType,
          tableId: selectedTable?.id ?? null,
          customerName: customerName || null,
          items: cart.map(i => ({ menuItemId: i.id, quantity: i.quantity, unitPrice: i.price })),
        }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.message ?? 'Erreur'); return }
      toast.success(`Commande ${data.data?.number ?? ''} créée`)
      setShowOrderModal(false)
      fetchData(true)
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setSubmitting(false)
    }
  }

  const filteredMenu = menuItems.filter(i =>
    i.name.toLowerCase().includes(menuSearch.toLowerCase())
  )

  const occupiedCount = tables.filter(t => t.status === 'OCCUPIED').length
  const activeOrdersCount = tables.reduce((s, t) => s + (t.activeOrdersCount ?? 0), 0)

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  )

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Restaurant — Plan de salle</h2>
          <p className="text-muted-foreground mt-1">Gérez vos tables en temps réel</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => fetchData(true)} disabled={refreshing} size="sm">
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Rafraîchir
          </Button>
          <Button onClick={() => openOrderModal()} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle commande
          </Button>
        </div>
      </div>

      {/* KPI bar */}
      <div className="flex gap-3 mb-5 flex-wrap">
        <Badge variant="outline" className="px-3 py-1.5 text-sm gap-2">
          <UtensilsCrossed className="h-4 w-4 text-orange-500" />
          <span className="font-semibold">{occupiedCount}</span> tables occupées
        </Badge>
        <Badge variant="outline" className="px-3 py-1.5 text-sm gap-2">
          <ShoppingCart className="h-4 w-4 text-blue-500" />
          <span className="font-semibold">{activeOrdersCount}</span> commandes actives
        </Badge>
        <Badge variant="outline" className="px-3 py-1.5 text-sm gap-2">
          <Users className="h-4 w-4 text-green-500" />
          <span className="font-semibold">{tables.filter(t => t.status === 'AVAILABLE').length}</span> tables libres
        </Badge>
      </div>

      {/* Legend */}
      <div className="flex gap-3 mb-4 flex-wrap text-xs">
        {(Object.entries(STATUS_STYLES) as [TableStatus, string][]).map(([status, cls]) => (
          <span key={status} className={`flex items-center gap-1.5 border rounded-md px-2 py-1 ${cls}`}>
            <span className="w-2 h-2 rounded-full bg-current" />
            {STATUS_LABELS[status]}
          </span>
        ))}
      </div>

      {/* Room tabs */}
      {rooms.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
          <UtensilsCrossed className="h-12 w-12 mb-3 opacity-30" />
          <p>Aucune salle configurée</p>
        </div>
      ) : (
        <Tabs value={activeRoom} onValueChange={setActiveRoom}>
          <TabsList className="mb-4">
            {rooms.map(r => (
              <TabsTrigger key={r.id} value={r.id}>{r.name}</TabsTrigger>
            ))}
          </TabsList>
          {rooms.map(r => {
            const roomTables = tables.filter(t => t.roomId === r.id)
            return (
              <TabsContent key={r.id} value={r.id}>
                {/* Floor plan */}
                <div
                  className="relative bg-gray-50 border rounded-xl overflow-hidden"
                  style={{ height: 600 }}
                >
                  {roomTables.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                      Aucune table dans cette salle
                    </div>
                  )}
                  {roomTables.map(table => (
                    <button
                      key={table.id}
                      onClick={() => handleTableClick(table)}
                      className={`absolute border-2 rounded-xl flex flex-col items-center justify-center shadow-sm transition-all hover:shadow-md hover:scale-105 active:scale-100 cursor-pointer ${STATUS_STYLES[table.status]}`}
                      style={{
                        left: table.posX,
                        top: table.posY,
                        width: table.width || 100,
                        height: table.height || 80,
                      }}
                    >
                      <span className="text-xl font-bold leading-none">{table.number}</span>
                      <span className="text-xs mt-1 flex items-center gap-0.5">
                        <Users className="h-3 w-3" />{table.capacity}
                      </span>
                      <span className="text-[10px] mt-0.5 font-medium">{STATUS_LABELS[table.status]}</span>
                      {table.status === 'OCCUPIED' && (table.activeOrdersCount ?? 0) > 0 && (
                        <span className="absolute -top-2 -right-2 bg-orange-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                          {table.activeOrdersCount}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </TabsContent>
            )
          })}
        </Tabs>
      )}

      {/* New Order Modal */}
      <Dialog open={showOrderModal} onOpenChange={setShowOrderModal}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Nouvelle commande {selectedTable ? `— Table ${selectedTable.number}` : ''}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Order type */}
            <div className="space-y-2">
              <Label>Type de commande</Label>
              <div className="grid grid-cols-3 gap-2">
                {(['DINE_IN', 'TAKEAWAY', 'DELIVERY'] as OrderType[]).map(t => (
                  <button
                    key={t}
                    onClick={() => setOrderType(t)}
                    className={`border-2 rounded-lg py-3 text-sm font-medium transition-colors flex flex-col items-center gap-1 ${
                      orderType === t ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-muted-foreground'
                    }`}
                  >
                    {t === 'DINE_IN' && <UtensilsCrossed className="h-4 w-4" />}
                    {t === 'TAKEAWAY' && <Package className="h-4 w-4" />}
                    {t === 'DELIVERY' && <Bike className="h-4 w-4" />}
                    {ORDER_TYPE_LABELS[t]}
                  </button>
                ))}
              </div>
            </div>

            {/* Customer name for takeaway/delivery */}
            {(orderType === 'TAKEAWAY' || orderType === 'DELIVERY') && (
              <div className="space-y-2">
                <Label>Nom du client</Label>
                <Input
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  placeholder="Prénom et nom"
                />
              </div>
            )}

            {/* Menu search */}
            <div className="space-y-2">
              <Label>Articles</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={menuSearch}
                  onChange={e => setMenuSearch(e.target.value)}
                  placeholder="Rechercher un plat..."
                  className="pl-9"
                />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto border rounded-lg p-2">
                {filteredMenu.length === 0 ? (
                  <div className="col-span-3 text-center py-4 text-muted-foreground text-sm">Aucun article</div>
                ) : filteredMenu.map(item => (
                  <button
                    key={item.id}
                    onClick={() => addToCart(item)}
                    className="border rounded-lg p-2 text-left hover:border-primary hover:bg-primary/5 transition-colors"
                  >
                    <p className="text-sm font-medium truncate">{item.name}</p>
                    <p className="text-xs text-muted-foreground da-amount">{formatDA(item.price)}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Cart */}
            {cart.length > 0 && (
              <div className="border rounded-lg divide-y">
                {cart.map(item => (
                  <div key={item.id} className="flex items-center gap-3 px-3 py-2">
                    <span className="flex-1 text-sm font-medium">{item.name}</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => updateCartQty(item.id, -1)}
                        className="w-6 h-6 rounded bg-muted flex items-center justify-center text-sm"
                      >−</button>
                      <span className="w-6 text-center text-sm font-bold">{item.quantity}</span>
                      <button
                        onClick={() => updateCartQty(item.id, 1)}
                        className="w-6 h-6 rounded bg-muted flex items-center justify-center text-sm"
                      >+</button>
                    </div>
                    <span className="text-sm font-semibold da-amount w-24 text-right">
                      {formatDA(item.price * item.quantity)}
                    </span>
                  </div>
                ))}
                <div className="flex justify-between px-3 py-2.5 font-bold text-sm bg-muted/50">
                  <span>Total</span>
                  <span className="da-amount">{formatDA(cartTotal)}</span>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowOrderModal(false)}>Annuler</Button>
            <Button onClick={submitOrder} disabled={submitting || cart.length === 0}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Créer la commande'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Table detail panel */}
      <Dialog open={showTablePanel} onOpenChange={setShowTablePanel}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Table {panelTable?.number} — Commandes actives
            </DialogTitle>
          </DialogHeader>
          {panelLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : panelOrders.length === 0 ? (
            <p className="text-center py-6 text-muted-foreground">Aucune commande active</p>
          ) : (
            <div className="space-y-3 py-2">
              {panelOrders.map(order => (
                <Card key={order.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold">{order.number}</span>
                      <div className="flex items-center gap-2">
                        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">{elapsed(order.createdAt)}</span>
                        <Badge variant="secondary">{order.status}</Badge>
                      </div>
                    </div>
                    <ul className="text-sm text-muted-foreground space-y-0.5">
                      {order.items.map((item, idx) => (
                        <li key={idx}>× {item.quantity} {item.name}</li>
                      ))}
                    </ul>
                    <div className="flex justify-between mt-3 pt-2 border-t">
                      <span className="text-sm text-muted-foreground">Total</span>
                      <span className="font-bold da-amount">{formatDA(order.total)}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTablePanel(false)}>Fermer</Button>
            <Button onClick={() => { setShowTablePanel(false); openOrderModal(panelTable ?? undefined) }}>
              <Plus className="h-4 w-4 mr-2" />Ajouter une commande
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
