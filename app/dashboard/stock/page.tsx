'use client'

import { useState, useEffect, useCallback } from 'react'
import { Header } from '@/components/layout/header'
import { PageHeader } from '@/components/ui/page-header'
import { DataTable } from '@/components/ui/data-table'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatDA } from '@/lib/algerian/format'
import { toast } from 'sonner'
import { TutorialOverlay } from '@/components/tutorial/tutorial-overlay'
import { useT } from '@/lib/i18n'

interface Movement {
  id: string; type: string; quantity: number; unitCost?: number; reference?: string; createdAt: string
  product: { name: string; unit?: string }
}
interface Product { id: string; name: string }

const TYPE_VARIANTS: Record<string, 'success' | 'destructive' | 'secondary'> = {
  IN: 'success', OUT: 'destructive', ADJUSTMENT: 'secondary',
}

export default function StockPage() {
  const { t } = useT()

  const TYPE_LABELS: Record<string, string> = {
    IN: t('pages.stock_in'),
    OUT: t('pages.stock_out'),
    ADJUSTMENT: t('pages.stock_adj'),
  }

  const [movements, setMovements] = useState<Movement[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ productId: '', type: 'IN', quantity: '', unitCost: '', reference: '', note: '' })

  const fetch_ = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/stock?page=${page}&limit=20`)
    if (res.ok) { const d = await res.json(); setMovements(d.movements); setTotal(d.total) }
    setLoading(false)
  }, [page])

  useEffect(() => { fetch_() }, [fetch_])
  useEffect(() => { fetch('/api/products?limit=100').then(r => r.json()).then(d => setProducts(d.products ?? [])) }, [])

  const handleSave = async () => {
    if (!form.productId || !form.quantity) { toast.error('Produit et quantité requis'); return }
    setSaving(true)
    const res = await fetch('/api/stock', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, quantity: Number(form.quantity), unitCost: form.unitCost ? Number(form.unitCost) : undefined }),
    })
    setSaving(false)
    if (res.ok) { toast.success('Mouvement enregistré'); setOpen(false); setForm({ productId: '', type: 'IN', quantity: '', unitCost: '', reference: '', note: '' }); fetch_() }
    else { const e = await res.json(); toast.error(e.error ?? 'Erreur') }
  }

  const columns = [
    { key: 'product', header: t('pages.stock_col_product'), render: (r: Movement) => r.product?.name ?? '—' },
    { key: 'type', header: t('pages.stock_col_type'), render: (r: Movement) => <Badge variant={TYPE_VARIANTS[r.type]}>{TYPE_LABELS[r.type]}</Badge> },
    { key: 'quantity', header: t('pages.stock_col_qty'), render: (r: Movement) => `${r.quantity} ${r.product?.unit ?? ''}` },
    { key: 'unitCost', header: t('common.amount'), className: 'da-amount', render: (r: Movement) => r.unitCost ? formatDA(r.unitCost) : '—' },
    { key: 'reference', header: t('common.reference'), render: (r: Movement) => r.reference ?? '—' },
    { key: 'createdAt', header: t('common.date'), render: (r: Movement) => new Date(r.createdAt).toLocaleDateString('fr-DZ') },
  ]

  return (
    <div>
      <Header title={t('pages.stock_title')} />
      <div className="p-4 md:p-6">
        <PageHeader title={t('pages.stock_title')} description={`${total} ${t('pages.stock_title').toLowerCase()}`} actionLabel={t('pages.stock_new')} onAction={() => setOpen(true)} actionDataTutorial="new-movement" />
        <Card>
          <CardContent className="p-0">
            <DataTable data={movements as unknown as Record<string, unknown>[]} columns={columns as never} total={total} page={page} limit={20} onPageChange={setPage} loading={loading} emptyText={t('pages.stock_title')} />
          </CardContent>
        </Card>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Mouvement de stock</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Produit *</Label>
              <Select onValueChange={v => setForm(f => ({...f, productId: v}))}>
                <SelectTrigger><SelectValue placeholder="Choisir un produit" /></SelectTrigger>
                <SelectContent>{products.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={form.type} onValueChange={v => setForm(f => ({...f, type: v}))}>
                  <SelectTrigger data-tutorial="stock-filter"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="IN">Entrée</SelectItem>
                    <SelectItem value="OUT">Sortie</SelectItem>
                    <SelectItem value="ADJUSTMENT">Ajustement</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Quantité *</Label><Input type="number" min="0" step="0.001" value={form.quantity} onChange={e => setForm(f => ({...f, quantity: e.target.value}))} /></div>
            </div>
            <div className="space-y-2"><Label>Coût unitaire (DA)</Label><Input type="number" min="0" value={form.unitCost} onChange={e => setForm(f => ({...f, unitCost: e.target.value}))} /></div>
            <div className="space-y-2"><Label>Référence</Label><Input value={form.reference} onChange={e => setForm(f => ({...f, reference: e.target.value}))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button onClick={handleSave} disabled={saving}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <TutorialOverlay pageKey="stock" />
    </div>
  )
}
