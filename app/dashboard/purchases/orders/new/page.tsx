'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { formatDA } from '@/lib/algerian/format'
import { Plus, Trash2, ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Supplier { id: string; name: string }
interface Product { id: string; name: string; sku?: string; unitPrice: number }

export default function NewPurchaseOrderPage() {
  const router = useRouter()
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [form, setForm] = useState({
    supplierId: '', number: '', orderDate: new Date().toISOString().split('T')[0],
    expectedDate: '', notes: '',
    lines: [{ productId: '', description: '', quantity: 1, unitPrice: 0, taxRate: 19 }],
  })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch('/api/suppliers').then(r => r.json()),
      fetch('/api/products').then(r => r.json()),
    ]).then(([s, p]) => {
      setSuppliers(s.data ?? [])
      setProducts(p.data ?? [])
    })
  }, [])

  const addLine = () => setForm(f => ({
    ...f, lines: [...f.lines, { productId: '', description: '', quantity: 1, unitPrice: 0, taxRate: 19 }],
  }))

  const removeLine = (i: number) => setForm(f => ({ ...f, lines: f.lines.filter((_, idx) => idx !== i) }))

  const updateLine = (i: number, field: string, value: string | number) => {
    setForm(f => {
      const lines = [...f.lines]
      if (field === 'productId') {
        const prod = products.find(p => p.id === value)
        lines[i] = { ...lines[i], productId: String(value), description: prod?.name ?? '', unitPrice: prod?.unitPrice ?? 0 }
      } else {
        lines[i] = { ...lines[i], [field]: value }
      }
      return { ...f, lines }
    })
  }

  const subtotal = form.lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0)
  const taxAmount = form.lines.reduce((s, l) => s + (l.quantity * l.unitPrice * l.taxRate / 100), 0)
  const total = subtotal + taxAmount

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    const res = await fetch('/api/purchase-orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, expectedDate: form.expectedDate || undefined, notes: form.notes || undefined }),
    })
    if (res.ok) {
      const data = await res.json()
      router.push(`/dashboard/purchases/orders`)
    } else {
      setSubmitting(false)
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <Breadcrumb items={[
        { label: 'Achats', href: '/dashboard/purchases/orders' },
        { label: 'Bons de commande', href: '/dashboard/purchases/orders' },
        { label: 'Nouveau' },
      ]} />

      <div className="flex items-center gap-3">
        <Link href="/dashboard/purchases/orders">
          <Button variant="outline" size="sm"><ArrowLeft className="w-4 h-4" /></Button>
        </Link>
        <h1 className="text-2xl font-bold">Nouveau bon de commande</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-card border rounded-lg p-4 space-y-4">
          <h2 className="font-semibold">Informations générales</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <Label>Fournisseur *</Label>
              <Select value={form.supplierId} onValueChange={v => setForm(f => ({ ...f, supplierId: v }))}>
                <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                <SelectContent>
                  {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Numéro *</Label>
              <Input value={form.number} onChange={e => setForm(f => ({ ...f, number: e.target.value }))} required />
            </div>
            <div className="space-y-1">
              <Label>Date de commande *</Label>
              <Input type="date" value={form.orderDate} onChange={e => setForm(f => ({ ...f, orderDate: e.target.value }))} required />
            </div>
            <div className="space-y-1">
              <Label>Date de livraison prévue</Label>
              <Input type="date" value={form.expectedDate} onChange={e => setForm(f => ({ ...f, expectedDate: e.target.value }))} />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
          </div>
        </div>

        <div className="bg-card border rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b font-semibold">Lignes de commande</div>
          <table className="w-full text-sm">
            <thead className="bg-muted/30">
              <tr>
                <th className="text-left px-3 py-2">Article</th>
                <th className="text-left px-3 py-2">Description</th>
                <th className="text-right px-3 py-2 w-24">Qté</th>
                <th className="text-right px-3 py-2 w-32">Prix unit.</th>
                <th className="text-right px-3 py-2 w-20">TVA %</th>
                <th className="text-right px-3 py-2 w-32">Total HT</th>
                <th className="w-8"></th>
              </tr>
            </thead>
            <tbody>
              {form.lines.map((line, i) => (
                <tr key={i} className="border-t">
                  <td className="px-2 py-1">
                    <Select value={line.productId} onValueChange={v => updateLine(i, 'productId', v)}>
                      <SelectTrigger className="h-8"><SelectValue placeholder="Produit..." /></SelectTrigger>
                      <SelectContent>
                        {products.map(p => <SelectItem key={p.id} value={p.id}>{p.sku ?? p.name} — {p.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-2 py-1">
                    <Input className="h-8" value={line.description} onChange={e => updateLine(i, 'description', e.target.value)} />
                  </td>
                  <td className="px-2 py-1">
                    <Input className="h-8 text-right" type="number" min="1" value={line.quantity} onChange={e => updateLine(i, 'quantity', Number(e.target.value))} />
                  </td>
                  <td className="px-2 py-1">
                    <Input className="h-8 text-right" type="number" min="0" step="0.01" value={line.unitPrice} onChange={e => updateLine(i, 'unitPrice', Number(e.target.value))} />
                  </td>
                  <td className="px-2 py-1">
                    <Input className="h-8 text-right" type="number" min="0" max="100" value={line.taxRate} onChange={e => updateLine(i, 'taxRate', Number(e.target.value))} />
                  </td>
                  <td className="px-2 py-1 text-right font-mono text-xs da-amount">
                    {formatDA(line.quantity * line.unitPrice)}
                  </td>
                  <td className="px-2 py-1">
                    {form.lines.length > 1 && (
                      <button type="button" onClick={() => removeLine(i)} className="text-destructive hover:opacity-70">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="p-3 border-t flex justify-between items-center">
            <Button type="button" variant="outline" size="sm" onClick={addLine}>
              <Plus className="w-4 h-4 mr-1" />Ajouter
            </Button>
            <div className="text-sm space-y-1 text-right">
              <div className="text-muted-foreground">Sous-total : <span className="font-mono da-amount">{formatDA(subtotal)}</span></div>
              <div className="text-muted-foreground">TVA : <span className="font-mono da-amount">{formatDA(taxAmount)}</span></div>
              <div className="font-semibold">Total TTC : <span className="font-mono da-amount">{formatDA(total)}</span></div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Link href="/dashboard/purchases/orders">
            <Button type="button" variant="outline">Annuler</Button>
          </Link>
          <Button type="submit" disabled={submitting || !form.supplierId || !form.number}>
            {submitting ? 'Enregistrement...' : 'Créer le bon de commande'}
          </Button>
        </div>
      </form>
    </div>
  )
}
