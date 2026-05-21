'use client'

import { useState, useEffect } from 'react'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatDA } from '@/lib/algerian/format'
import { Plus, Pencil, Trash2, Loader2, Users } from 'lucide-react'
import { toast } from 'sonner'

const INTERVAL_LABELS: Record<string, string> = {
  DAILY: 'Jour', WEEKLY: 'Semaine', MONTHLY: 'Mois', QUARTERLY: 'Trimestre', YEARLY: 'An',
}

interface Plan {
  id: string; name: string; description?: string; price: number
  currency: string; interval: string; intervalCount: number
  trialDays?: number | null; features: string[]; isActive: boolean
  _count?: { subscriptions: number }
}

const EMPTY_FORM = {
  name: '', description: '', price: '', interval: 'MONTHLY', intervalCount: '1',
  trialDays: '', features: '', isActive: true,
}

export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Plan | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  async function fetchPlans() {
    const res = await fetch('/api/subscriptions/plans')
    if (res.ok) setPlans(await res.json())
    setLoading(false)
  }
  useEffect(() => { fetchPlans() }, [])

  function openCreate() { setEditing(null); setForm(EMPTY_FORM); setOpen(true) }
  function openEdit(p: Plan) {
    setEditing(p)
    setForm({
      name: p.name, description: p.description ?? '', price: String(p.price),
      interval: p.interval, intervalCount: String(p.intervalCount),
      trialDays: p.trialDays ? String(p.trialDays) : '',
      features: p.features.join('\n'), isActive: p.isActive,
    })
    setOpen(true)
  }

  async function handleSave() {
    if (!form.name || !form.price) { toast.error('Nom et tarif requis'); return }
    setSaving(true)
    const payload = {
      name: form.name, description: form.description || undefined,
      price: parseFloat(form.price),
      interval: form.interval, intervalCount: parseInt(form.intervalCount),
      trialDays: form.trialDays ? parseInt(form.trialDays) : null,
      features: form.features.split('\n').map(s => s.trim()).filter(Boolean),
      isActive: form.isActive,
    }
    const url  = editing ? `/api/subscriptions/plans/${editing.id}` : '/api/subscriptions/plans'
    const meth = editing ? 'PATCH' : 'POST'
    const res  = await fetch(url, { method: meth, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    if (res.ok) {
      toast.success(editing ? 'Plan mis à jour' : 'Plan créé')
      setOpen(false); fetchPlans()
    } else {
      const d = await res.json()
      toast.error(d.error ?? 'Erreur')
    }
    setSaving(false)
  }

  async function handleDelete(p: Plan) {
    if (!confirm(`Supprimer le plan "${p.name}" ?`)) return
    const res = await fetch(`/api/subscriptions/plans/${p.id}`, { method: 'DELETE' })
    const d = await res.json()
    if (res.ok) { toast.success('Plan supprimé'); fetchPlans() }
    else toast.error(d.error ?? 'Erreur')
  }

  async function toggleActive(p: Plan) {
    const res = await fetch(`/api/subscriptions/plans/${p.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !p.isActive }),
    })
    if (res.ok) { toast.success(p.isActive ? 'Plan désactivé' : 'Plan activé'); fetchPlans() }
    else toast.error('Erreur')
  }

  return (
    <div>
      <Header title="Plans d'abonnement" />
      <div className="p-4 md:p-6 max-w-4xl">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-bold">Plans d&apos;abonnement</h1>
            <p className="text-muted-foreground text-sm mt-1">Créez et gérez vos offres tarifaires.</p>
          </div>
          <Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" />Nouveau plan</Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-40"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : plans.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <p className="font-medium">Aucun plan créé</p>
            <p className="text-sm mt-1">Créez votre premier plan d&apos;abonnement.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {plans.map(p => (
              <Card key={p.id} className={`relative ${!p.isActive ? 'opacity-60' : ''}`}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-bold text-base">{p.name}</h3>
                      {p.description && <p className="text-xs text-muted-foreground mt-0.5">{p.description}</p>}
                    </div>
                    {!p.isActive && <Badge variant="outline" className="text-xs">Inactif</Badge>}
                  </div>

                  <div className="mb-4">
                    <p className="text-2xl font-bold da-amount">{formatDA(Number(p.price))}</p>
                    <p className="text-xs text-muted-foreground">
                      / {p.intervalCount > 1 ? `${p.intervalCount} ` : ''}{INTERVAL_LABELS[p.interval].toLowerCase()}
                      {p.trialDays ? ` · ${p.trialDays}j d'essai` : ''}
                    </p>
                  </div>

                  {p.features.length > 0 && (
                    <ul className="space-y-1 mb-4">
                      {p.features.map((f, i) => (
                        <li key={i} className="text-xs text-muted-foreground flex items-center gap-1.5">
                          <span className="w-1 h-1 rounded-full bg-primary shrink-0" />
                          {f}
                        </li>
                      ))}
                    </ul>
                  )}

                  <div className="flex items-center gap-1 border-t pt-3 mt-2">
                    <span className="text-xs text-muted-foreground flex items-center gap-1 flex-1">
                      <Users className="h-3 w-3" />{p._count?.subscriptions ?? 0} abonné(s)
                    </span>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(p)} title="Modifier">
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => toggleActive(p)} className="text-xs h-7 px-2">
                      {p.isActive ? 'Désactiver' : 'Activer'}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(p)} title="Supprimer">
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create / Edit dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Modifier le plan' : 'Nouveau plan'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label>Nom du plan *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Mensuel Pro" />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Optionnel" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Tarif (DA) *</Label>
                <Input type="number" min="0" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="0" />
              </div>
              <div className="space-y-1.5">
                <Label>Jours d&apos;essai</Label>
                <Input type="number" min="0" value={form.trialDays} onChange={e => setForm(f => ({ ...f, trialDays: e.target.value }))} placeholder="0" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Intervalle</Label>
                <Select value={form.interval} onValueChange={v => setForm(f => ({ ...f, interval: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(INTERVAL_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Tous les</Label>
                <Input type="number" min="1" value={form.intervalCount} onChange={e => setForm(f => ({ ...f, intervalCount: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Fonctionnalités (une par ligne)</Label>
              <textarea
                className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm resize-y"
                value={form.features}
                onChange={e => setForm(f => ({ ...f, features: e.target.value }))}
                placeholder={"Accès illimité\nSupport prioritaire\nFacturation automatique"}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {editing ? 'Enregistrer' : 'Créer le plan'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
