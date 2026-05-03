'use client'

import { useState, useEffect, useRef } from 'react'
import { formatDA } from '@/lib/algerian/format'
import { cn } from '@/lib/utils'
import {
  ShoppingCart, Search, Plus, Minus, X, CreditCard, Banknote,
  UserCircle, CheckCircle2, RotateCcw, Lock, Unlock,
  AlertTriangle, Loader2, Package,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog'
import { toast } from 'sonner'

// Types
type Product = {
  id: string
  name: string
  sku: string | null
  unitPrice: number
  taxRate: number
  stockQty: number
  unit: string | null
}
type CartItem = Product & { quantity: number; lineTotal: number; lineTax: number }
type PayMethod = 'CASH' | 'CARD' | 'DEBT'
type PosSession = {
  id: string
  number: number
  status: string
  openingCash: number
  totalSales: number
  resetInterval: string
  openedAt: string
}

export default function POSPage() {
  // Session state
  const [session, setSession] = useState<PosSession | null>(null)
  const [loadingSession, setLoadingSession] = useState(true)
  const [showOpenSession, setShowOpenSession] = useState(false)
  const [openingCash, setOpeningCash] = useState('')
  const [resetInterval, setResetInterval] = useState<'daily' | '2days' | 'weekly' | 'monthly'>('daily')
  const [openingSession, setOpeningSession] = useState(false)

  // Products state
  const [products, setProducts] = useState<Product[]>([])
  const [search, setSearch] = useState('')
  const [loadingProducts, setLoadingProducts] = useState(false)

  // Cart state
  const [cart, setCart] = useState<CartItem[]>([])

  // Payment state
  const [payMethod, setPayMethod] = useState<PayMethod>('CASH')
  const [amountReceived, setAmountReceived] = useState('')
  const [clientName, setClientName] = useState('')
  const [processing, setProcessing] = useState(false)

  // Success modal
  const [successData, setSuccessData] = useState<{
    invoiceNumber: string
    total: number
    change: number
    paymentMethod: string
  } | null>(null)

  // Close session modal
  const [showCloseSession, setShowCloseSession] = useState(false)
  const [closingCash, setClosingCash] = useState('')
  const [closingSession, setClosingSession] = useState(false)

  const searchRef = useRef<HTMLInputElement>(null)

  // Load current session on mount
  useEffect(() => {
    fetchSession()
  }, [])

  // Auto-focus search
  useEffect(() => {
    if (session && !showOpenSession) {
      setTimeout(() => searchRef.current?.focus(), 100)
    }
  }, [session, showOpenSession])

  // Search products when query changes
  useEffect(() => {
    const timer = setTimeout(() => fetchProducts(search), search ? 200 : 0)
    return () => clearTimeout(timer)
  }, [search])

  async function fetchSession() {
    setLoadingSession(true)
    try {
      const res = await fetch('/api/pos/sessions')
      const data = await res.json()
      const open = data.data?.find((s: PosSession) => s.status === 'OPEN')
      setSession(open ?? null)
      if (!open) setShowOpenSession(true)
    } catch {
      toast.error('Erreur de connexion')
    } finally {
      setLoadingSession(false)
    }
  }

  async function fetchProducts(q: string) {
    setLoadingProducts(true)
    try {
      const res = await fetch(`/api/pos/products?q=${encodeURIComponent(q)}`)
      const data = await res.json()
      setProducts(data.data ?? [])
    } catch {
      // ignore
    } finally {
      setLoadingProducts(false)
    }
  }

  async function openSession() {
    setOpeningSession(true)
    try {
      const res = await fetch('/api/pos/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ openingCash: Number(openingCash) || 0, resetInterval }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.message ?? 'Erreur'); return }
      setSession(data.data)
      setShowOpenSession(false)
      fetchProducts('')
      toast.success(`Session #${data.data.number} ouverte`)
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setOpeningSession(false)
    }
  }

  async function closeSession() {
    if (!session) return
    setClosingSession(true)
    try {
      const res = await fetch(`/api/pos/sessions/${session.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ closingCash: Number(closingCash) || 0 }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.message ?? 'Erreur'); return }
      setSession(null)
      setShowCloseSession(false)
      setCart([])
      setShowOpenSession(true)
      toast.success('Session fermée')
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setClosingSession(false)
    }
  }

  function addToCart(product: Product) {
    setCart(prev => {
      const existing = prev.find(i => i.id === product.id)
      if (existing) {
        if (existing.quantity >= Number(product.stockQty)) {
          toast.warning('Stock maximum atteint')
          return prev
        }
        return prev.map(i => i.id === product.id ? calcItem({ ...i, quantity: i.quantity + 1 }) : i)
      }
      if (Number(product.stockQty) <= 0) { toast.warning('Produit hors stock'); return prev }
      return [...prev, calcItem({ ...product, quantity: 1, lineTotal: 0, lineTax: 0 })]
    })
  }

  function calcItem(item: CartItem): CartItem {
    const ht       = item.quantity * Number(item.unitPrice)
    const lineTax  = Math.round(ht * (Number(item.taxRate) / 100) * 100) / 100
    const lineTotal = Math.round((ht + lineTax) * 100) / 100
    return { ...item, lineTax, lineTotal }
  }

  function updateQty(id: string, delta: number) {
    setCart(prev =>
      prev
        .map(i => i.id === id ? calcItem({ ...i, quantity: Math.max(0, i.quantity + delta) }) : i)
        .filter(i => i.quantity > 0)
    )
  }

  function removeFromCart(id: string) {
    setCart(prev => prev.filter(i => i.id !== id))
  }

  const subtotal = cart.reduce((s, i) => s + i.quantity * Number(i.unitPrice), 0)
  const taxTotal = cart.reduce((s, i) => s + i.lineTax, 0)
  const total    = Math.round((subtotal + taxTotal) * 100) / 100
  const received = Number(amountReceived) || 0
  const change   = payMethod === 'CASH' ? Math.max(0, received - total) : 0
  const canPay   = cart.length > 0 && (
    payMethod === 'DEBT' ? clientName.trim().length > 0 :
    payMethod === 'CASH' ? received >= total :
    true // CARD
  )

  async function processSale() {
    if (!session || !canPay) return
    setProcessing(true)
    try {
      const res = await fetch('/api/pos/sale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart.map(i => ({ productId: i.id, quantity: i.quantity })),
          paymentMethod: payMethod,
          amountPaid: payMethod === 'CASH' ? received : total,
          ...(payMethod === 'DEBT' ? { clientName } : {}),
        }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.message ?? 'Erreur lors de la vente'); return }

      setSuccessData({
        invoiceNumber: data.data.invoiceNumber,
        total:         data.data.total,
        change:        data.data.change,
        paymentMethod: data.data.paymentMethod,
      })
      setCart([])
      setAmountReceived('')
      setClientName('')
      setPayMethod('CASH')
      // Refresh session totals
      fetchSession()
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setProcessing(false)
    }
  }

  if (loadingSession) return (
    <div className="flex items-center justify-center h-[calc(100vh-56px)]">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  )

  return (
    <div className="flex flex-col h-[calc(100vh-56px)] bg-background">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-card shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="font-bold text-lg">Point de Vente</h1>
          {session ? (
            <Badge className="bg-green-500 text-white gap-1">
              <Unlock className="h-3 w-3" />
              Session #{session.number}
            </Badge>
          ) : (
            <Badge variant="destructive" className="gap-1">
              <Lock className="h-3 w-3" />
              Caisse fermée
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {session && (
            <>
              <div className="text-sm text-muted-foreground hidden sm:block">
                Ventes : <span className="font-semibold text-foreground da-amount">{formatDA(Number(session.totalSales))}</span>
              </div>
              <Button variant="outline" size="sm" asChild>
                <a href="/dashboard/pos/sessions">Historique</a>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <a href="/dashboard/pos/debts">Dettes</a>
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => { setClosingCash(String(session.totalSales)); setShowCloseSession(true) }}
              >
                <Lock className="h-3.5 w-3.5 mr-1.5" />Fermer la caisse
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Main layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Products */}
        <div className="flex-1 flex flex-col min-w-0 border-r">
          {/* Search bar */}
          <div className="p-3 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                ref={searchRef}
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Scan code-barres ou rechercher un produit... (SKU, nom)"
                className="pl-9 h-11 text-base"
                disabled={!session}
              />
            </div>
          </div>

          {/* Products grid */}
          <div className="flex-1 overflow-y-auto p-3">
            {!session ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
                <Lock className="h-12 w-12 opacity-30" />
                <p className="text-lg font-medium">Caisse fermée</p>
                <Button onClick={() => setShowOpenSession(true)}>Ouvrir la caisse</Button>
              </div>
            ) : loadingProducts ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : products.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                <Package className="h-8 w-8 mb-2 opacity-40" />
                <p>{search ? 'Aucun produit trouvé' : 'Aucun produit actif'}</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
                {products.map(p => {
                  const inCart = cart.find(i => i.id === p.id)
                  const outOfStock = Number(p.stockQty) <= 0
                  return (
                    <button
                      key={p.id}
                      onClick={() => addToCart(p)}
                      disabled={outOfStock}
                      className={cn(
                        'relative flex flex-col items-start p-3 rounded-xl border-2 text-left transition-all active:scale-95',
                        outOfStock
                          ? 'opacity-40 cursor-not-allowed border-border bg-muted'
                          : inCart
                          ? 'border-primary bg-primary/5 hover:bg-primary/10'
                          : 'border-border bg-card hover:border-primary/50 hover:bg-muted',
                      )}
                    >
                      {inCart && (
                        <span className="absolute top-1.5 right-1.5 w-5 h-5 bg-primary text-primary-foreground rounded-full text-[10px] font-bold flex items-center justify-center">
                          {inCart.quantity}
                        </span>
                      )}
                      <span className="font-medium text-sm leading-tight line-clamp-2 mb-1">{p.name}</span>
                      {p.sku && <span className="text-[10px] text-muted-foreground font-mono">{p.sku}</span>}
                      <span className="mt-2 text-primary font-bold da-amount">{formatDA(Number(p.unitPrice))}</span>
                      <span className={cn('text-[10px] mt-0.5', Number(p.stockQty) <= 3 ? 'text-amber-500' : 'text-muted-foreground')}>
                        {outOfStock ? 'Rupture' : `Stock: ${p.stockQty} ${p.unit ?? ''}`}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right: Cart + Payment */}
        <div className="w-80 xl:w-96 flex flex-col bg-card shrink-0">
          {/* Cart header */}
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              <span className="font-semibold">Panier</span>
              {cart.length > 0 && <Badge variant="secondary">{cart.length}</Badge>}
            </div>
            {cart.length > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setCart([])} className="text-muted-foreground h-7 text-xs">
                <RotateCcw className="h-3 w-3 mr-1" />Vider
              </Button>
            )}
          </div>

          {/* Cart items */}
          <div className="flex-1 overflow-y-auto">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-muted-foreground text-sm">
                <ShoppingCart className="h-8 w-8 mb-2 opacity-30" />
                Panier vide
              </div>
            ) : (
              <div className="divide-y">
                {cart.map(item => (
                  <div key={item.id} className="flex items-center gap-2 px-3 py-2.5">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.name}</p>
                      <p className="text-xs text-muted-foreground da-amount">{formatDA(Number(item.unitPrice))} × {item.quantity}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => updateQty(item.id, -1)}
                        className="w-6 h-6 rounded-md bg-muted hover:bg-muted-foreground/20 flex items-center justify-center"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="w-6 text-center text-sm font-bold">{item.quantity}</span>
                      <button
                        onClick={() => updateQty(item.id, +1)}
                        className="w-6 h-6 rounded-md bg-muted hover:bg-muted-foreground/20 flex items-center justify-center"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="w-6 h-6 rounded-md text-red-500 hover:bg-red-500/10 flex items-center justify-center ml-1"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                    <div className="text-sm font-semibold da-amount w-20 text-right shrink-0">
                      {formatDA(item.lineTotal)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Totals */}
          {cart.length > 0 && (
            <div className="border-t px-4 py-3 space-y-1.5 bg-muted/30">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Sous-total HT</span>
                <span className="da-amount">{formatDA(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>TVA</span>
                <span className="da-amount">{formatDA(taxTotal)}</span>
              </div>
              <div className="flex justify-between text-base font-bold border-t pt-1.5 mt-1.5">
                <span>TOTAL TTC</span>
                <span className="text-primary da-amount">{formatDA(total)}</span>
              </div>
            </div>
          )}

          {/* Payment panel */}
          <div className="border-t p-4 space-y-3">
            {/* Method tabs */}
            <div className="grid grid-cols-3 gap-1.5 rounded-xl bg-muted p-1">
              {(['CASH', 'CARD', 'DEBT'] as PayMethod[]).map(m => (
                <button
                  key={m}
                  onClick={() => setPayMethod(m)}
                  className={cn(
                    'flex flex-col items-center py-2 rounded-lg text-xs font-semibold transition-all gap-1',
                    payMethod === m
                      ? 'bg-background shadow text-foreground'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {m === 'CASH' && <Banknote className="h-4 w-4" />}
                  {m === 'CARD' && <CreditCard className="h-4 w-4" />}
                  {m === 'DEBT' && <UserCircle className="h-4 w-4" />}
                  {m === 'CASH' ? 'Espèces' : m === 'CARD' ? 'Carte' : 'Dette'}
                </button>
              ))}
            </div>

            {/* Cash input */}
            {payMethod === 'CASH' && (
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground font-medium">Montant reçu</label>
                <Input
                  type="number"
                  value={amountReceived}
                  onChange={e => setAmountReceived(e.target.value)}
                  placeholder={`Min. ${formatDA(total)}`}
                  className="h-12 text-lg font-bold text-center"
                />
                {received > 0 && received >= total && (
                  <div className={cn('flex justify-between items-center px-3 py-2 rounded-lg font-bold text-sm', change > 0 ? 'bg-green-500/10 text-green-600' : 'bg-muted')}>
                    <span>Monnaie à rendre</span>
                    <span className="da-amount text-base">{formatDA(change)}</span>
                  </div>
                )}
                {received > 0 && received < total && (
                  <div className="flex justify-between items-center px-3 py-2 rounded-lg bg-red-500/10 text-red-600 font-medium text-sm">
                    <span>Manque</span>
                    <span className="da-amount">{formatDA(total - received)}</span>
                  </div>
                )}
              </div>
            )}

            {/* Debt: client name */}
            {payMethod === 'DEBT' && (
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground font-medium">Nom du client *</label>
                <Input
                  value={clientName}
                  onChange={e => setClientName(e.target.value)}
                  placeholder="Nom et prénom"
                  className="h-11"
                />
                <p className="text-xs text-amber-600 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Cette vente sera enregistrée comme dette
                </p>
              </div>
            )}

            {payMethod === 'CARD' && (
              <div className="px-3 py-2 bg-blue-500/10 rounded-lg text-sm text-blue-600 text-center">
                Paiement par carte CIB / EDAHABIA
              </div>
            )}

            {/* Checkout button */}
            <Button
              onClick={processSale}
              disabled={!canPay || processing || !session}
              className="w-full h-14 text-lg font-bold"
            >
              {processing ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <CheckCircle2 className="h-5 w-5 mr-2" />
                  ENCAISSER {cart.length > 0 ? formatDA(total) : ''}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Open session modal */}
      <Dialog
        open={showOpenSession}
        onOpenChange={o => { if (!o && !session) return; setShowOpenSession(o) }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ouvrir la caisse</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Fonds de caisse initial (DA)</label>
              <Input
                type="number"
                value={openingCash}
                onChange={e => setOpeningCash(e.target.value)}
                placeholder="Ex: 5000"
                className="h-12 text-lg"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Réinitialisation automatique</label>
              <div className="grid grid-cols-2 gap-2">
                {([
                  ['daily', 'Chaque jour'],
                  ['2days', 'Tous les 2 jours'],
                  ['weekly', 'Chaque semaine'],
                  ['monthly', 'Chaque mois'],
                ] as const).map(([val, label]) => (
                  <button
                    key={val}
                    onClick={() => setResetInterval(val)}
                    className={cn(
                      'border-2 rounded-lg py-2.5 text-sm font-medium transition-colors',
                      resetInterval === val
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-border hover:border-muted-foreground',
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={openSession} disabled={openingSession} className="w-full h-11">
              {openingSession
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <><Unlock className="h-4 w-4 mr-2" />Ouvrir la caisse</>
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Close session modal */}
      <Dialog open={showCloseSession} onOpenChange={setShowCloseSession}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Fermer la caisse</DialogTitle>
          </DialogHeader>
          {session && (
            <div className="space-y-4 py-2">
              <div className="bg-muted rounded-xl p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ventes totales</span>
                  <span className="font-semibold da-amount">{formatDA(Number(session.totalSales))}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Fonds initial</span>
                  <span className="font-semibold da-amount">{formatDA(Number(session.openingCash))}</span>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Espèces comptées en caisse (DA)</label>
                <Input
                  type="number"
                  value={closingCash}
                  onChange={e => setClosingCash(e.target.value)}
                  placeholder="Montant compté"
                  className="h-12 text-lg"
                  autoFocus
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCloseSession(false)}>Annuler</Button>
            <Button variant="destructive" onClick={closeSession} disabled={closingSession}>
              {closingSession
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <><Lock className="h-4 w-4 mr-2" />Confirmer la fermeture</>
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Success ticket modal */}
      <Dialog open={!!successData} onOpenChange={o => { if (!o) setSuccessData(null) }}>
        <DialogContent className="sm:max-w-sm text-center">
          <DialogHeader>
            <DialogTitle className="text-center">
              <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-2" />
              Vente enregistrée !
            </DialogTitle>
          </DialogHeader>
          {successData && (
            <div className="space-y-3 py-2">
              <div className="bg-muted rounded-xl p-4 space-y-2 text-sm font-mono">
                <div className="text-xs text-muted-foreground">Ticket n°</div>
                <div className="text-lg font-bold">{successData.invoiceNumber}</div>
                <hr className="border-dashed" />
                <div className="flex justify-between">
                  <span>Total</span>
                  <span className="da-amount font-bold">{formatDA(successData.total)}</span>
                </div>
                {successData.paymentMethod === 'CASH' && successData.change > 0 && (
                  <div className="flex justify-between text-green-600 font-bold">
                    <span>Monnaie</span>
                    <span className="da-amount">{formatDA(successData.change)}</span>
                  </div>
                )}
                {successData.paymentMethod === 'DEBT' && (
                  <div className="bg-amber-500/10 text-amber-600 rounded-lg px-3 py-2 text-xs">
                    Dette enregistrée
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button className="w-full" onClick={() => { setSuccessData(null); searchRef.current?.focus() }}>
              Vente suivante
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
