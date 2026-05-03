'use client'

import { useState, useEffect } from 'react'
import { Header } from '@/components/layout/header'
import { Switch } from '@/components/ui/switch'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calculator, UserCheck, Briefcase, Factory, Users, ShoppingCart, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

const REQUIRED_MODULES = ['dashboard', 'ventes', 'achats', 'stocks']

const OPTIONAL_MODULES = [
  {
    id: 'compta',
    label: 'Comptabilité',
    icon: Calculator,
    color: 'bg-violet-100 text-violet-600',
    description: 'Journal PCN, grand livre, bilan, TVA, fiscalité algérienne',
  },
  {
    id: 'rh',
    label: 'Ressources humaines',
    icon: UserCheck,
    color: 'bg-pink-100 text-pink-600',
    description: 'Gestion des employés, paie IRG/CNAS, congés, recrutement',
  },
  {
    id: 'projets',
    label: 'Projets',
    icon: Briefcase,
    color: 'bg-cyan-100 text-cyan-600',
    description: 'Gestion de projets, feuilles de temps, budget',
  },
  {
    id: 'production',
    label: 'Production',
    icon: Factory,
    color: 'bg-amber-100 text-amber-600',
    description: 'Ordres de fabrication, nomenclatures (BOM)',
  },
  {
    id: 'crm',
    label: 'CRM',
    icon: Users,
    color: 'bg-rose-100 text-rose-600',
    description: 'Pipeline commercial, leads, statistiques de vente',
  },
  {
    id: 'pos',
    label: 'Point de Vente',
    icon: ShoppingCart,
    color: 'bg-green-100 text-green-600',
    description: 'Caisse physique, ventes en magasin, gestion des dettes',
  },
]

export default function ApplicationsPage() {
  const [activeModules, setActiveModules] = useState<string[]>(REQUIRED_MODULES)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/settings/modules')
      .then(r => r.json())
      .then(d => {
        if (d.activeModules) setActiveModules(d.activeModules)
      })
      .catch(() => toast.error('Erreur de chargement'))
      .finally(() => setLoading(false))
  }, [])

  async function toggleModule(moduleId: string, enabled: boolean) {
    const next = enabled
      ? [...activeModules, moduleId]
      : activeModules.filter(m => m !== moduleId)

    setSaving(true)
    try {
      const res = await fetch('/api/settings/modules', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modules: next }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? 'Erreur'); return }
      setActiveModules(data.activeModules)
      toast.success(enabled ? 'Module activé' : 'Module désactivé')
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <Header title="Applications" />
      <div className="p-4 md:p-6 max-w-3xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Applications</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Activez ou désactivez les modules selon les besoins de votre entreprise.
          </p>
        </div>

        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Modules obligatoires (toujours actifs)
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {['Tableau de bord', 'Ventes', 'Achats', 'Stocks'].map(name => (
              <div key={name} className="flex items-center justify-between p-3 border rounded-xl bg-muted/30">
                <span className="text-sm font-medium">{name}</span>
                <Badge variant="secondary" className="text-xs">Toujours actif</Badge>
              </div>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Modules optionnels
          </p>
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {OPTIONAL_MODULES.map(mod => {
                const isActive = activeModules.includes(mod.id)
                const Icon = mod.icon
                return (
                  <Card key={mod.id} className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${mod.color}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-semibold text-sm">{mod.label}</p>
                          <Switch
                            checked={isActive}
                            onCheckedChange={v => toggleModule(mod.id, v)}
                            disabled={saving}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{mod.description}</p>
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
