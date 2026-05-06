'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Loader2, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { PageHeader } from '@/components/ui/page-header'

// ── Types ──────────────────────────────────────────────────────────────────────
type KdsStation = 'MAIN' | 'GRILL' | 'COLD' | 'DRINKS' | 'DESSERT'

type RestaurantConfig = {
  // Général
  name: string
  address: string
  phone: string
  logoUrl: string
  receiptFooter: string
  // Prix
  taxRate: number
  serviceCharge: number
  // Numérotation
  tablePrefix: string
  orderPrefix: string
  // Fonctionnalités
  enableQrMenu: boolean
  enableLoyalty: boolean
  enableDelivery: boolean
  // Fidélité
  loyaltyPointsRate: number
  // Livraison
  deliveryFeeDefault: number
  // KDS
  activeStations: KdsStation[]
}

const ALL_STATIONS: { id: KdsStation; label: string }[] = [
  { id: 'MAIN',    label: 'Principal' },
  { id: 'GRILL',   label: 'Grill' },
  { id: 'COLD',    label: 'Froid' },
  { id: 'DRINKS',  label: 'Boissons' },
  { id: 'DESSERT', label: 'Desserts' },
]

const DEFAULT_CONFIG: RestaurantConfig = {
  name: '',
  address: '',
  phone: '',
  logoUrl: '',
  receiptFooter: '',
  taxRate: 9,
  serviceCharge: 0,
  tablePrefix: 'T',
  orderPrefix: 'CMD',
  enableQrMenu: false,
  enableLoyalty: false,
  enableDelivery: false,
  loyaltyPointsRate: 100,
  deliveryFeeDefault: 0,
  activeStations: ['MAIN'],
}

