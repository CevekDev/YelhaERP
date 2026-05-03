'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft, Plus, Trash2, Loader2, Truck, Star, Copy, Check,
  User, Phone, MapPin, Package, X
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const SLUG_LABELS: Record<string, string> = {
  MANUAL: 'Manuel', YALIDINE: 'Yalidine', MAYSTRO: 'Maystro',
  PROCOLIS: 'Procolis', ECOTRACK: 'Ecotrack', GUEPEX: 'Guepex',
  ZR_EXPRESS: 'ZR Express', OTHER: 'Autre',
}

type DeliveryOption = { id: string; name: string; price: number; description?: string | null }
type DeliveryCompany = {
  id: string; name: string; slug: string; isDefault: boolean; isActive: boolean
  apiKey?: string | null; apiSecret?: string | null; webhookSecret?: string | null
  deliveryOptions: DeliveryOption[]
  _count: { orders: number; drivers: number }
}
type Driver = {
  id: string; name: string; phone: string; email?: string | null
  wilaya?: string | null; vehicleType?: string | null; isActive: boolean
  deliveryCompany: { id: string; name: string } | null
  _count: { orders: number }
}

const BASE_URL = typeof window !== 'undefined' ? window.location.origin : 'https://erp.yelha.net'

export default function DeliveryPage() {
  const [tab, setTab] = useState<'companies' | 'drivers'>('companies')

  const [companies, setCompanies] = useState<DeliveryCompany[]>([])
  const [drivers, setDrivers]     = useState<Driver[]>([])
  const [loading, setLoading]     = useState(true)

  // Add company form state
  const [companyDialogOpen, setCompanyDialogOpen] = useState(false)
  const [companyForm, setCompanyForm] = useState({
    name: '', slug: 'OTHER', isDefault: false,
    apiKey: '', apiSecret: '', webhookSecret: '',
  })
  const [companyOptions, setCompanyOptions] = useState<{ name: string; price: string }[]>([])
  const [savingCompany, setSavingCompany] = useState(false)

  // Add driver form state
  const [driverDialogOpen, setDriverDialogOpen] = useState(false)
  const [driverForm, setDriverForm] = useState({
    name: '', phone: '', email: '', wilaya: '', vehicleType: '', deliveryCompanyId: '',
  })
  const [savingDriver, setSavingDriver] = useState(false)

  const [copiedId, setCopiedId] = useState<string | null>(null)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const [dc, dr] = await Promise.all([
        fetch('/api/ecommerce/delivery-companies').then(r => r.json()),
        fetch('/api/ecommerce/drivers').then(r => r.json()),
      ])
      setCompanies(dc.data ?? [])
      setDrivers(dr.data ?? [])
    } catch {
      toast.error('Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  async function saveCompany() {
    setSavingCompany(true)
    try {
      const res = await fetch('/api/ecommerce/delivery-companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:          companyForm.name,
          slug:          companyForm.slug,
          isDefault:     companyForm.isDefault,
          apiKey:        companyForm.apiKey || undefined,
          apiSecret:     companyForm.apiSecret || undefined,
          webhookSecret: companyForm.webhookSecret || undefined,
          options:       companyOptions
            .filter(o => o.name.trim())
            .map(o => ({ name: o.name, price: parseFloat(o.price) || 0 })),
        }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? 'Erreur'); return }
      toast.success('Société ajoutée')
      setCompanyDialogOpen(false)
      setCompanyForm({ name: '', slug: 'OTHER', isDefault: false, apiKey: '', apiSecret: '', webhookSecret: '' })
      setCompanyOptions([])
      fetchAll()
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setSavingCompany(false)
    }
  }

  async function setDefault(id: string) {
    await fetch(`/api/ecommerce/delivery-companies/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isDefault: true }),
    })
    fetchAll()
    toast.success('Société par défaut mise à jour')
  }

  async function deleteCompany(id: string) {
    if (!confirm('Désactiver cette société ?')) return
    await fetch(`/api/ecommerce/delivery-companies/${id}`, { method: 'DELETE' })
    fetchAll()
    toast.success('Société désactivée')
  }

  async function saveDriver() {
    setSavingDriver(true)
    try {
      const res = await fetch('/api/ecommerce/drivers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:              driverForm.name,
          phone:             driverForm.phone,
          email:             driverForm.email || undefined,
          wilaya:            driverForm.wilaya || undefined,
          vehicleType:       driverForm.vehicleType || undefined,
          deliveryCompanyId: driverForm.deliveryCompanyId || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? 'Erreur'); return }
      toast.success('Livreur ajouté')
      setDriverDialogOpen(false)
      setDriverForm({ name: '', phone: '', email: '', wilaya: '', vehicleType: '', deliveryCompanyId: '' })
      fetchAll()
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setSavingDriver(false)
    }
  }

  function copyWebhook(id: string) {
    const url = `${BASE_URL}/api/webhooks/delivery/${id}`
    navigator.clipboard.writeText(url)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
    toast.success('URL copiée')
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon" asChild className="h-8 w-8">
          <Link href="/dashboard/ecommerce"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Gestion de la livraison</h1>
          <p className="text-muted-foreground text-sm">Sociétés de livraison et livreurs indépendants</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b pb-0">
        {(['companies', 'drivers'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
              tab === t
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {t === 'companies' ? 'Sociétés de livraison' : 'Livreurs indépendants'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : tab === 'companies' ? (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={companyDialogOpen} onOpenChange={setCompanyDialogOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-2" />Ajouter une société</Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Nouvelle société de livraison</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-2">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label>Nom *</Label>
                      <Input value={companyForm.name} onChange={e => setCompanyForm(f => ({ ...f, name: e.target.value }))} placeholder="Nom de la société" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Type</Label>
                      <select
                        value={companyForm.slug}
                        onChange={e => setCompanyForm(f => ({ ...f, slug: e.target.value }))}
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      >
                        {Object.entries(SLUG_LABELS).map(([k, v]) => (
                          <option key={k} value={k}>{v}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={companyForm.isDefault}
                      onChange={e => setCompanyForm(f => ({ ...f, isDefault: e.target.checked }))}
                      className="rounded"
                    />
                    <span className="text-sm">Définir comme société par défaut</span>
                  </label>

                  <div className="space-y-1.5">
                    <Label>Clé API</Label>
                    <Input value={companyForm.apiKey} onChange={e => setCompanyForm(f => ({ ...f, apiKey: e.target.value }))} placeholder="Clé API (optionnel)" type="password" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Secret API</Label>
                    <Input value={companyForm.apiSecret} onChange={e => setCompanyForm(f => ({ ...f, apiSecret: e.target.value }))} placeholder="Secret API (optionnel)" type="password" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Secret webhook</Label>
                    <Input value={companyForm.webhookSecret} onChange={e => setCompanyForm(f => ({ ...f, webhookSecret: e.target.value }))} placeholder="Secret pour vérifier les webhooks" type="password" />
                  </div>

                  {/* Options */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Tarifs de livraison</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setCompanyOptions(o => [...o, { name: '', price: '0' }])}
                      >
                        <Plus className="h-3 w-3 mr-1" />Ajouter
                      </Button>
                    </div>
                    {companyOptions.map((opt, i) => (
                      <div key={i} className="flex gap-2 items-center">
                        <Input
                          value={opt.name}
                          onChange={e => setCompanyOptions(opts => opts.map((o, j) => j === i ? { ...o, name: e.target.value } : o))}
                          placeholder="Ex: Domicile"
                          className="flex-1"
                        />
                        <Input
                          value={opt.price}
                          onChange={e => setCompanyOptions(opts => opts.map((o, j) => j === i ? { ...o, price: e.target.value } : o))}
                          placeholder="Prix DA"
                          type="number"
                          min="0"
                          className="w-24"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0"
                          onClick={() => setCompanyOptions(opts => opts.filter((_, j) => j !== i))}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>

                  <Button
                    className="w-full"
                    onClick={saveCompany}
                    disabled={savingCompany || !companyForm.name.trim()}
                  >
                    {savingCompany && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Enregistrer
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {companies.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground border rounded-xl border-dashed">
              <Truck className="h-8 w-8 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Aucune société de livraison</p>
              <p className="text-sm mt-1">Ajoutez votre première société pour commencer</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {companies.map(company => (
                <Card key={company.id} className={cn(!company.isActive && 'opacity-60')}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-9 h-9 bg-muted rounded-lg flex items-center justify-center">
                          <Truck className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-semibold text-sm">{company.name}</p>
                          <p className="text-xs text-muted-foreground">{SLUG_LABELS[company.slug] ?? company.slug}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {company.isDefault && (
                          <Badge variant="secondary" className="text-xs gap-1">
                            <Star className="h-2.5 w-2.5" />Défaut
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 text-xs">
                    <div className="flex gap-4 text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Package className="h-3 w-3" />{company._count.orders} commandes
                      </span>
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />{company._count.drivers} livreurs
                      </span>
                    </div>

                    {company.deliveryOptions.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {company.deliveryOptions.map(o => (
                          <span key={o.id} className="bg-muted px-2 py-0.5 rounded text-xs">
                            {o.name} — {o.price} DA
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Webhook URL */}
                    <div className="flex items-center gap-2 bg-muted/50 rounded-lg p-2">
                      <code className="flex-1 text-[10px] break-all truncate text-muted-foreground">
                        {BASE_URL}/api/webhooks/delivery/{company.id}
                      </code>
                      <button
                        onClick={() => copyWebhook(company.id)}
                        className="shrink-0 text-muted-foreground hover:text-foreground"
                      >
                        {copiedId === company.id
                          ? <Check className="h-3.5 w-3.5 text-green-500" />
                          : <Copy className="h-3.5 w-3.5" />
                        }
                      </button>
                    </div>

                    <div className="flex gap-2 pt-1">
                      {!company.isDefault && (
                        <Button variant="outline" size="sm" className="flex-1 h-7 text-xs" onClick={() => setDefault(company.id)}>
                          <Star className="h-3 w-3 mr-1" />Définir défaut
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-destructive hover:text-destructive"
                        onClick={() => deleteCompany(company.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={driverDialogOpen} onOpenChange={setDriverDialogOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-2" />Ajouter un livreur</Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Nouveau livreur indépendant</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-2">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label>Nom *</Label>
                      <Input value={driverForm.name} onChange={e => setDriverForm(f => ({ ...f, name: e.target.value }))} placeholder="Nom complet" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Téléphone *</Label>
                      <Input value={driverForm.phone} onChange={e => setDriverForm(f => ({ ...f, phone: e.target.value }))} placeholder="0555 123 456" type="tel" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Email</Label>
                      <Input value={driverForm.email} onChange={e => setDriverForm(f => ({ ...f, email: e.target.value }))} placeholder="email@exemple.dz" type="email" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Wilaya</Label>
                      <Input value={driverForm.wilaya} onChange={e => setDriverForm(f => ({ ...f, wilaya: e.target.value }))} placeholder="Wilaya" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Type de véhicule</Label>
                      <Input value={driverForm.vehicleType} onChange={e => setDriverForm(f => ({ ...f, vehicleType: e.target.value }))} placeholder="Moto, voiture..." />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Société associée</Label>
                      <select
                        value={driverForm.deliveryCompanyId}
                        onChange={e => setDriverForm(f => ({ ...f, deliveryCompanyId: e.target.value }))}
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      >
                        <option value="">Aucune</option>
                        {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                  </div>
                  <Button
                    className="w-full"
                    onClick={saveDriver}
                    disabled={savingDriver || !driverForm.name.trim() || !driverForm.phone.trim()}
                  >
                    {savingDriver && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Enregistrer
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {drivers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground border rounded-xl border-dashed">
              <User className="h-8 w-8 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Aucun livreur</p>
              <p className="text-sm mt-1">Ajoutez vos livreurs indépendants</p>
            </div>
          ) : (
            <div className="border rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Livreur</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Wilaya</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Véhicule</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Société</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">Commandes</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {drivers.map(driver => (
                    <tr key={driver.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium">{driver.name}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <Phone className="h-3 w-3" />{driver.phone}
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <div className="flex items-center gap-1 text-muted-foreground text-xs">
                          <MapPin className="h-3 w-3" />{driver.wilaya ?? '—'}
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell text-muted-foreground text-xs">
                        {driver.vehicleType ?? '—'}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell text-xs">
                        {driver.deliveryCompany?.name ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground text-xs">
                        {driver._count.orders}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
