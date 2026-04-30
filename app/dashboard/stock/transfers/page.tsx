'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { AutoStatusBadge } from '@/components/ui/status-badge'
import { Plus, Trash2, ArrowRight } from 'lucide-react'

interface Warehouse { id: string; name: string; code: string }
interface Product { id: string; name: string; code: string }
interface Transfer {
  id: string
  reference: string
  status: string
  scheduledDate: string
  fromWarehouse: { name: string }
  toWarehouse: { name: string }
  lines: { id: string }[]
  createdAt: string
}

export default function TransfersPage() {
  const [transfers, setTransfers] = useState<Transfer[]>([])
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    fromWarehouseId: '', toWarehouseId: '',
    scheduledDate: new Date().toISOString().split('T')[0],
    lines: [{ productId: '', requestedQty: 1 }],
  })

  const fetchData = async () => {
    const [tr, wr, pr] = await Promise.all([
      fetch('/api/stock/transfers').then(r => r.json()),
      fetch('/api/warehouses').then(r => r.json()),
      fetch('/api/products').then(r => r.json()),
    ])
    setTransfers(tr.data ?? [])
    setWarehouses(wr.data ?? [])
    setProducts(pr.data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  const addLine = () => setForm(f => ({ ...f, lines: [...f.lines, { productId: '', requestedQty: 1 }] }))
  const removeLine = (i: number) => setForm(f => ({ ...f, lines: f.lines.filter((_, idx) => idx !== i) }))
  const updateLine = (i: number, field: string, value: string | number) => {
    setForm(f => { const l = [...f.lines]; l[i] = { ...l[i], [field]: value }; return { ...f, lines: l } })
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    await fetch('/api/stock/transfers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setOpen(false)
    fetchData()
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <Breadcrumb items={[{ label: 'Stock', href: '/dashboard/stock/warehouses' }, { label: 'Transferts' }]} />

      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Transferts de stock</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" />Nouveau transfert</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>Créer un transfert</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 mt-2">
              <div className="grid grid-cols-3 gap-4 items-center">
                <div className="space-y-1">
                  <Label>De *</Label>
                  <Select value={form.fromWarehouseId} onValueChange={v => setForm(f => ({ ...f, fromWarehouseId: v }))}>
                    <SelectTrigger><SelectValue placeholder="Entrepôt source" /></SelectTrigger>
                    <SelectContent>{warehouses.map(w => <SelectItem key={w.id} value={w.id}>{w.code} — {w.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="flex justify-center pt-5"><ArrowRight className="w-5 h-5 text-muted-foreground" /></div>
                <div className="space-y-1">
                  <Label>Vers *</Label>
                  <Select value={form.toWarehouseId} onValueChange={v => setForm(f => ({ ...f, toWarehouseId: v }))}>
                    <SelectTrigger><SelectValue placeholder="Entrepôt cible" /></SelectTrigger>
                    <SelectContent>{warehouses.map(w => <SelectItem key={w.id} value={w.id}>{w.code} — {w.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <Label>Date prévue</Label>
                <Input type="date" value={form.scheduledDate} onChange={e => setForm(f => ({ ...f, scheduledDate: e.target.value }))} />
              </div>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/30">
                    <tr>
                      <th className="text-left px-3 py-2">Produit</th>
                      <th className="text-right px-3 py-2 w-28">Quantité</th>
                      <th className="w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {form.lines.map((line, i) => (
                      <tr key={i} className="border-t">
                        <td className="px-2 py-1">
                          <Select value={line.productId} onValueChange={v => updateLine(i, 'productId', v)}>
                            <SelectTrigger className="h-8"><SelectValue placeholder="Produit..." /></SelectTrigger>
                            <SelectContent>{products.map(p => <SelectItem key={p.id} value={p.id}>{p.code} — {p.name}</SelectItem>)}</SelectContent>
                          </Select>
                        </td>
                        <td className="px-2 py-1">
                          <Input className="h-8 text-right" type="number" min="0.001" step="0.001" value={line.requestedQty} onChange={e => updateLine(i, 'requestedQty', Number(e.target.value))} />
                        </td>
                        <td className="px-2 py-1">
                          {form.lines.length > 1 && <button type="button" onClick={() => removeLine(i)} className="text-destructive"><Trash2 className="w-4 h-4" /></button>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-between">
                <Button type="button" variant="outline" size="sm" onClick={addLine}><Plus className="w-4 h-4 mr-1" />Ligne</Button>
                <Button type="submit" disabled={!form.fromWarehouseId || !form.toWarehouseId}>Créer</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-3 font-medium">ID</th>
              <th className="text-left px-4 py-3 font-medium">De</th>
              <th className="text-left px-4 py-3 font-medium"></th>
              <th className="text-left px-4 py-3 font-medium">Vers</th>
              <th className="text-left px-4 py-3 font-medium">Date</th>
              <th className="text-right px-4 py-3 font-medium">Lignes</th>
              <th className="text-left px-4 py-3 font-medium">Statut</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="text-center py-12 text-muted-foreground">Chargement...</td></tr>
            ) : transfers.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-12 text-muted-foreground">Aucun transfert</td></tr>
            ) : transfers.map(t => (
              <tr key={t.id} className="border-t hover:bg-muted/20">
                <td className="px-4 py-3 font-mono text-xs">{t.id.slice(-8)}</td>
                <td className="px-4 py-3">{t.fromWarehouse.name}</td>
                <td className="px-4 py-3 text-muted-foreground"><ArrowRight className="w-4 h-4" /></td>
                <td className="px-4 py-3">{t.toWarehouse.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{t.scheduledDate ? new Date(t.scheduledDate).toLocaleDateString('fr-DZ') : '—'}</td>
                <td className="px-4 py-3 text-right">{t.lines.length}</td>
                <td className="px-4 py-3"><AutoStatusBadge status={t.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
