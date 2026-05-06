'use client'

import { useState, useEffect, useCallback } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { formatDA } from '@/lib/algerian/format'
import { toast } from 'sonner'
import { ShoppingCart, Plus, Minus, X, Send, Loader2, UtensilsCrossed, ChevronDown } from 'lucide-react'

interface MenuItemType {
  id: string
  name: string
  nameAr?: string | null
  description?: string | null
  imageUrl?: string | null
  price: number
  taxRate: number
  preparationTime: number
  isAvailable: boolean
  allergens: string[]
  tags: string[]
  loyaltyPoints: number
}

interface MenuCategoryType {
  id: string
  name: string
  nameAr?: string | null
  items: MenuItemType[]
}

interface RestaurantInfo {
  name: string
  logo?: string | null
  currency: string
  taxRate: number
}

interface TableInfo {
  id: string
  number: string
  capacity: number
}

interface CartEntry {
  item: MenuItemType
  quantity: number
  notes: string
}

const TAG_COLORS: Record<string, string> = {
  populaire: 'bg-orange-100 text-orange-700',
  nouveau:   'bg-blue-100 text-blue-700',
  végétarien:'bg-green-100 text-green-700',
  épicé:     'bg-red-100 text-red-700',
}

export default function PublicMenuPage({ params, searchParams }: {
  params: { companyId: string }
  searchParams: { table?: string }
}) {
  const tableToken = searchParams.table

  const [restaurant, setRestaurant] = useState<RestaurantInfo | null>(null)
  const [table, setTable] = useState<TableInfo | null>(null)
  const [categories, setCategories] = useState<MenuCategoryType[]>([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [cart, setCart] = useState<CartEntry[]>([])
  const [showCart, setShowCart] = useState(false)
  const [selectedItem, setSelectedItem] = useState<MenuItemType | null>(null)
  const [itemNotes, setItemNotes] = useState('')
  const [ordering, setOrdering] = useState(false)
  const [ordered, setOrdered] = useState(false)
  const [customerName, setCustomerName] = useState('')

  const loadMenu = useCallback(async () => {
    try {
      // If we have a table token, use the token-based endpoint
      const endpoint = tableToken
        ? `/api/restaurant/qr/${tableToken}`
        : `/api/restaurant/menu/public/none` // fallback

      if (!tableToken) {
        // Without token, try to load by companyId via public endpoint
        setLoading(false)
        return
      }

      const res = await fetch(endpoint)
      if (!res.ok) { setLoading(false); return }
      const data = await res.json()
      setRestaurant(data.restaurant ?? data.config)
      setTable(data.table)
      setCategories(data.categories ?? [])
      if (data.categories?.length > 0) setActiveCategory(data.categories[0].id)
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [tableToken])

  useEffect(() => { loadMenu() }, [loadMenu])

  function cartTotal() {
    return cart.reduce((s, e) => s + Number(e.item.price) * e.quantity, 0)
  }

  function cartCount() {
    return cart.reduce((s, e) => s + e.quantity, 0)
  }

  function addToCart(item: MenuItemType, notes = '') {
    setCart(prev => {
      const existing = prev.find(e => e.item.id === item.id && e.notes === notes)
      if (existing) {
        return prev.map(e => e.item.id === item.id && e.notes === notes
          ? { ...e, quantity: e.quantity + 1 }
          : e
        )
      }
      return [...prev, { item, quantity: 1, notes }]
    })
    setSelectedItem(null)
    setItemNotes('')
    toast.success(`${item.name} ajouté au panier`)
  }

  function updateQty(idx: number, delta: number) {
    setCart(prev => {
      const updated = prev.map((e, i) => i === idx ? { ...e, quantity: Math.max(0, e.quantity + delta) } : e)
      return updated.filter(e => e.quantity > 0)
    })
  }

  async function placeOrder() {
    if (!tableToken || cart.length === 0) return
    setOrdering(true)
    try {
      const res = await fetch(`/api/restaurant/qr/${tableToken}/order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lines: cart.map(e => ({ menuItemId: e.item.id, quantity: e.quantity, notes: e.notes || undefined })),
          customerName: customerName || undefined,
        }),
      })
      if (res.ok) {
        setOrdered(true)
        setCart([])
        setShowCart(false)
      } else {
        toast.error('Erreur lors de la commande. Veuillez appeler le serveur.')
      }
    } catch {
      toast.error('Erreur réseau. Veuillez réessayer.')
    } finally {
      setOrdering(false)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-white">
      <div className="text-center">
        <Loader2 className="h-10 w-10 animate-spin text-[#1D9E75] mx-auto mb-3" />
        <p className="text-gray-500">Chargement du menu...</p>
      </div>
    </div>
  )

  if (!restaurant && !loading) return (
    <div className="flex items-center justify-center min-h-screen bg-white">
      <div className="text-center p-6">
        <UtensilsCrossed className="h-16 w-16 text-gray-300 mx-auto mb-4" />
        <h1 className="text-xl font-bold text-gray-700">Menu non disponible</h1>
        <p className="text-gray-500 mt-2">Ce QR code n'est plus valide.</p>
      </div>
    </div>
  )

  if (ordered) return (
    <div className="flex items-center justify-center min-h-screen bg-white p-6">
      <div className="text-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-4xl">✅</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-800">Commande envoyée !</h1>
        <p className="text-gray-500 mt-2">Votre commande a été transmise à la cuisine.</p>
        {table && <p className="text-gray-500">Table {table.number}</p>}
        <Button className="mt-6 bg-[#1D9E75] hover:bg-[#178a65]" onClick={() => setOrdered(false)}>
          Commander autre chose
        </Button>
      </div>
    </div>
  )

  const activeItems = categories.find(c => c.id === activeCategory)?.items ?? []

  return (
    <div className="min-h-screen bg-white max-w-2xl mx-auto">
      {/* Header */}
      <div className="bg-[#1D9E75] text-white px-4 py-5 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          {restaurant?.logo ? (
            <img src={restaurant.logo} alt="logo" className="h-10 w-10 rounded-full object-cover" />
          ) : (
            <div className="h-10 w-10 bg-white/20 rounded-full flex items-center justify-center">
              <UtensilsCrossed className="h-5 w-5" />
            </div>
          )}
          <div>
            <h1 className="font-bold text-lg leading-tight">{restaurant?.name}</h1>
            {table && <p className="text-white/80 text-sm">Table {table.number} — Bienvenue !</p>}
          </div>
        </div>
      </div>

      {/* Category tabs */}
      <div className="sticky top-[73px] z-10 bg-white border-b overflow-x-auto">
        <div className="flex gap-1 px-3 py-2">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => {
                setActiveCategory(cat.id)
                document.getElementById(`cat-${cat.id}`)?.scrollIntoView({ behavior: 'smooth' })
              }}
              className={`whitespace-nowrap px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                activeCategory === cat.id
                  ? 'bg-[#1D9E75] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Menu items */}
      <div className="pb-28">
        {categories.map(cat => (
          <div key={cat.id} id={`cat-${cat.id}`} className="mb-6">
            <div className="px-4 py-3 bg-gray-50 border-b">
              <h2 className="font-bold text-gray-800">{cat.name}</h2>
              {cat.nameAr && <p className="text-gray-500 text-sm text-right">{cat.nameAr}</p>}
            </div>
            <div className="divide-y">
              {cat.items.filter(i => i.isAvailable).map(item => (
                <div
                  key={item.id}
                  onClick={() => { setSelectedItem(item); setItemNotes('') }}
                  className="flex items-start gap-3 px-4 py-3 cursor-pointer active:bg-gray-50"
                >
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.name} className="w-20 h-20 rounded-xl object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-20 h-20 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
                      <UtensilsCrossed className="h-6 w-6 text-gray-300" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-gray-900">{item.name}</p>
                        {item.nameAr && <p className="text-gray-400 text-xs text-right">{item.nameAr}</p>}
                      </div>
                      <span className="font-bold text-[#1D9E75] whitespace-nowrap">
                        {formatDA(Number(item.price))}
                      </span>
                    </div>
                    {item.description && (
                      <p className="text-gray-500 text-sm mt-0.5 line-clamp-2">{item.description}</p>
                    )}
                    <div className="flex flex-wrap gap-1 mt-1">
                      {item.tags.map(tag => (
                        <span key={tag} className={`text-[10px] px-2 py-0.5 rounded-full ${TAG_COLORS[tag] ?? 'bg-gray-100 text-gray-600'}`}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
              {cat.items.filter(i => !i.isAvailable).map(item => (
                <div key={item.id} className="flex items-center gap-3 px-4 py-3 opacity-50">
                  <div className="w-16 h-16 rounded-lg bg-gray-100 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-gray-500 line-through">{item.name}</p>
                    <Badge variant="secondary" className="text-[10px]">Indisponible</Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Floating cart button */}
      {tableToken && cart.length > 0 && (
        <div className="fixed bottom-6 left-0 right-0 px-4 max-w-2xl mx-auto">
          <button
            onClick={() => setShowCart(true)}
            className="w-full bg-[#1D9E75] text-white rounded-2xl py-4 px-5 flex items-center justify-between shadow-2xl"
          >
            <span className="bg-white/20 rounded-full px-2.5 py-0.5 text-sm font-bold">{cartCount()}</span>
            <span className="font-bold">Voir le panier</span>
            <span className="font-bold">{formatDA(cartTotal())}</span>
          </button>
        </div>
      )}

      {/* Item detail sheet */}
      <Sheet open={!!selectedItem} onOpenChange={o => { if (!o) setSelectedItem(null) }}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[80vh] overflow-y-auto">
          {selectedItem && (
            <>
              <SheetHeader>
                <SheetTitle className="text-left text-xl">{selectedItem.name}</SheetTitle>
                {selectedItem.nameAr && <p className="text-right text-gray-500">{selectedItem.nameAr}</p>}
              </SheetHeader>
              <div className="space-y-4 mt-4">
                {selectedItem.imageUrl && (
                  <img src={selectedItem.imageUrl} alt={selectedItem.name} className="w-full h-48 object-cover rounded-xl" />
                )}
                {selectedItem.description && <p className="text-gray-600">{selectedItem.description}</p>}
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-[#1D9E75]">{formatDA(Number(selectedItem.price))}</span>
                  <span className="text-sm text-gray-500">~{selectedItem.preparationTime} min</span>
                </div>
                {selectedItem.allergens.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-1">Allergènes :</p>
                    <div className="flex flex-wrap gap-1">
                      {selectedItem.allergens.map(a => (
                        <Badge key={a} variant="outline" className="text-xs">{a}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                {tableToken && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Instructions spéciales (optionnel)</label>
                    <Input
                      placeholder="Sans oignons, extra épices..."
                      value={itemNotes}
                      onChange={e => setItemNotes(e.target.value)}
                    />
                  </div>
                )}
                {tableToken ? (
                  <Button
                    className="w-full h-12 bg-[#1D9E75] hover:bg-[#178a65] text-base"
                    onClick={() => addToCart(selectedItem, itemNotes)}
                  >
                    <Plus className="h-5 w-5 mr-2" />
                    Ajouter au panier
                  </Button>
                ) : (
                  <p className="text-center text-gray-500 text-sm">Scannez le QR code de votre table pour commander.</p>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Cart sheet */}
      <Sheet open={showCart} onOpenChange={setShowCart}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] flex flex-col">
          <SheetHeader>
            <SheetTitle>Mon panier</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto space-y-3 mt-4">
            {cart.map((entry, idx) => (
              <div key={idx} className="flex items-center gap-3 py-2">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{entry.item.name}</p>
                  {entry.notes && <p className="text-xs text-gray-500 italic">{entry.notes}</p>}
                  <p className="text-[#1D9E75] text-sm">{formatDA(Number(entry.item.price))}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => updateQty(idx, -1)} className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center">
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className="w-5 text-center font-bold text-sm">{entry.quantity}</span>
                  <button onClick={() => updateQty(idx, +1)} className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center">
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
                <p className="text-sm font-semibold w-16 text-right">{formatDA(Number(entry.item.price) * entry.quantity)}</p>
              </div>
            ))}
          </div>

          <div className="border-t pt-4 space-y-3">
            <div className="flex justify-between font-bold text-lg">
              <span>Total</span>
              <span className="text-[#1D9E75]">{formatDA(cartTotal())}</span>
            </div>
            <Input
              placeholder="Votre prénom (optionnel)"
              value={customerName}
              onChange={e => setCustomerName(e.target.value)}
            />
            <Button
              className="w-full h-12 bg-[#1D9E75] hover:bg-[#178a65] text-base"
              onClick={placeOrder}
              disabled={ordering}
            >
              {ordering ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                <><Send className="h-5 w-5 mr-2" />Envoyer la commande à la cuisine</>
              )}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
