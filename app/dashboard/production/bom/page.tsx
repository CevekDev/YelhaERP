'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { Plus, Trash2, Layers } from 'lucide-react'

interface Product { id: string; name: string; sku?: string }
interface BOM {
  id: string
  name: string
  version: string
  yieldQty: number | string
  product: { name: string; sku?: string }
  components: { id: string; product: { name: string; sku?: string }; quantity: number; unit?: string }[]
}

export default function BOMPage() {
  const [boms, setBOMs] = useState<BOM[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    productId: '', name: '', version: '1.0', yieldQty: 1,
    components: [{ productId: '', quantity: 1, unit: '' }],
  })

  const fetchData = async () => {
    const [br, pr] = await Promise.all([
      fetch('/api/production/bom').then(r => r.json()),
      fetch('/api/products').then(r => r.json()),
    ])
    setBOMs(br.data ?? [])
    setProducts(pr.data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  const addComponent = () => setForm(f => ({ ...f, components: [...f.components, { productId: '', quantity: 1, unit: '' }] }))
  const removeComponent = (i: number) => setForm(f => ({ ...f, components: f.components.filter((_, idx) => idx !== i) }))
  const updateComponent = (i: number, field: string, value: string | number) => {
    setForm(f => { const c = [...f.components]; c[i] = { ...c[i], [field]: value }; return { ...f, components: c } })
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    await fetch('/api/production/bom', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setOpen(false)
    fetchData()
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <Breadcrumb items={[{ label: 'Production', href: '/dashboard/production/bom' }, { label: 'Nomenclatures' }]} />

      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Nomenclatures (BOM)</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" />Nouvelle BOM</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>Créer une nomenclature</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 mt-2">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1 col-span-2">
                  <Label>Produit fini *</Label>
                  <Select value={form.productId} onValueChange={v => setForm(f => ({ ...f, productId: v }))}>
                    <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                    <SelectContent>{products.map(p => <SelectItem key={p.id} value={p.id}>{p.sku ?? p.name} — {p.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Qté produite</Label>
                  <Input type="number" min="0.001" step="0.001" value={form.yieldQty} onChange={e => setForm(f => ({ ...f, yieldQty: Number(e.target.value) }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Nom BOM *</Label>
                  <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
                </div>
                <div className="space-y-1">
                  <Label>Version</Label>
                  <Input value={form.version} onChange={e => setForm(f => ({ ...f, version: e.target.value }))} />
                </div>
              </div>
              <div>
                <div className="font-medium text-sm mb-2">Composants</div>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/30">
                      <tr>
                        <th className="text-left px-3 py-2">Composant</th>
                        <th className="text-right px-3 py-2 w-24">Quantité</th>
                        <th className="text-left px-3 py-2 w-20">Unité</th>
                        <th className="w-8"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {form.components.map((c, i) => (
                        <tr key={i} className="border-t">
                          <td className="px-2 py-1">
                            <Select value={c.productId} onValueChange={v => updateComponent(i, 'productId', v)}>
                              <SelectTrigger className="h-8"><SelectValue placeholder="Composant..." /></SelectTrigger>
                              <SelectContent>{products.map(p => <SelectItem key={p.id} value={p.id}>{p.sku ?? p.name} — {p.name}</SelectItem>)}</SelectContent>
                            </Select>
                          </td>
                          <td className="px-2 py-1"><Input className="h-8 text-right" type="number" min="0.001" step="0.001" value={c.quantity} onChange={e => updateComponent(i, 'quantity', Number(e.target.value))} /></td>
                          <td className="px-2 py-1"><Input className="h-8" value={c.unit} onChange={e => updateComponent(i, 'unit', e.target.value)} placeholder="kg, L..." /></td>
                          <td className="px-2 py-1">{form.components.length > 1 && <button type="button" onClick={() => removeComponent(i)} className="text-destructive"><Trash2 className="w-4 h-4" /></button>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Button type="button" variant="outline" size="sm" className="mt-2" onClick={addComponent}><Plus className="w-4 h-4 mr-1" />Composant</Button>
              </div>
              <Button type="submit" className="w-full" disabled={!form.productId || !form.name}>Créer</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Chargement...</div>
      ) : boms.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Layers className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Aucune nomenclature</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {boms.map(bom => (
            <div key={bom.id} className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="font-semibold">{bom.name}</div>
                  <div className="text-sm text-muted-foreground">{bom.product.sku ?? bom.product.name} — {bom.product.name} · v{bom.version} · {Number(bom.yieldQty)} unité(s) produite(s)</div>
                </div>
                <Badge variant="outline">{bom.components.length} composant{bom.components.length > 1 ? 's' : ''}</Badge>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {bom.components.map(c => (
                  <div key={c.id} className="bg-muted/30 rounded-md p-2 text-sm">
                    <div className="font-medium">{c.product.sku ?? c.product.name}</div>
                    <div className="text-muted-foreground text-xs">{c.product.name}</div>
                    <div className="font-mono text-xs mt-1">{Number(c.quantity)} {c.unit ?? 'u'}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
