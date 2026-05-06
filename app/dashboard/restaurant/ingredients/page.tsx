'use client'

import { useState, useEffect, useCallback } from 'react'
import { formatDA } from '@/lib/algerian/format'
import { toast } from 'sonner'
import { Loader2, Plus, AlertTriangle, Edit2, ArrowDownUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { PageHeader } from '@/components/ui/page-header'

// ── Types ──────────────────────────────────────────────────────────────────────
type Ingredient = {
  id: string
  name: string
  unit: string
  currentStock: number
  minStock: number
  unitCost: number
  isActive: boolean
}

type StockMoveType = 'IN' | 'WASTE' | 'ADJUSTMENT'

// ── Component ──────────────────────────────────────────────────────────────────
export default function IngredientsPage() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [loading, setLoading] = useState(true)

  // Ingredient form modal
  const [showIngModal, setShowIngModal] = useState(false)
  const [editingIng, setEditingIng] = useState<Ingredient | null>(null)
  const [ingForm, setIngForm] = useState({
    name: '', unit: 'kg', currentStock: 0, minStock: 0, unitCost: 0,
  })
  const [savingIng, setSavingIng] = useState(false)

  // Stock move modal
  const [showStockModal, setShowStockModal] = useState(false)
  const [stockTarget, setStockTarget] = useState<Ingredient | null>(null)
  const [stockForm, setStockForm] = useState({
    quantity: '', type: 'IN' as StockMoveType, unitCost: '', note: '',
  })
  const [savingStock, setSavingStock] = useState(false)

  const fetchIngredients = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/restaurant/ingredients')
      const data = await res.json()
      setIngredients(data.data ?? [])
    } catch {
      toast.error('Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchIngredients() }, [fetchIngredients])

  const lowStock = ingredients.filter(i => i.currentStock <= i.minStock)

  // ── Ingredient CRUD ──
  function openIngModal(ing?: Ingredient) {
    setEditingIng(ing ?? null)
    setIngForm(ing ? {
      name: ing.name,
      unit: ing.unit,
      currentStock: ing.currentStock,
      minStock: ing.minStock,
      unitCost: ing.unitCost,
    } : { name: '', unit: 'kg', currentStock: 0, minStock: 0, unitCost: 0 })
    setShowIngModal(true)
  }

  async function saveIngredient() {
    if (!ingForm.name.trim()) { toast.error('Nom requis'); return }
    setSavingIng(true)
    try {
      const url = editingIng ? `/api/restaurant/ingredients/${editingIng.id}` : '/api/restaurant/ingredients'
      const method = editingIng ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: ingForm.name,
          unit: ingForm.unit,
          currentStock: Number(ingForm.currentStock),
          minStock: Number(ingForm.minStock),
          unitCost: Number(ingForm.unitCost),
        }),
      })
      if (!res.ok) { toast.error('Erreur'); return }
      toast.success(editingIng ? 'Ingrédient modifié' : 'Ingrédient créé')
      setShowIngModal(false)
      fetchIngredients()
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setSavingIng(false)
    }
  }

  // ── Stock move ──
  function openStockModal(ing: Ingredient) {
    setStockTarget(ing)
    setStockForm({ quantity: '', type: 'IN', unitCost: String(ing.unitCost), note: '' })
    setShowStockModal(true)
  }

  async function saveStockMove() {
    if (!stockTarget) return
    if (!stockForm.quantity || Number(stockForm.quantity) <= 0) { toast.error('Quantité invalide'); return }
    setSavingStock(true)
    try {
      const res = await fetch(`/api/restaurant/ingredients/${stockTarget.id}/stock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quantity: Number(stockForm.quantity),
          type: stockForm.type,
          unitCost: Number(stockForm.unitCost) || null,
          note: stockForm.note || null,
        }),
      })
      if (!res.ok) { toast.error('Erreur'); return }
      toast.success('Stock mis à jour')
      setShowStockModal(false)
      fetchIngredients()
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setSavingStock(false)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  )

  return (
    <div className="p-4 md:p-6">
      <PageHeader
        title="Restaurant — Stocks Cuisine"
        description="Gérez vos ingrédients et stocks"
        actionLabel="Ajouter un ingrédient"
        onAction={() => openIngModal()}
      />

      {/* Alert banner */}
      {lowStock.length > 0 && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-5">
          <AlertTriangle className="h-5 w-5 text-red-500 shrink-0" />
          <div>
            <p className="font-semibold text-red-800 text-sm">
              {lowStock.length} ingrédient(s) sous le seuil d'alerte
            </p>
            <p className="text-xs text-red-600 mt-0.5">
              {lowStock.map(i => i.name).join(', ')}
            </p>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ingrédient</TableHead>
              <TableHead>Unité</TableHead>
              <TableHead>Stock actuel</TableHead>
              <TableHead>Seuil d'alerte</TableHead>
              <TableHead>Coût unitaire</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ingredients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Aucun ingrédient enregistré
                </TableCell>
              </TableRow>
            ) : ingredients.map(ing => {
              const isLow = ing.currentStock <= ing.minStock
              return (
                <TableRow key={ing.id} className={isLow ? 'bg-red-50/50' : ''}>
                  <TableCell className="font-medium">{ing.name}</TableCell>
                  <TableCell className="text-muted-foreground">{ing.unit}</TableCell>
                  <TableCell>
                    <span className={`font-semibold ${isLow ? 'text-red-600' : 'text-foreground'}`}>
                      {ing.currentStock} {ing.unit}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {ing.minStock} {ing.unit}
                  </TableCell>
                  <TableCell className="da-amount">{formatDA(ing.unitCost)}/{ing.unit}</TableCell>
                  <TableCell>
                    {isLow ? (
                      <Badge className="bg-red-100 text-red-700 hover:bg-red-100">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Stock bas
                      </Badge>
                    ) : (
                      <Badge className="bg-green-100 text-green-700 hover:bg-green-100">OK</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openStockModal(ing)}
                      >
                        <ArrowDownUp className="h-3.5 w-3.5 mr-1" />
                        Stock
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openIngModal(ing)}
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {/* Ingredient Modal */}
      <Dialog open={showIngModal} onOpenChange={setShowIngModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingIng ? 'Modifier l\'ingrédient' : 'Nouvel ingrédient'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-2">
                <Label>Nom *</Label>
                <Input
                  value={ingForm.name}
                  onChange={e => setIngForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Ex: Viande hachée"
                />
              </div>
              <div className="space-y-2">
                <Label>Unité *</Label>
                <Select value={ingForm.unit} onValueChange={v => setIngForm(f => ({ ...f, unit: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {['kg', 'g', 'L', 'mL', 'pièce', 'boîte', 'sac', 'litre'].map(u => (
                      <SelectItem key={u} value={u}>{u}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Coût unitaire (DA)</Label>
                <Input
                  type="number"
                  value={ingForm.unitCost}
                  onChange={e => setIngForm(f => ({ ...f, unitCost: Number(e.target.value) }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Stock actuel</Label>
                <Input
                  type="number"
                  value={ingForm.currentStock}
                  onChange={e => setIngForm(f => ({ ...f, currentStock: Number(e.target.value) }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Seuil d'alerte</Label>
                <Input
                  type="number"
                  value={ingForm.minStock}
                  onChange={e => setIngForm(f => ({ ...f, minStock: Number(e.target.value) }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowIngModal(false)}>Annuler</Button>
            <Button onClick={saveIngredient} disabled={savingIng}>
              {savingIng ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stock Move Modal */}
      <Dialog open={showStockModal} onOpenChange={setShowStockModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Mouvement de stock — {stockTarget?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {stockTarget && (
              <div className="bg-muted/50 rounded-lg px-4 py-3 text-sm">
                <span className="text-muted-foreground">Stock actuel : </span>
                <span className={`font-semibold ${stockTarget.currentStock <= stockTarget.minStock ? 'text-red-600' : ''}`}>
                  {stockTarget.currentStock} {stockTarget.unit}
                </span>
              </div>
            )}
            <div className="space-y-2">
              <Label>Type de mouvement *</Label>
              <div className="grid grid-cols-3 gap-2">
                {([
                  ['IN', 'Entrée', 'bg-green-100 text-green-800'],
                  ['WASTE', 'Perte', 'bg-red-100 text-red-800'],
                  ['ADJUSTMENT', 'Ajustement', 'bg-blue-100 text-blue-800'],
                ] as [StockMoveType, string, string][]).map(([val, label, cls]) => (
                  <button
                    key={val}
                    onClick={() => setStockForm(f => ({ ...f, type: val }))}
                    className={`border-2 rounded-lg py-2 text-sm font-medium transition-colors ${
                      stockForm.type === val
                        ? `border-primary ${cls}`
                        : 'border-border hover:border-muted-foreground'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Quantité *</Label>
                <Input
                  type="number"
                  value={stockForm.quantity}
                  onChange={e => setStockForm(f => ({ ...f, quantity: e.target.value }))}
                  placeholder={`En ${stockTarget?.unit ?? ''}`}
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label>Coût unitaire (DA)</Label>
                <Input
                  type="number"
                  value={stockForm.unitCost}
                  onChange={e => setStockForm(f => ({ ...f, unitCost: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Note</Label>
              <Textarea
                value={stockForm.note}
                onChange={e => setStockForm(f => ({ ...f, note: e.target.value }))}
                placeholder="Raison, fournisseur..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStockModal(false)}>Annuler</Button>
            <Button onClick={saveStockMove} disabled={savingStock}>
              {savingStock ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Valider'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
