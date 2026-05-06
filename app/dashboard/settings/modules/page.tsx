'use client'

import { useEffect, useState } from 'react'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Users, FileText, Truck, ShoppingCart, Package, Calculator,
  UserCheck, Receipt, Briefcase, Factory, CreditCard,
  ShoppingBag, UtensilsCrossed, RefreshCw,
} from 'lucide-react'

type ModuleKey =
  | 'crm' | 'invoices' | 'quotes' | 'clients' | 'suppliers' | 'purchases'
  | 'stock' | 'accounting' | 'hr' | 'payroll' | 'projects' | 'production'
  | 'pos' | 'ecommerce' | 'restaurant' | 'subscriptions' | 'tax' | 'expenses'

interface ModuleInfo {
  key: ModuleKey
  icon: React.ElementType
  label: string
  description: string
  essential?: boolean
}

const MODULES: ModuleInfo[] = [
  { key: 'crm',           icon: Users,           label: 'CRM',              description: 'Pipeline commercial et leads' },
  { key: 'invoices',      icon: FileText,        label: 'Factures',         description: 'Facturation clients',             essential: true },
  { key: 'quotes',        icon: FileText,        label: 'Devis',            description: 'Devis et propositions commerciales' },
  { key: 'clients',       icon: Users,           label: 'Clients',          description: 'Gestion du portefeuille clients',   essential: true },
  { key: 'suppliers',     icon: Truck,           label: 'Fournisseurs',     description: 'Gestion des fournisseurs' },
  { key: 'purchases',     icon: ShoppingCart,    label: 'Achats',           description: 'Bons de commande fournisseurs' },
  { key: 'stock',         icon: Package,         label: 'Stocks',           description: 'Gestion des niveaux de stock',     essential: true },
  { key: 'accounting',    icon: Calculator,      label: 'Comptabilité',     description: 'Journal SCF et balance' },
  { key: 'hr',            icon: UserCheck,       label: 'RH',               description: 'Employés, congés, évaluations' },
  { key: 'payroll',       icon: Receipt,         label: 'Paie',             description: 'Bulletins de paie IRG/CNAS' },
  { key: 'projects',      icon: Briefcase,       label: 'Projets',          description: 'Gestion de projets et timesheets' },
  { key: 'production',    icon: Factory,         label: 'Production',       description: 'Ordres de fabrication (BOM)' },
  { key: 'pos',           icon: CreditCard,      label: 'Caisse (POS)',     description: 'Point de vente physique' },
  { key: 'ecommerce',     icon: ShoppingBag,     label: 'E-commerce',       description: 'Shopify / WooCommerce' },
  { key: 'restaurant',    icon: UtensilsCrossed, label: 'Restaurant',       description: 'Tables, commandes, KDS' },
  { key: 'subscriptions', icon: RefreshCw,       label: 'Abonnements',      description: 'Abonnements clients récurrents' },
  { key: 'tax',           icon: FileText,        label: 'Fiscalité G50',    description: 'Déclarations mensuelles G50' },
  { key: 'expenses',      icon: Receipt,         label: 'Dépenses',         description: 'Notes de frais et dépenses',        essential: true },
]

type ModulesState = Record<ModuleKey, boolean>

const DEFAULT_STATE: ModulesState = {
  crm: true, invoices: true, quotes: true, clients: true,
  suppliers: true, purchases: true, stock: true, accounting: false,
  hr: false, payroll: false, projects: false, production: false,
  pos: false, ecommerce: false, restaurant: false, subscriptions: false,
  tax: false, expenses: true,
}

export default function ModulesPage() {
  const [modules, setModules] = useState<ModulesState>(DEFAULT_STATE)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch('/api/settings/modules')
      .then(r => r.json())
      .then(data => {
        if (data?.data) {
          setModules(prev => ({ ...prev, ...data.data }))
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  function toggle(key: ModuleKey) {
    setModules(prev => ({ ...prev, [key]: !prev[key] }))
    setSaved(false)
  }

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    try {
      const res = await fetch('/api/settings/modules', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(modules),
      })
      if (res.ok) setSaved(true)
    } catch {
      // noop
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="p-4 md:p-6 text-muted-foreground">Chargement des modules…</div>
    )
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Modules actifs</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Activez ou désactivez les modules de votre espace. Les modules{' '}
            <span className="font-medium text-foreground">Essentiels</span> ne peuvent pas être désactivés.
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Enregistrement…' : saved ? 'Enregistré ✓' : 'Sauvegarder'}
        </Button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {MODULES.map(mod => {
          const Icon = mod.icon
          const isEssential = mod.essential ?? false
          const isActive = isEssential ? true : modules[mod.key]

          return (
            <Card key={mod.key} className={`transition-all ${isActive ? 'border-foreground/20 shadow-sm' : 'opacity-60'}`}>
              <CardContent className="p-4 flex items-start gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isActive ? 'bg-yelha-50 text-yelha-600' : 'bg-muted text-muted-foreground'}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm">{mod.label}</span>
                    {isEssential && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Essentiel</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{mod.description}</p>
                </div>
                <Switch
                  checked={isActive}
                  onCheckedChange={() => !isEssential && toggle(mod.key)}
                  disabled={isEssential}
                  aria-label={`Activer ${mod.label}`}
                  className="shrink-0 mt-0.5"
                />
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Footer save button */}
      <div className="flex justify-end pt-2">
        <Button onClick={handleSave} disabled={saving} size="lg">
          {saving ? 'Enregistrement…' : saved ? 'Enregistré ✓' : 'Sauvegarder les modifications'}
        </Button>
      </div>
    </div>
  )
}