// ── Component ──────────────────────────────────────────────────────────────────
export default function RestaurantConfigPage() {
  const [config, setConfig] = useState<RestaurantConfig>(DEFAULT_CONFIG)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function fetchConfig() {
      setLoading(true)
      try {
        const res = await fetch('/api/restaurant/config')
        const data = await res.json()
        if (data.data) {
          setConfig({ ...DEFAULT_CONFIG, ...data.data })
        }
      } catch {
        toast.error('Erreur de chargement')
      } finally {
        setLoading(false)
      }
    }
    fetchConfig()
  }, [])

  function set<K extends keyof RestaurantConfig>(key: K, value: RestaurantConfig[K]) {
    setConfig(prev => ({ ...prev, [key]: value }))
  }

  function toggleStation(station: KdsStation) {
    setConfig(prev => ({
      ...prev,
      activeStations: prev.activeStations.includes(station)
        ? prev.activeStations.filter(s => s !== station)
        : [...prev.activeStations, station],
    }))
  }

  async function saveConfig() {
    setSaving(true)
    try {
      const res = await fetch('/api/restaurant/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })
      if (!res.ok) { toast.error('Erreur lors de l\'enregistrement'); return }
      toast.success('Configuration enregistrée')
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  )

  return (
    <div className="p-4 md:p-6 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Restaurant — Configuration</h2>
          <p className="text-muted-foreground mt-1">Paramètres généraux du restaurant</p>
        </div>
        <Button onClick={saveConfig} disabled={saving}>
          {saving
            ? <Loader2 className="h-4 w-4 animate-spin mr-2" />
            : <Save className="h-4 w-4 mr-2" />
          }
          Enregistrer
        </Button>
      </div>

      <div className="space-y-6">
        {/* Section 1 — Général */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <h3 className="font-semibold text-base border-b pb-2">Général</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-2">
                <Label>Nom du restaurant *</Label>
                <Input
                  value={config.name}
                  onChange={e => set('name', e.target.value)}
                  placeholder="Le Petit Bistro"
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Adresse</Label>
                <Input
                  value={config.address}
                  onChange={e => set('address', e.target.value)}
                  placeholder="123 Rue Didouche Mourad, Alger"
                />
              </div>
              <div className="space-y-2">
                <Label>Téléphone</Label>
                <Input
                  value={config.phone}
                  onChange={e => set('phone', e.target.value)}
                  placeholder="023 00 00 00"
                  type="tel"
                />
              </div>
              <div className="space-y-2">
                <Label>URL du logo</Label>
                <Input
                  value={config.logoUrl}
                  onChange={e => set('logoUrl', e.target.value)}
                  placeholder="https://..."
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Pied de ticket (reçu)</Label>
                <Textarea
                  value={config.receiptFooter}
                  onChange={e => set('receiptFooter', e.target.value)}
                  placeholder="Merci pour votre visite ! À bientôt."
                  rows={2}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 2 — Prix */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <h3 className="font-semibold text-base border-b pb-2">Prix et taxes</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>TVA par défaut (%)</Label>
                <Input
                  type="number"
                  value={config.taxRate}
                  onChange={e => set('taxRate', Number(e.target.value))}
                  min={0}
                  max={100}
                />
              </div>
              <div className="space-y-2">
                <Label>Service charge (%)</Label>
                <Input
                  type="number"
                  value={config.serviceCharge}
                  onChange={e => set('serviceCharge', Number(e.target.value))}
                  min={0}
                  max={100}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 3 — Numérotation */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <h3 className="font-semibold text-base border-b pb-2">Numérotation</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Préfixe tables</Label>
                <Input
                  value={config.tablePrefix}
                  onChange={e => set('tablePrefix', e.target.value)}
                  placeholder="T"
                  maxLength={5}
                />
                <p className="text-xs text-muted-foreground">Exemple : T1, T2, T3…</p>
              </div>
              <div className="space-y-2">
                <Label>Préfixe commandes</Label>
                <Input
                  value={config.orderPrefix}
                  onChange={e => set('orderPrefix', e.target.value)}
                  placeholder="CMD"
                  maxLength={6}
                />
                <p className="text-xs text-muted-foreground">Exemple : CMD-2026-0001</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 4 — Fonctionnalités */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <h3 className="font-semibold text-base border-b pb-2">Fonctionnalités</h3>
            <div className="space-y-4">
              <SwitchRow
                label="Menu QR Code"
                description="Permettre aux clients de scanner un QR code pour voir le menu"
                checked={config.enableQrMenu}
                onCheckedChange={v => set('enableQrMenu', v)}
              />
              <SwitchRow
                label="Programme de fidélité"
                description="Activer le système de points de fidélité"
                checked={config.enableLoyalty}
                onCheckedChange={v => set('enableLoyalty', v)}
              />
              <SwitchRow
                label="Livraison à domicile"
                description="Activer les commandes en livraison"
                checked={config.enableDelivery}
                onCheckedChange={v => set('enableDelivery', v)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Section 5 — Fidélité (conditionnel) */}
        {config.enableLoyalty && (
          <Card>
            <CardContent className="p-6 space-y-4">
              <h3 className="font-semibold text-base border-b pb-2">Fidélité</h3>
              <div className="space-y-2">
                <Label>Taux de points (DA par point)</Label>
                <Input
                  type="number"
                  value={config.loyaltyPointsRate}
                  onChange={e => set('loyaltyPointsRate', Number(e.target.value))}
                  min={1}
                />
                <p className="text-xs text-muted-foreground">
                  Ex: 100 DA dépensés = 1 point de fidélité
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Section 6 — Livraison (conditionnel) */}
        {config.enableDelivery && (
          <Card>
            <CardContent className="p-6 space-y-4">
              <h3 className="font-semibold text-base border-b pb-2">Livraison</h3>
              <div className="space-y-2">
                <Label>Frais de livraison par défaut (DA)</Label>
                <Input
                  type="number"
                  value={config.deliveryFeeDefault}
                  onChange={e => set('deliveryFeeDefault', Number(e.target.value))}
                  min={0}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Section 7 — KDS */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <h3 className="font-semibold text-base border-b pb-2">Stations KDS</h3>
            <p className="text-sm text-muted-foreground">
              Sélectionnez les stations actives pour l'affichage cuisine.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {ALL_STATIONS.map(station => (
                <label
                  key={station.id}
                  className={`flex items-center gap-3 border-2 rounded-lg px-4 py-3 cursor-pointer transition-colors ${
                    config.activeStations.includes(station.id)
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-muted-foreground'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={config.activeStations.includes(station.id)}
                    onChange={() => toggleStation(station.id)}
                    className="rounded"
                  />
                  <span className={`font-medium text-sm ${
                    config.activeStations.includes(station.id) ? 'text-primary' : ''
                  }`}>
                    {station.label}
                  </span>
                </label>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Save button at bottom */}
        <div className="flex justify-end pb-8">
          <Button onClick={saveConfig} disabled={saving} size="lg">
            {saving
              ? <Loader2 className="h-5 w-5 animate-spin mr-2" />
              : <Save className="h-5 w-5 mr-2" />
            }
            Enregistrer la configuration
          </Button>
        </div>
      </div>
    </div>
  )
}

// ── Switch Row ─────────────────────────────────────────────────────────────────
function SwitchRow({
  label, description, checked, onCheckedChange,
}: {
  label: string
  description: string
  checked: boolean
  onCheckedChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="font-medium text-sm">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  )
}
