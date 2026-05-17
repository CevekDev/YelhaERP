'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Header } from '@/components/layout/header'
import { PageHeader } from '@/components/ui/page-header'
import { DataTable } from '@/components/ui/data-table'
import { SearchInput } from '@/components/ui/search-input'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatDA } from '@/lib/algerian/format'
import { toast } from 'sonner'
import { Package, ScanLine, Plus, Trash2, AlertTriangle, Weight, Ruler, Tag } from 'lucide-react'
import { TutorialOverlay } from '@/components/tutorial/tutorial-overlay'
import { useT } from '@/lib/i18n'

interface ProductVariant {
  id?: string
  name: string
  sku?: string
  barcode?: string
  size?: string
  color?: string
  stockQty: number
  priceOverride?: number | null
}

interface Product {
  id: string
  name: string
  sku?: string
  barcode?: string
  unitPrice: number
  stockQty: number
  stockAlert: number
  unit?: string
  taxRate: number
  weight?: number | null
  dimensions?: string | null
  format?: string | null
  isFragile: boolean
  variants?: ProductVariant[]
}

type CompanyProfile = { businessType: 'RC' | 'AE' | 'NONE'; rc?: string | null }

const PRESET_SIZES_CLOTHING = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL']
const PRESET_SIZES_SHOES = Array.from({ length: 20 }, (_, i) => String(34 + i))
const PRESET_COLORS = ['Blanc', 'Noir', 'Rouge', 'Bleu', 'Vert', 'Jaune', 'Gris', 'Marron', 'Beige', 'Rose', 'Violet', 'Orange']

const emptyForm = {
  name: '', sku: '', barcode: '', description: '', unitPrice: '',
  taxRate: '19', stockAlert: '0', unit: '',
  weight: '', dimensions: '', format: '', isFragile: false,
}
const emptyVariant: ProductVariant = { name: '', sku: '', barcode: '', size: '', color: '', stockQty: 0 }

