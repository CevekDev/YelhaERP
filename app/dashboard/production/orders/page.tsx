'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { AutoStatusBadge } from '@/components/ui/status-badge'
import { Plus, Factory } from 'lucide-react'
import Link from 'next/link'

interface BOM { id: string; name: string; product: { name: string; sku?: string } }
interface ProductionOrder {
  id: string
  number: string
  status: string
  plannedQty: number | string
  producedQty: number | string
  scheduledStart?: string
  scheduledEnd?: string
  bom: { name: string; product: { name: string; sku?: string } }
  createdAt: string
}

const STATUS_ORDER = ['DRAFT', 'CONFIRMED', 'IN_PROGRESS', 'DONE', 'CANCELLED']

export default function ProductionOrdersPage() {
  const [orders, setOrders] = useState<ProductionOrder[]>([])
  const [boms, setBOMs] = useState<BOM[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ bomId: '', number: '', plannedQty: 1, scheduledStart: '', scheduledEnd: '' })

  const fetchData = async () => {
    const [or, br] = await Promise.all([
      fetch('/api/production/orders').then(r => r.json()),
      fetch('/api/production/bom').then(r => r.json()),
    ])
    setOrders(or.data ?? [])
    setBOMs(br.data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    await fetch('/api/production/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, scheduledStart: form.scheduledStart || undefined, scheduledEnd: form.scheduledEnd || undefined }),
    })
    setOpen(false)
    fetchData()
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <Breadcrumb items={[{ label: 'Production', href: '/dashboard/production/bom' }, { label: 'Ordres de fabrication' }]} />

      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Ordres de fabrication</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" />Nouvel OF</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Créer un ordre de fabrication</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 mt-2">
              <div className="space-y-1">
                <Label>Nomenclature (BOM) *</Label>
                <Select value={form.bomId} onValueChange={v => setForm(f => ({ ...f, bomId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                  <SelectContent>{boms.map(b => <SelectItem key={b.id} value={b.id}>{b.product.sku ?? b.product.name} — {b.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Numéro *</Label>
                  <Input value={form.number} onChange={e => setForm(f => ({ ...f, number: e.target.value }))} required />
                </div>
                <div className="space-y-1">
                  <Label>Quantité planifiée *</Label>
                  <Input type="number" min="0.001" step="0.001" value={form.plannedQty} onChange={e => setForm(f => ({ ...f, plannedQty: Number(e.target.value) }))} required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Début prévu</Label>
                  <Input type="date" value={form.scheduledStart} onChange={e => setForm(f => ({ ...f, scheduledStart: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>Fin prévue</Label>
                  <Input type="date" value={form.scheduledEnd} onChange={e => setForm(f => ({ ...f, scheduledEnd: e.target.value }))} />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={!form.bomId || !form.number}>Créer l'OF</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Numéro</th>
              <th className="text-left px-4 py-3 font-medium">Produit</th>
              <th className="text-left px-4 py-3 font-medium">BOM</th>
              <th className="text-right px-4 py-3 font-medium">Planifié</th>
              <th className="text-right px-4 py-3 font-medium">Produit</th>
              <th className="text-left px-4 py-3 font-medium">Période</th>
              <th className="text-left px-4 py-3 font-medium">Statut</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="text-center py-12 text-muted-foreground">Chargement...</td></tr>
            ) : orders.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-12 text-muted-foreground">
                <Factory className="w-8 h-8 mx-auto mb-2 opacity-30" />
                Aucun ordre de fabrication
              </td></tr>
            ) : orders.map(o => (
              <tr key={o.id} className="border-t hover:bg-muted/20">
                <td className="px-4 py-3">
                  <Link href={`/dashboard/production/orders/${o.id}`} className="font-mono text-primary hover:underline text-xs">{o.number}</Link>
                </td>
                <td className="px-4 py-3">{o.bom.product.sku ?? o.bom.product.name} — {o.bom.product.name}</td>
                <td className="px-4 py-3 text-muted-foreground text-xs">{o.bom.name}</td>
                <td className="px-4 py-3 text-right font-mono">{Number(o.plannedQty)}</td>
                <td className="px-4 py-3 text-right font-mono">{Number(o.producedQty)}</td>
                <td className="px-4 py-3 text-muted-foreground text-xs">
                  {o.scheduledStart ? new Date(o.scheduledStart).toLocaleDateString('fr-DZ') : '—'}
                  {o.scheduledEnd ? ` → ${new Date(o.scheduledEnd).toLocaleDateString('fr-DZ')}` : ''}
                </td>
                <td className="px-4 py-3"><AutoStatusBadge status={o.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
