'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { Plus, Warehouse, MapPin } from 'lucide-react'

interface Warehouse {
  id: string
  name: string
  code: string
  address?: string
  isDefault: boolean
  _count: { locations: number }
}

export default function WarehousesPage() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ name: '', code: '', address: '', isDefault: false })

  const fetchWarehouses = async () => {
    const res = await fetch('/api/warehouses')
    const data = await res.json()
    setWarehouses(data.data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchWarehouses() }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    await fetch('/api/warehouses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, address: form.address || undefined }),
    })
    setOpen(false)
    fetchWarehouses()
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <Breadcrumb items={[{ label: 'Stock', href: '/dashboard/stock/warehouses' }, { label: 'Entrepôts' }]} />

      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Entrepôts</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" />Nouvel entrepôt</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Créer un entrepôt</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 mt-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Nom *</Label>
                  <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
                </div>
                <div className="space-y-1">
                  <Label>Code *</Label>
                  <Input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} maxLength={10} required />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Adresse</Label>
                <Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="isDefault" checked={form.isDefault} onChange={e => setForm(f => ({ ...f, isDefault: e.target.checked }))} />
                <Label htmlFor="isDefault">Entrepôt par défaut</Label>
              </div>
              <Button type="submit" className="w-full">Créer</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Chargement...</div>
      ) : warehouses.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Warehouse className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Aucun entrepôt configuré</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {warehouses.map(w => (
            <div key={w.id} className="border rounded-lg p-4 bg-card">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Warehouse className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="font-semibold">{w.name}</div>
                    <div className="text-xs font-mono text-muted-foreground">{w.code}</div>
                  </div>
                </div>
                {w.isDefault && <Badge className="bg-primary/10 text-primary text-xs">Défaut</Badge>}
              </div>
              {w.address && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
                  <MapPin className="w-3 h-3" />{w.address}
                </div>
              )}
              <div className="text-sm text-muted-foreground">
                {w._count.locations} emplacement{w._count.locations > 1 ? 's' : ''}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
