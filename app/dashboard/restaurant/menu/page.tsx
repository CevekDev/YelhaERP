'use client'

import { useState, useEffect, useCallback } from 'react'
import { formatDA } from '@/lib/algerian/format'
import { toast } from 'sonner'
import {
  Loader2, Plus, ChevronUp, ChevronDown, UtensilsCrossed,
  Edit2, Image as ImageIcon,
} from 'lucide-react'
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
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { PageHeader } from '@/components/ui/page-header'

// ── Types ──────────────────────────────────────────────────────────────────────
type Category = {
  id: string
  name: string
  nameAr?: string | null
  description?: string | null
  sortOrder: number
  itemCount?: number
}

type Ingredient = { id: string; name: string; unit: string }

type ItemIngredient = { ingredientId: string; quantity: number }

type MenuItem = {
  id: string
  name: string
  nameAr?: string | null
  description?: string | null
  imageUrl?: string | null
  price: number
  taxRate: number
  preparationTime?: number | null
  isAvailable: boolean
  categoryId: string
  tags?: string[]
  allergens?: string[]
}

// ── Constants ──────────────────────────────────────────────────────────────────
const TAGS = ['populaire', 'nouveau', 'végétarien', 'épicé']
const ALLERGENS = ['gluten', 'lactose', 'arachides', 'œufs', 'poisson', 'fruits de mer', 'soja', 'sulfites']

