'use client'

import { useState, useEffect, useCallback } from 'react'
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
import { formatDA } from '@/lib/algerian/format'
import { toast } from 'sonner'
import { Package } from 'lucide-react'

interface Product { id: string; name: string; sku?: string; unitPrice: number; stockQty: number; stockAlert: number; unit?: string; taxRate: number }

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', sku: '', description: '', unitPrice: '', taxRate: '19', stockAlert: '0', unit: '' })

  const fetch_ = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), limit: '20', ...(search && { search }) })
    const res = await fetch(`/api/products?${params}`)
    if (res.ok) { const d = await res.json(); setProducts(d.products); setTotal(d.total) }
    setLoading(false)
  }, [page, search])

  useEffect(() => { fetch_() }, [fetch_])

  const handleSave = async () => {
    if (!form.name) { toast.error('Nom requis'); return }
    setSaving(true)
    const res = await fetch('/api/products', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, unitPrice: Number(form.unitPrice), taxRate: Number(form.taxRate), stockAlert: Number(form.stockAlert) }),
    })
    setSaving(false)
    if (res.ok) { toast.success('Produit créé'); setOpen(false); fetch_() }
    else { const e = await res.json(); toast.error(e.error ?? 'Erreur') }
  }

  const columns = [
    { key: 'name', header: 'Nom', render: (r: Product) => <span className="font-medium">{r.name}</span> },
    { key: 'sku', header: 'SKU', render: (r: Product) => <span className="font-mono text-xs">{r.sku ?? '—'}</span> },
    { key: 'unitPrice', header: 'Prix unitaire', className: 'da-amount text-right',
      render: (r: Product) => formatDA(Number(r.unitPrice)) },
    { key: 'taxRate', header: 'TVA', render: (r: Product) => `${Number(r.taxRate)}%` },
    { key: 'stockQty', header: 'Stock', render: (r: Product) => {
      const low = Number(r.stockQty) <= Number(r.stockAlert)
      return (
        <span className={low ? 'text-red-600 font-medium' : 'text-yelha-600'}>
          {Number(r.stockQty)} {r.unit ?? ''}
          {low && <Badge variant="destructive" className="ml-2 text-[10px]">Alerte</Badge>}
        </span>
      )
    }},
  ]

  return (
    <div>
      <Header title="Produits & Services" />
      <div className="p-4 md:p-6">
        <PageHeader title="Produits & Services" description={`${total} article${total > 1 ? 's' : ''}`} actionLabel="Nouveau produit" onAction={() => setOpen(true)} />
        <Card>
          <div className="p-4 border-b"><SearchInput placeholder="Rechercher par nom ou SKU..." onSearch={v => { setSearch(v); setPage(1) }} /></div>
          <CardContent className="p-0">
            <DataTable data={products as unknown as Record<string, unknown>[]} columns={columns as never} total={total} page={page} limit={20} onPageChange={setPage} loading={loading}
              emptyIcon={Package} emptyText="Aucun produit" emptyDescription="Créez votre catalogue produits et services." emptyAction={{ label: 'Ajouter un produit', onClick: () => setOpen(true) }} />
          </CardContent>
        </Card>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Nouveau produit / service</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="col-span-2 space-y-2"><Label>Nom *</Label><Input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} /></div>
            <div className="space-y-2"><Label>SKU</Label><Input value={form.sku} onChange={e => setForm(f => ({...f, sku: e.target.value}))} /></div>
            <div className="space-y-2"><Label>Unité</Label><Input placeholder="pcs, kg, h..." value={form.unit} onChange={e => setForm(f => ({...f, unit: e.target.value}))} /></div>
            <div className="space-y-2"><Label>Prix unitaire (DA) *</Label><Input type="number" min="0" value={form.unitPrice} onChange={e => setForm(f => ({...f, unitPrice: e.target.value}))} /></div>
            <div className="space-y-2"><Label>TVA %</Label><Input type="number" min="0" max="100" value={form.taxRate} onChange={e => setForm(f => ({...f, taxRate: e.target.value}))} /></div>
            <div className="space-y-2"><Label>Seuil alerte stock</Label><Input type="number" min="0" value={form.stockAlert} onChange={e => setForm(f => ({...f, stockAlert: e.target.value}))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button onClick={handleSave} disabled={saving}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