export default function ProductsPage() {
  const { t } = useT()
  const [products, setProducts] = useState<Product[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [variants, setVariants] = useState<ProductVariant[]>([])
  const [newVariant, setNewVariant] = useState<ProductVariant>(emptyVariant)
  const [company, setCompany] = useState<CompanyProfile | null>(null)
  const [scanning, setScanning] = useState(false)
  const barcodeInputRef = useRef<HTMLInputElement>(null)

  const fetch_ = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), limit: '20', ...(search && { search }) })
    const res = await fetch(`/api/products?${params}`)
    if (res.ok) { const d = await res.json(); setProducts(d.products); setTotal(d.total) }
    setLoading(false)
  }, [page, search])

  useEffect(() => { fetch_() }, [fetch_])

  useEffect(() => {
    fetch('/api/company/profile').then(r => r.json()).then(d => {
      if (d?.businessType) setCompany(d)
    }).catch(() => {})
  }, [])

  const hasRC = company ? (company.businessType === 'RC' || company.businessType === 'AE') : true

  function setField(key: keyof typeof emptyForm, value: string | boolean) {
    setForm(f => ({ ...f, [key]: value }))
  }

  // Barcode scanner: focus the barcode input and let USB scanner type into it
  function startScan() {
    setScanning(true)
    setTimeout(() => barcodeInputRef.current?.focus(), 100)
  }

  function onBarcodeKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    // USB barcode scanners send Enter after the barcode
    if (e.key === 'Enter') {
      setScanning(false)
      e.preventDefault()
    }
  }

  function addVariant() {
    if (!newVariant.name.trim()) { toast.error('Nom de la variante requis'); return }
    setVariants(v => [...v, { ...newVariant }])
    setNewVariant(emptyVariant)
  }

  function removeVariant(idx: number) {
    setVariants(v => v.filter((_, i) => i !== idx))
  }

  const handleSave = async () => {
    if (!form.name) { toast.error('Nom requis'); return }
    if (!form.unitPrice) { toast.error('Prix requis'); return }
    setSaving(true)
    try {
      const payload = {
        name: form.name,
        sku: form.sku || null,
        barcode: form.barcode || null,
        description: '',
        unitPrice: Number(form.unitPrice),
        taxRate: hasRC ? Number(form.taxRate) : 0,
        stockAlert: Number(form.stockAlert),
        unit: form.unit || null,
        weight: form.weight ? Number(form.weight) : null,
        dimensions: form.dimensions || null,
        format: form.format || null,
        isFragile: form.isFragile,
      }
      const res = await fetch('/api/products', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) { const e = await res.json(); toast.error(e.error ?? 'Erreur'); return }
      const created = await res.json()

      // Create variants if any
      for (const v of variants) {
        await fetch(`/api/products/${created.id}/variants`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(v),
        })
      }

      toast.success('Produit créé')
      setOpen(false)
      setForm(emptyForm)
      setVariants([])
      fetch_()
    } finally {
      setSaving(false)
    }
  }

  const columns = [
    { key: 'name', header: t('common.name'), render: (r: Product) => (
      <div className="flex items-center gap-2">
        <span className="font-medium">{r.name}</span>
        {r.isFragile && <Badge variant="outline" className="text-orange-500 border-orange-300 text-[10px] gap-1"><AlertTriangle className="h-2.5 w-2.5" />Fragile</Badge>}
        {r.variants && r.variants.length > 0 && <Badge variant="secondary" className="text-[10px]">{r.variants.length} variante{r.variants.length > 1 ? 's' : ''}</Badge>}
      </div>
    )},
    { key: 'sku', header: t('pages.products_col_sku'), className: 'hidden sm:table-cell', render: (r: Product) => (
      <div className="font-mono text-xs space-y-0.5">
        {r.sku && <div>{r.sku}</div>}
        {r.barcode && <div className="text-muted-foreground">{r.barcode}</div>}
        {!r.sku && !r.barcode && <span className="text-muted-foreground">—</span>}
      </div>
    )},
    { key: 'unitPrice', header: t('pages.products_col_price'), className: 'da-amount text-right',
      render: (r: Product) => formatDA(Number(r.unitPrice)) },
    { key: 'taxRate', header: 'TVA', render: (r: Product) => Number(r.taxRate) === 0 ? <span className="text-muted-foreground">Exonéré</span> : `${Number(r.taxRate)}%` },
    { key: 'stockQty', header: t('pages.products_col_stock'), render: (r: Product) => {
      const low = Number(r.stockQty) <= Number(r.stockAlert)
      return (
        <span className={low ? 'text-red-600 font-medium' : 'text-yelha-600'}>
          {Number(r.stockQty)} {r.unit ?? ''}
          {low && <Badge variant="destructive" className="ml-2 text-[10px]">Alerte</Badge>}
        </span>
      )
    }},
    { key: 'details', header: 'Détails', className: 'hidden lg:table-cell', render: (r: Product) => (
      <div className="text-xs text-muted-foreground space-y-0.5">
        {r.weight && <span className="flex items-center gap-1"><Weight className="h-3 w-3" />{r.weight} kg</span>}
        {r.dimensions && <span className="flex items-center gap-1"><Ruler className="h-3 w-3" />{r.dimensions}</span>}
        {r.format && <span className="flex items-center gap-1"><Tag className="h-3 w-3" />{r.format}</span>}
      </div>
    )},
  ]

  return (
    <div>
      <Header title={t('pages.products_title')} />
      <div className="p-4 md:p-6">
        <PageHeader
          title={t('pages.products_title')}
          description={`${total} ${t('pages.products_title').toLowerCase()}`}
          actionLabel={t('pages.products_new')}
          onAction={() => { setOpen(true); setForm(emptyForm); setVariants([]) }}
          actionDataTutorial="new-product"
        />
        <Card>
          <div className="p-4 border-b">
            <SearchInput placeholder={t('common.search')} onSearch={v => { setSearch(v); setPage(1) }} />
          </div>
          <CardContent className="p-0">
            <DataTable
              data={products as unknown as Record<string, unknown>[]}
              columns={columns as never}
              total={total} page={page} limit={20} onPageChange={setPage} loading={loading}
              emptyIcon={Package} emptyText="Aucun produit"
              emptyDescription="Créez votre catalogue produits et services."
              emptyAction={{ label: 'Ajouter un produit', onClick: () => setOpen(true) }}
            />
          </CardContent>
        </Card>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Nouveau produit / service</DialogTitle></DialogHeader>

          <Tabs defaultValue="general">
            <TabsList className="grid grid-cols-3 w-full">
              <TabsTrigger value="general">Général</TabsTrigger>
              <TabsTrigger value="details">Détails</TabsTrigger>
              <TabsTrigger value="variants">Variantes</TabsTrigger>
            </TabsList>

            {/* ---- ONGLET GÉNÉRAL ---- */}
            <TabsContent value="general" className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-2">
                  <Label>Nom *</Label>
                  <Input value={form.name} onChange={e => setField('name', e.target.value)} placeholder="Ex: Chaussures Nike Air Max" />
                </div>

                <div className="space-y-2">
                  <Label>SKU (référence interne)</Label>
                  <Input value={form.sku} onChange={e => setField('sku', e.target.value)} placeholder="REF-001" />
                </div>

                <div className="space-y-2">
                  <Label>Code-barres (EAN/QR)</Label>
                  <div className="flex gap-2">
                    <Input
                      ref={barcodeInputRef}
                      value={form.barcode}
                      onChange={e => setField('barcode', e.target.value)}
                      onKeyDown={onBarcodeKeyDown}
                      placeholder={scanning ? '🔵 Scannez maintenant...' : '3012345678901'}
                      className={scanning ? 'border-blue-500 ring-1 ring-blue-400' : ''}
                    />
                    <Button type="button" variant="outline" size="icon" onClick={startScan} title="Scanner avec un lecteur USB">
                      <ScanLine className="h-4 w-4" />
                    </Button>
                  </div>
                  {scanning && <p className="text-xs text-blue-600">Pointez votre scanner vers le code-barres puis appuyez sur le lecteur.</p>}
                </div>

                <div className="space-y-2">
                  <Label>Prix unitaire (DA) *</Label>
                  <Input type="number" min="0" value={form.unitPrice} onChange={e => setField('unitPrice', e.target.value)} />
                </div>

                {hasRC ? (
                  <div className="space-y-2">
                    <Label>TVA %</Label>
                    <Input type="number" min="0" max="100" value={form.taxRate} onChange={e => setField('taxRate', e.target.value)} />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label>TVA</Label>
                    <div className="flex items-center gap-2 h-10 px-3 border rounded-md bg-muted text-muted-foreground text-sm">
                      Exonéré (sans RC)
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Unité</Label>
                  <Input placeholder="pcs, kg, h, m..." value={form.unit} onChange={e => setField('unit', e.target.value)} />
                </div>

                <div className="space-y-2" data-tutorial="stock-alert">
                  <Label>Seuil alerte stock</Label>
                  <Input type="number" min="0" value={form.stockAlert} onChange={e => setField('stockAlert', e.target.value)} />
                </div>
              </div>
            </TabsContent>

            {/* ---- ONGLET DÉTAILS ---- */}
            <TabsContent value="details" className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Poids (kg)</Label>
                  <Input type="number" min="0" step="0.001" placeholder="0.500" value={form.weight} onChange={e => setField('weight', e.target.value)} />
                </div>

                <div className="space-y-2">
                  <Label>Dimensions (L×l×h)</Label>
                  <Input placeholder="30x20x10 cm" value={form.dimensions} onChange={e => setField('dimensions', e.target.value)} />
                </div>

                <div className="space-y-2">
                  <Label>Format / Taille</Label>
                  <Input placeholder="A4, A3, 58mm, 80mm..." value={form.format} onChange={e => setField('format', e.target.value)} />
                </div>

                <div className="space-y-2">
                  <Label>Produit fragile</Label>
                  <div className="flex items-center gap-3 h-10">
                    <Switch
                      checked={form.isFragile}
                      onCheckedChange={v => setField('isFragile', v)}
                    />
                    <span className="text-sm text-muted-foreground">
                      {form.isFragile ? <span className="text-orange-600 font-medium flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5" />Fragile</span> : 'Non fragile'}
                    </span>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* ---- ONGLET VARIANTES ---- */}
            <TabsContent value="variants" className="space-y-4 pt-2">
              <p className="text-sm text-muted-foreground">Ajoutez des variantes pour les pointures, tailles (S/M/L), couleurs, etc. Chaque variante a son propre stock.</p>

              {/* Liste des variantes ajoutées */}
              {variants.length > 0 && (
                <div className="border rounded-lg divide-y">
                  {variants.map((v, i) => (
                    <div key={i} className="flex items-center justify-between px-3 py-2 text-sm">
                      <div className="flex items-center gap-3">
                        <span className="font-medium">{v.name}</span>
                        {v.size && <Badge variant="outline" className="text-[10px]">{v.size}</Badge>}
                        {v.color && <Badge variant="outline" className="text-[10px]" style={{ borderColor: 'currentColor' }}>{v.color}</Badge>}
                        {v.barcode && <span className="font-mono text-xs text-muted-foreground">{v.barcode}</span>}
                        <span className="text-muted-foreground">Stock: {v.stockQty}</span>
                        {v.priceOverride && <span className="da-amount">{formatDA(v.priceOverride)}</span>}
                      </div>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => removeVariant(i)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Formulaire nouvelle variante */}
              <div className="border rounded-lg p-3 space-y-3 bg-muted/30">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Nouvelle variante</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Nom de la variante *</Label>
                    <Input
                      placeholder="Ex: Rouge / XL"
                      value={newVariant.name}
                      onChange={e => setNewVariant(v => ({ ...v, name: e.target.value }))}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Code-barres</Label>
                    <Input
                      placeholder="EAN-13"
                      value={newVariant.barcode ?? ''}
                      onChange={e => setNewVariant(v => ({ ...v, barcode: e.target.value }))}
                      className="h-8 text-sm font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Taille / Pointure</Label>
                    <div className="flex gap-1.5">
                      <Input
                        placeholder="XL, 42, 100cm..."
                        value={newVariant.size ?? ''}
                        onChange={e => setNewVariant(v => ({ ...v, size: e.target.value }))}
                        className="h-8 text-sm"
                      />
                      <Select onValueChange={val => setNewVariant(v => ({ ...v, size: val }))}>
                        <SelectTrigger className="h-8 w-20 text-xs flex-shrink-0">
                          <SelectValue placeholder="Préset" />
                        </SelectTrigger>
                        <SelectContent>
                          <div className="px-2 py-1 text-xs text-muted-foreground font-medium">Vêtements</div>
                          {PRESET_SIZES_CLOTHING.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                          <div className="px-2 py-1 text-xs text-muted-foreground font-medium mt-1">Chaussures</div>
                          {PRESET_SIZES_SHOES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Couleur</Label>
                    <div className="flex gap-1.5">
                      <Input
                        placeholder="Rouge, Bleu..."
                        value={newVariant.color ?? ''}
                        onChange={e => setNewVariant(v => ({ ...v, color: e.target.value }))}
                        className="h-8 text-sm"
                      />
                      <Select onValueChange={val => setNewVariant(v => ({ ...v, color: val }))}>
                        <SelectTrigger className="h-8 w-20 text-xs flex-shrink-0">
                          <SelectValue placeholder="Préset" />
                        </SelectTrigger>
                        <SelectContent>
                          {PRESET_COLORS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Stock initial</Label>
                    <Input
                      type="number" min="0"
                      value={newVariant.stockQty}
                      onChange={e => setNewVariant(v => ({ ...v, stockQty: Number(e.target.value) }))}
                      className="h-8 text-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Prix spécifique (optionnel)</Label>
                    <Input
                      type="number" min="0" placeholder="Si différent du prix de base"
                      value={newVariant.priceOverride ?? ''}
                      onChange={e => setNewVariant(v => ({ ...v, priceOverride: e.target.value ? Number(e.target.value) : undefined }))}
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addVariant} className="gap-1.5">
                  <Plus className="h-3.5 w-3.5" />Ajouter la variante
                </Button>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <TutorialOverlay pageKey="products" />
    </div>
  )
}