// ── Component ──────────────────────────────────────────────────────────────────
export default function MenuPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [items, setItems] = useState<MenuItem[]>([])
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('ALL')
  const [loading, setLoading] = useState(true)

  // Category modal
  const [showCatModal, setShowCatModal] = useState(false)
  const [editingCat, setEditingCat] = useState<Category | null>(null)
  const [catName, setCatName] = useState('')
  const [catNameAr, setCatNameAr] = useState('')
  const [catDesc, setCatDesc] = useState('')
  const [savingCat, setSavingCat] = useState(false)

  // Item modal
  const [showItemModal, setShowItemModal] = useState(false)
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null)
  const [itemForm, setItemForm] = useState<Partial<MenuItem>>({})
  const [itemTags, setItemTags] = useState<string[]>([])
  const [itemAllergens, setItemAllergens] = useState<string[]>([])
  const [itemIngredients, setItemIngredients] = useState<ItemIngredient[]>([])
  const [savingItem, setSavingItem] = useState(false)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const [catRes, itemRes, ingRes] = await Promise.all([
        fetch('/api/restaurant/menu/categories'),
        fetch('/api/restaurant/menu/items'),
        fetch('/api/restaurant/ingredients'),
      ])
      const [catData, itemData, ingData] = await Promise.all([
        catRes.json(), itemRes.json(), ingRes.json(),
      ])
      setCategories(catData.data ?? [])
      setItems(itemData.data ?? [])
      setIngredients(ingData.data ?? [])
    } catch {
      toast.error('Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  // ── Category actions ──
  function openCatModal(cat?: Category) {
    setEditingCat(cat ?? null)
    setCatName(cat?.name ?? '')
    setCatNameAr(cat?.nameAr ?? '')
    setCatDesc(cat?.description ?? '')
    setShowCatModal(true)
  }

  async function saveCat() {
    if (!catName.trim()) { toast.error('Nom requis'); return }
    setSavingCat(true)
    try {
      const url = editingCat ? `/api/restaurant/menu/categories/${editingCat.id}` : '/api/restaurant/menu/categories'
      const method = editingCat ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: catName, nameAr: catNameAr || null, description: catDesc || null }),
      })
      if (!res.ok) { toast.error('Erreur'); return }
      toast.success(editingCat ? 'Catégorie modifiée' : 'Catégorie créée')
      setShowCatModal(false)
      fetchAll()
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setSavingCat(false)
    }
  }

  async function moveCat(cat: Category, dir: 'up' | 'down') {
    const sorted = [...categories].sort((a, b) => a.sortOrder - b.sortOrder)
    const idx = sorted.findIndex(c => c.id === cat.id)
    const swapIdx = dir === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= sorted.length) return
    const swap = sorted[swapIdx]
    try {
      await Promise.all([
        fetch(`/api/restaurant/menu/categories/${cat.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sortOrder: swap.sortOrder }),
        }),
        fetch(`/api/restaurant/menu/categories/${swap.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sortOrder: cat.sortOrder }),
        }),
      ])
      fetchAll()
    } catch { toast.error('Erreur') }
  }

  // ── Item actions ──
  function openItemModal(item?: MenuItem) {
    setEditingItem(item ?? null)
    setItemForm(item ? { ...item } : { isAvailable: true, taxRate: 9, preparationTime: 10, categoryId: selectedCategoryId !== 'ALL' ? selectedCategoryId : '' })
    setItemTags(item?.tags ?? [])
    setItemAllergens(item?.allergens ?? [])
    setItemIngredients([])
    setShowItemModal(true)
  }

  async function toggleAvailability(item: MenuItem) {
    try {
      const res = await fetch(`/api/restaurant/menu/items/${item.id}/availability`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isAvailable: !item.isAvailable }),
      })
      if (!res.ok) { toast.error('Erreur'); return }
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, isAvailable: !i.isAvailable } : i))
    } catch {
      toast.error('Erreur réseau')
    }
  }

  async function saveItem() {
    if (!itemForm.name?.trim()) { toast.error('Nom requis'); return }
    if (!itemForm.categoryId) { toast.error('Catégorie requise'); return }
    if (!itemForm.price || Number(itemForm.price) <= 0) { toast.error('Prix invalide'); return }
    setSavingItem(true)
    try {
      const url = editingItem ? `/api/restaurant/menu/items/${editingItem.id}` : '/api/restaurant/menu/items'
      const method = editingItem ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...itemForm,
          price: Number(itemForm.price),
          taxRate: Number(itemForm.taxRate ?? 9),
          preparationTime: Number(itemForm.preparationTime ?? 10),
          tags: itemTags,
          allergens: itemAllergens,
          ingredients: itemIngredients,
        }),
      })
      if (!res.ok) { toast.error('Erreur'); return }
      toast.success(editingItem ? 'Article modifié' : 'Article créé')
      setShowItemModal(false)
      fetchAll()
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setSavingItem(false)
    }
  }

  function toggleTag(tag: string) {
    setItemTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])
  }

  function toggleAllergen(a: string) {
    setItemAllergens(prev => prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a])
  }

  function addIngredientRow() {
    setItemIngredients(prev => [...prev, { ingredientId: '', quantity: 1 }])
  }
  function updateIngRow(idx: number, field: keyof ItemIngredient, value: string | number) {
    setItemIngredients(prev => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r))
  }
  function removeIngRow(idx: number) {
    setItemIngredients(prev => prev.filter((_, i) => i !== idx))
  }

  const sortedCats = [...categories].sort((a, b) => a.sortOrder - b.sortOrder)
  const filteredItems = selectedCategoryId === 'ALL'
    ? items
    : items.filter(i => i.categoryId === selectedCategoryId)

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  )

  return (
    <div className="p-4 md:p-6">
      <PageHeader
        title="Restaurant — Menu"
        description="Gérez vos catégories et articles"
        actionLabel="Ajouter un article"
        onAction={() => openItemModal()}
      />

      <div className="flex gap-6">
        {/* Left sidebar — Categories */}
        <div className="w-64 shrink-0">
          <div className="border rounded-xl overflow-hidden">
            <div className="bg-muted/50 px-3 py-2 flex items-center justify-between">
              <span className="text-sm font-semibold">Catégories</span>
              <button
                onClick={() => openCatModal()}
                className="text-primary hover:text-primary/80 transition-colors"
                title="Ajouter une catégorie"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <div className="divide-y">
              <button
                onClick={() => setSelectedCategoryId('ALL')}
                className={`w-full flex items-center justify-between px-3 py-2.5 text-sm hover:bg-muted/50 transition-colors ${selectedCategoryId === 'ALL' ? 'bg-primary/5 text-primary font-semibold' : ''}`}
              >
                <span>Tout le menu</span>
                <Badge variant="secondary" className="text-xs">{items.length}</Badge>
              </button>
              {sortedCats.map((cat, idx) => (
                <div
                  key={cat.id}
                  className={`flex items-center justify-between px-3 py-2 hover:bg-muted/50 transition-colors ${selectedCategoryId === cat.id ? 'bg-primary/5' : ''}`}
                >
                  <button
                    className={`flex-1 text-left text-sm ${selectedCategoryId === cat.id ? 'text-primary font-semibold' : ''}`}
                    onClick={() => setSelectedCategoryId(cat.id)}
                  >
                    {cat.name}
                    {cat.itemCount !== undefined && (
                      <span className="ml-2 text-xs text-muted-foreground">({cat.itemCount})</span>
                    )}
                  </button>
                  <div className="flex items-center gap-0.5">
                    <button
                      onClick={() => moveCat(cat, 'up')}
                      disabled={idx === 0}
                      className="p-0.5 rounded hover:bg-muted disabled:opacity-30"
                    >
                      <ChevronUp className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => moveCat(cat, 'down')}
                      disabled={idx === sortedCats.length - 1}
                      className="p-0.5 rounded hover:bg-muted disabled:opacity-30"
                    >
                      <ChevronDown className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => openCatModal(cat)}
                      className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                    >
                      <Edit2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right — Items */}
        <div className="flex-1">
          {filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground border-2 border-dashed rounded-xl">
              <UtensilsCrossed className="h-10 w-10 mb-3 opacity-30" />
              <p>Aucun article dans cette catégorie</p>
              <Button className="mt-3" size="sm" onClick={() => openItemModal()}>
                <Plus className="h-4 w-4 mr-1.5" />Ajouter un article
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredItems.map(item => (
                <div key={item.id} className="border rounded-xl overflow-hidden bg-card shadow-sm hover:shadow-md transition-shadow">
                  {/* Image placeholder */}
                  <div className="h-32 bg-gray-100 flex items-center justify-center relative">
                    {item.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon className="h-10 w-10 text-gray-300" />
                    )}
                    {/* Tags */}
                    <div className="absolute top-2 left-2 flex gap-1 flex-wrap">
                      {(item.tags ?? []).map(tag => (
                        <span key={tag} className="bg-white/80 text-xs font-medium px-1.5 py-0.5 rounded-full text-gray-700">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="p-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold leading-tight">{item.name}</p>
                        {item.nameAr && <p className="text-xs text-muted-foreground mt-0.5 font-arabic">{item.nameAr}</p>}
                      </div>
                      <button
                        onClick={() => openItemModal(item)}
                        className="text-muted-foreground hover:text-foreground p-1 rounded hover:bg-muted"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    {item.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.description}</p>
                    )}
                    <div className="flex items-center justify-between mt-3">
                      <span className="font-bold text-primary da-amount">{formatDA(item.price)}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {item.isAvailable ? 'Disponible' : 'Indisponible'}
                        </span>
                        <Switch
                          checked={item.isAvailable}
                          onCheckedChange={() => toggleAvailability(item)}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              <button
                onClick={() => openItemModal()}
                className="border-2 border-dashed rounded-xl h-52 flex flex-col items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors"
              >
                <Plus className="h-8 w-8 mb-2" />
                Ajouter un article
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Category Modal */}
      <Dialog open={showCatModal} onOpenChange={setShowCatModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingCat ? 'Modifier la catégorie' : 'Nouvelle catégorie'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nom (FR) *</Label>
              <Input value={catName} onChange={e => setCatName(e.target.value)} placeholder="Ex: Entrées" />
            </div>
            <div className="space-y-2">
              <Label>Nom (AR)</Label>
              <Input value={catNameAr} onChange={e => setCatNameAr(e.target.value)} placeholder="اسم الفئة" dir="rtl" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={catDesc} onChange={e => setCatDesc(e.target.value)} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCatModal(false)}>Annuler</Button>
            <Button onClick={saveCat} disabled={savingCat}>
              {savingCat ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Item Modal */}
      <Dialog open={showItemModal} onOpenChange={setShowItemModal}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Modifier l\'article' : 'Nouvel article'}</DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="general">
            <TabsList className="mb-4">
              <TabsTrigger value="general">Général</TabsTrigger>
              <TabsTrigger value="ingredients">Ingrédients</TabsTrigger>
            </TabsList>
            <TabsContent value="general" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nom (FR) *</Label>
                  <Input
                    value={itemForm.name ?? ''}
                    onChange={e => setItemForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Ex: Brochette mixte"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Nom (AR)</Label>
                  <Input
                    value={itemForm.nameAr ?? ''}
                    onChange={e => setItemForm(f => ({ ...f, nameAr: e.target.value }))}
                    placeholder="اسم الطبق"
                    dir="rtl"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Catégorie *</Label>
                <Select
                  value={itemForm.categoryId ?? ''}
                  onValueChange={v => setItemForm(f => ({ ...f, categoryId: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir une catégorie" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={itemForm.description ?? ''}
                  onChange={e => setItemForm(f => ({ ...f, description: e.target.value }))}
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Prix (DA) *</Label>
                  <Input
                    type="number"
                    value={itemForm.price ?? ''}
                    onChange={e => setItemForm(f => ({ ...f, price: Number(e.target.value) }))}
                    placeholder="1500"
                  />
                </div>
                <div className="space-y-2">
                  <Label>TVA (%)</Label>
                  <Input
                    type="number"
                    value={itemForm.taxRate ?? 9}
                    onChange={e => setItemForm(f => ({ ...f, taxRate: Number(e.target.value) }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Préparation (min)</Label>
                  <Input
                    type="number"
                    value={itemForm.preparationTime ?? ''}
                    onChange={e => setItemForm(f => ({ ...f, preparationTime: Number(e.target.value) }))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>URL de l'image</Label>
                <Input
                  value={itemForm.imageUrl ?? ''}
                  onChange={e => setItemForm(f => ({ ...f, imageUrl: e.target.value }))}
                  placeholder="https://..."
                />
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  checked={itemForm.isAvailable ?? true}
                  onCheckedChange={v => setItemForm(f => ({ ...f, isAvailable: v }))}
                />
                <Label>Disponible</Label>
              </div>
              {/* Tags */}
              <div className="space-y-2">
                <Label>Tags</Label>
                <div className="flex flex-wrap gap-2">
                  {TAGS.map(tag => (
                    <button
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      className={`px-3 py-1 rounded-full text-sm border-2 transition-colors ${
                        itemTags.includes(tag)
                          ? 'border-primary bg-primary/10 text-primary font-medium'
                          : 'border-border text-muted-foreground hover:border-muted-foreground'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
              {/* Allergens */}
              <div className="space-y-2">
                <Label>Allergènes</Label>
                <div className="flex flex-wrap gap-2">
                  {ALLERGENS.map(a => (
                    <label key={a} className="flex items-center gap-1.5 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={itemAllergens.includes(a)}
                        onChange={() => toggleAllergen(a)}
                        className="rounded"
                      />
                      {a}
                    </label>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="ingredients" className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Liez des ingrédients du stock à cet article pour le suivi des consommations.
              </p>
              {itemIngredients.map((row, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <Select
                    value={row.ingredientId}
                    onValueChange={v => updateIngRow(idx, 'ingredientId', v)}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Choisir un ingrédient" />
                    </SelectTrigger>
                    <SelectContent>
                      {ingredients.map(i => (
                        <SelectItem key={i.id} value={i.id}>{i.name} ({i.unit})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    value={row.quantity}
                    onChange={e => updateIngRow(idx, 'quantity', Number(e.target.value))}
                    className="w-24"
                    placeholder="Qté"
                  />
                  <button
                    onClick={() => removeIngRow(idx)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Plus className="h-4 w-4 rotate-45" />
                  </button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addIngredientRow}>
                <Plus className="h-4 w-4 mr-1.5" />Ajouter un ingrédient
              </Button>
            </TabsContent>
          </Tabs>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowItemModal(false)}>Annuler</Button>
            <Button onClick={saveItem} disabled={savingItem}>
              {savingItem ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
