'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { formatDA } from '@/lib/algerian/format'

type DeliveryOption = { id: string; name: string; price: number }
type DeliveryCompany = { id: string; name: string; slug: string; isDefault: boolean; deliveryOptions: DeliveryOption[] }
type Driver = { id: string; name: string; phone: string }

const WILAYAS = [
  'Adrar','Chlef','Laghouat','Oum El Bouaghi','Batna','Béjaïa','Biskra','Béchar','Blida','Bouira',
  'Tamanrasset','Tébessa','Tlemcen','Tiaret','Tizi Ouzou','Alger','Djelfa','Jijel','Sétif','Saïda',
  'Skikda','Sidi Bel Abbès','Annaba','Guelma','Constantine','Médéa','Mostaganem','MSila','Mascara','Ouargla',
  'Oran','El Bayadh','Illizi','Bordj Bou Arréridj','Boumerdès','El Tarf','Tindouf','Tissemsilt','El Oued','Khenchela',
  'Souk Ahras','Tipaza','Mila','Aïn Defla','Naâma','Aïn Témouchent','Ghardaïa','Relizane',
  'Timimoun','Bordj Badji Mokhtar','Ouled Djellal','Béni Abbès','In Salah','In Guezzam','Touggourt','Djanet','El M\'Ghair','El Meniaa',
]

export default function NewOrderPage() {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [companies, setCompanies]   = useState<DeliveryCompany[]>([])
  const [drivers, setDrivers]       = useState<Driver[]>([])

  const [form, setForm] = useState({
    customerName:       '',
    customerFirstName:  '',
    customerPhone:      '',
    customerPhone2:     '',
    customerAddress:    '',
    customerWilaya:     '',
    customerCommune:    '',
    productDescription: '',
    productPrice:       '',
    quantity:           '1',
    deliveryCompanyId:  '',
    deliveryOptionId:   '',
    deliveryDriverId:   '',
    deliveryFee:        '0',
    notes:              '',
  })

  useEffect(() => {
    Promise.all([
      fetch('/api/ecommerce/delivery-companies').then(r => r.json()),
      fetch('/api/ecommerce/drivers').then(r => r.json()),
    ]).then(([dc, dr]) => {
      const comps: DeliveryCompany[] = dc.data ?? []
      setCompanies(comps)
      setDrivers(dr.data ?? [])
      const def = comps.find(c => c.isDefault)
      if (def) setForm(f => ({ ...f, deliveryCompanyId: def.id }))
    }).catch(() => {})
  }, [])

  function set(field: string, value: string) {
    setForm(prev => {
      const next = { ...prev, [field]: value }
      // Auto-fill delivery fee when option changes
      if (field === 'deliveryOptionId') {
        const company = companies.find(c => c.id === next.deliveryCompanyId)
        const option  = company?.deliveryOptions.find(o => o.id === value)
        if (option) next.deliveryFee = String(option.price)
      }
      // Reset option when company changes
      if (field === 'deliveryCompanyId') {
        next.deliveryOptionId = ''
        next.deliveryFee = '0'
      }
      return next
    })
  }

  const selectedCompany = companies.find(c => c.id === form.deliveryCompanyId)
  const price    = parseFloat(form.productPrice) || 0
  const qty      = parseInt(form.quantity) || 1
  const fee      = parseFloat(form.deliveryFee) || 0
  const total    = price * qty + fee

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      const res = await fetch('/api/ecommerce/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName:       form.customerName,
          customerFirstName:  form.customerFirstName || undefined,
          customerPhone:      form.customerPhone,
          customerPhone2:     form.customerPhone2 || undefined,
          customerAddress:    form.customerAddress,
          customerWilaya:     form.customerWilaya,
          customerCommune:    form.customerCommune || undefined,
          productDescription: form.productDescription,
          productPrice:       price,
          quantity:           qty,
          deliveryCompanyId:  form.deliveryCompanyId || undefined,
          deliveryOptionId:   form.deliveryOptionId || undefined,
          deliveryDriverId:   form.deliveryDriverId || undefined,
          deliveryFee:        fee,
          notes:              form.notes || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? 'Erreur'); return }
      toast.success('Commande créée')
      router.push('/dashboard/ecommerce')
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon" asChild className="h-8 w-8">
          <Link href="/dashboard/ecommerce"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Nouvelle commande</h1>
          <p className="text-muted-foreground text-sm">Créer une commande de livraison</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Customer */}
        <Card>
          <CardHeader><CardTitle className="text-base">Informations client</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Nom *</Label>
              <Input value={form.customerName} onChange={e => set('customerName', e.target.value)} required placeholder="Nom de famille" />
            </div>
            <div className="space-y-1.5">
              <Label>Prénom</Label>
              <Input value={form.customerFirstName} onChange={e => set('customerFirstName', e.target.value)} placeholder="Prénom" />
            </div>
            <div className="space-y-1.5">
              <Label>Téléphone *</Label>
              <Input value={form.customerPhone} onChange={e => set('customerPhone', e.target.value)} required placeholder="0555 123 456" type="tel" />
            </div>
            <div className="space-y-1.5">
              <Label>Téléphone 2</Label>
              <Input value={form.customerPhone2} onChange={e => set('customerPhone2', e.target.value)} placeholder="Numéro alternatif" type="tel" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Adresse *</Label>
              <Input value={form.customerAddress} onChange={e => set('customerAddress', e.target.value)} required placeholder="Adresse complète" />
            </div>
            <div className="space-y-1.5">
              <Label>Wilaya *</Label>
              <select
                value={form.customerWilaya}
                onChange={e => set('customerWilaya', e.target.value)}
                required
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">Sélectionner...</option>
                {WILAYAS.map(w => <option key={w} value={w}>{w}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Commune</Label>
              <Input value={form.customerCommune} onChange={e => set('customerCommune', e.target.value)} placeholder="Commune" />
            </div>
          </CardContent>
        </Card>

        {/* Product */}
        <Card>
          <CardHeader><CardTitle className="text-base">Produit</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Description *</Label>
              <Input value={form.productDescription} onChange={e => set('productDescription', e.target.value)} required placeholder="Description du produit" />
            </div>
            <div className="space-y-1.5">
              <Label>Prix unitaire (DA) *</Label>
              <Input value={form.productPrice} onChange={e => set('productPrice', e.target.value)} required type="number" min="0" step="0.01" placeholder="0" />
            </div>
            <div className="space-y-1.5">
              <Label>Quantité *</Label>
              <Input value={form.quantity} onChange={e => set('quantity', e.target.value)} required type="number" min="1" step="1" placeholder="1" />
            </div>
          </CardContent>
        </Card>

        {/* Delivery */}
        <Card>
          <CardHeader><CardTitle className="text-base">Livraison</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Société de livraison</Label>
              <select
                value={form.deliveryCompanyId}
                onChange={e => set('deliveryCompanyId', e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">Aucune</option>
                {companies.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name}{c.isDefault ? ' (par défaut)' : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Type de livraison</Label>
              <select
                value={form.deliveryOptionId}
                onChange={e => set('deliveryOptionId', e.target.value)}
                disabled={!selectedCompany || selectedCompany.deliveryOptions.length === 0}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
              >
                <option value="">Aucun</option>
                {selectedCompany?.deliveryOptions.map(o => (
                  <option key={o.id} value={o.id}>{o.name} — {o.price} DA</option>
                ))}
              </select>
            </div>
            {selectedCompany?.slug === 'MANUAL' && (
              <div className="space-y-1.5">
                <Label>Livreur indépendant</Label>
                <select
                  value={form.deliveryDriverId}
                  onChange={e => set('deliveryDriverId', e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="">Aucun</option>
                  {drivers.map(d => (
                    <option key={d.id} value={d.id}>{d.name} — {d.phone}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Frais de livraison (DA)</Label>
              <Input value={form.deliveryFee} onChange={e => set('deliveryFee', e.target.value)} type="number" min="0" step="0.01" placeholder="0" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Notes</Label>
              <Input value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Instructions spéciales, remarques..." />
            </div>
          </CardContent>
        </Card>

        {/* Summary */}
        <div className="border rounded-xl p-4 bg-muted/30 space-y-2">
          <h3 className="font-semibold text-sm">Récapitulatif</h3>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Produit ({qty} x {price} DA)</span>
            <span className="da-amount">{formatDA(price * qty)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Frais de livraison</span>
            <span className="da-amount">{formatDA(fee)}</span>
          </div>
          <div className="flex justify-between font-bold border-t pt-2">
            <span>Total</span>
            <span className="da-amount">{formatDA(total)}</span>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" type="button" asChild>
            <Link href="/dashboard/ecommerce">Annuler</Link>
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Créer la commande
          </Button>
        </div>
      </form>
    </div>
  )
}
