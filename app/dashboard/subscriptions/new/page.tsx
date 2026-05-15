'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatDA } from '@/lib/algerian/format'
import { Loader2, ArrowLeft, UserPlus, Search, Settings as SettingsIcon, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'

const INTERVAL_LABELS: Record<string, string> = {
  DAILY: 'jour', WEEKLY: 'semaine', MONTHLY: 'mois', QUARTERLY: 'trimestre', YEARLY: 'an',
}

interface Plan { id: string; name: string; price: number; currency: string; interval: string; intervalCount: number; trialDays?: number | null }
interface Client { id: string; name: string; firstName?: string; phone?: string; email?: string }

export default function NewSubscriptionPage() {
  const router = useRouter()
  const [plans, setPlans] = useState<Plan[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loadingPlans, setLoadingPlans] = useState(true)
  const [saving, setSaving] = useState(false)

  // Form state
  const [planId, setPlanId] = useState('')
  const [clientMode, setClientMode] = useState<'existing' | 'new'>('existing')
  const [clientSearch, setClientSearch] = useState('')
  const [selectedClientId, setSelectedClientId] = useState('')
  const [status, setStatus] = useState('ACTIVE')
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0])
  const [notes, setNotes] = useState('')
  const [clientEmail, setClientEmail] = useState('')

  // Settings status (to show warning if not configured)
  const [settingsConfigured, setSettingsConfigured] = useState<boolean | null>(null)

  // New client fields
  const [newClient, setNewClient] = useState({
    name: '', firstName: '', phone: '', email: '', wilaya: '', address: '', clientType: 'INDIVIDUAL',
  })

  useEffect(() => {
    fetch('/api/subscriptions/plans').then(r => r.json()).then(d => {
      if (Array.isArray(d)) setPlans(d.filter((p: Plan & { isActive: boolean }) => p.isActive))
      setLoadingPlans(false)
    })
    fetch('/api/subscriptions/settings').then(r => r.json()).then(d => {
      if (d && !d.error) {
        setSettingsConfigured(!!(d.ccpNumber || d.chargilyKey || d.whatsapp))
      }
    })
  }, [])

  useEffect(() => {
    if (clientMode !== 'existing') return
    const timer = setTimeout(() => {
      const params = new URLSearchParams({ limit: '20' })
      if (clientSearch) params.set('search', clientSearch)
      fetch(`/api/clients?${params}`).then(r => r.json()).then(d => {
        if (d.clients) setClients(d.clients)
      })
    }, 300)
    return () => clearTimeout(timer)
  }, [clientSearch, clientMode])

  // Auto-fill email from selected client
  useEffect(() => {
    if (clientMode === 'existing' && selectedClientId) {
      const c = clients.find(cl => cl.id === selectedClientId)
      if (c?.email && !clientEmail) setClientEmail(c.email)
    }
  }, [selectedClientId, clients, clientMode, clientEmail])

  // Auto-fill email from new client form
  useEffect(() => {
    if (clientMode === 'new' && newClient.email && !clientEmail) {
      setClientEmail(newClient.email)
    }
  }, [newClient.email, clientMode, clientEmail])

  const selectedPlan = plans.find(p => p.id === planId)
  const filteredClients = clients.filter(c =>
    [c.name, c.firstName, c.phone, c.email].join(' ').toLowerCase().includes(clientSearch.toLowerCase())
  )

  async function handleSubmit() {
    if (!planId) { toast.error('Sélectionnez un plan'); return }
    if (clientMode === 'existing' && !selectedClientId) { toast.error('Sélectionnez un client'); return }
    if (clientMode === 'new' && !newClient.name) { toast.error('Nom du client requis'); return }
    if (clientEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientEmail)) {
      toast.error('Email invalide'); return
    }

    setSaving(true)
    const payload: Record<string, unknown> = {
      planId, status,
      startDate: new Date(startDate).toISOString(),
      notes: notes || undefined,
      clientEmail: clientEmail || undefined,
    }
    if (clientMode === 'existing') payload.clientId = selectedClientId
    else payload.newClient = { ...newClient, firstName: newClient.firstName || undefined }

    const res = await fetch('/api/subscriptions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const data = await res.json()
    if (res.ok) {
      toast.success('Abonnement créé')
      router.push('/dashboard/subscriptions')
    } else {
      toast.error(data.error ?? 'Erreur')
    }
    setSaving(false)
  }

  return (
    <div>
      <Header title="Nouvel abonnement" />
      <div className="p-4 md:p-6 max-w-2xl">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => router.back()}><ArrowLeft className="h-4 w-4" /></Button>
          <div>
            <h1 className="text-2xl font-bold">Nouvel abonnement</h1>
            <p className="text-muted-foreground text-sm">Assignez un plan à un client.</p>
          </div>
        </div>

        {settingsConfigured === false && (
          <div className="mb-5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1 text-sm text-amber-900 dark:text-amber-200">
              <p className="font-semibold mb-1">Paramètres de paiement non configurés</p>
              <p>Vos coordonnées (CCP, WhatsApp, Chargily) ne sont pas renseignées. Les emails de rappel envoyés aux clients ne contiendront aucune option de paiement.</p>
            </div>
            <Link href="/dashboard/subscriptions/settings">
              <Button size="sm" variant="outline" className="gap-1.5">
                <SettingsIcon className="h-3.5 w-3.5" />
                Configurer
              </Button>
            </Link>
          </div>
        )}

        <div className="space-y-5">
          {/* Plan selection */}
          <Card>
            <CardContent className="p-5 space-y-4">
              <h2 className="font-semibold">Plan d&apos;abonnement</h2>
              {loadingPlans ? (
                <div className="flex items-center gap-2 text-muted-foreground text-sm"><Loader2 className="h-4 w-4 animate-spin" />Chargement...</div>
              ) : plans.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  Aucun plan actif.{' '}
                  <a href="/dashboard/subscriptions/plans" className="text-primary underline">Créer un plan</a>
                </div>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {plans.map(p => (
                    <button
                      key={p.id}
                      onClick={() => setPlanId(p.id)}
                      className={`text-left p-4 rounded-xl border-2 transition-all ${
                        planId === p.id ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground'
                      }`}
                    >
                      <p className="font-semibold text-sm">{p.name}</p>
                      <p className="text-base font-bold da-amount mt-1">{formatDA(Number(p.price))}</p>
                      <p className="text-xs text-muted-foreground">
                        / {p.intervalCount > 1 ? `${p.intervalCount} ` : ''}{INTERVAL_LABELS[p.interval]}
                        {p.trialDays ? ` · ${p.trialDays}j essai` : ''}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Client selection */}
          <Card>
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">Client</h2>
                <div className="flex gap-1">
                  <button
                    onClick={() => setClientMode('existing')}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                      clientMode === 'existing' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Existant
                  </button>
                  <button
                    onClick={() => setClientMode('new')}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 ${
                      clientMode === 'new' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <UserPlus className="h-3 w-3" />Nouveau
                  </button>
                </div>
              </div>

              {clientMode === 'existing' ? (
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      className="pl-9"
                      placeholder="Rechercher un client..."
                      value={clientSearch}
                      onChange={e => setClientSearch(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {filteredClients.map(c => (
                      <button
                        key={c.id}
                        onClick={() => setSelectedClientId(c.id)}
                        className={`w-full text-left px-3 py-2 rounded-lg border transition-colors text-sm ${
                          selectedClientId === c.id ? 'border-primary bg-primary/5' : 'border-transparent hover:bg-muted'
                        }`}
                      >
                        <span className="font-medium">{[c.firstName, c.name].filter(Boolean).join(' ')}</span>
                        {c.phone && <span className="text-muted-foreground ml-2 text-xs">{c.phone}</span>}
                        {c.email && <span className="text-muted-foreground ml-2 text-xs">{c.email}</span>}
                      </button>
                    ))}
                    {filteredClients.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Aucun client trouvé.{' '}
                        <button className="text-primary underline" onClick={() => setClientMode('new')}>Créer un nouveau</button>
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Prénom</Label>
                      <Input value={newClient.firstName} onChange={e => setNewClient(c => ({ ...c, firstName: e.target.value }))} placeholder="Optionnel" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Nom *</Label>
                      <Input value={newClient.name} onChange={e => setNewClient(c => ({ ...c, name: e.target.value }))} placeholder="Nom de famille" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Téléphone</Label>
                      <Input value={newClient.phone} onChange={e => setNewClient(c => ({ ...c, phone: e.target.value }))} placeholder="05XXXXXXXX" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Email</Label>
                      <Input type="email" value={newClient.email} onChange={e => setNewClient(c => ({ ...c, email: e.target.value }))} placeholder="email@exemple.com" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Wilaya</Label>
                      <Input value={newClient.wilaya} onChange={e => setNewClient(c => ({ ...c, wilaya: e.target.value }))} placeholder="Alger" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Type</Label>
                      <Select value={newClient.clientType} onValueChange={v => setNewClient(c => ({ ...c, clientType: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="INDIVIDUAL">Particulier</SelectItem>
                          <SelectItem value="COMPANY">Entreprise</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Adresse</Label>
                    <Input value={newClient.address} onChange={e => setNewClient(c => ({ ...c, address: e.target.value }))} placeholder="Adresse complète" />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Reminder email */}
          <Card>
            <CardContent className="p-5 space-y-4">
              <div>
                <h2 className="font-semibold">Email de rappel</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Adresse à laquelle le client recevra son rappel 1 jour avant l&apos;expiration (ou la fin d&apos;essai).
                  <Link href="/dashboard/subscriptions/settings" className="text-primary underline ml-1">
                    Configurer le contenu et la langue
                  </Link>
                </p>
              </div>
              <div className="space-y-1.5">
                <Label>Email du client</Label>
                <Input
                  type="email"
                  value={clientEmail}
                  onChange={e => setClientEmail(e.target.value)}
                  placeholder="client@exemple.com"
                />
                {!clientEmail && (
                  <p className="text-xs text-muted-foreground">
                    Sans email, aucun rappel automatique ne sera envoyé pour cet abonnement.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Options */}
          <Card>
            <CardContent className="p-5 space-y-4">
              <h2 className="font-semibold">Options</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Statut initial</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVE">Actif</SelectItem>
                      <SelectItem value="TRIAL">Essai gratuit</SelectItem>
                      <SelectItem value="PAUSED">Pausé</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Date de début</Label>
                  <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                </div>
              </div>
              {status === 'TRIAL' && selectedPlan && !selectedPlan.trialDays && (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  Ce plan n&apos;a pas de durée d&apos;essai définie. La date de fin d&apos;essai utilisera l&apos;intervalle du plan.
                </p>
              )}
              <div className="space-y-1.5">
                <Label>Notes internes</Label>
                <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes internes..." />
              </div>
            </CardContent>
          </Card>

          {/* Summary */}
          {selectedPlan && (
            <div className="rounded-xl bg-primary/5 border border-primary/20 p-4 text-sm">
              <p className="font-semibold text-primary mb-1">Récapitulatif</p>
              <p>Plan : <strong>{selectedPlan.name}</strong></p>
              <p>Tarif : <strong className="da-amount">{formatDA(Number(selectedPlan.price))}</strong> / {INTERVAL_LABELS[selectedPlan.interval]}</p>
              {clientMode === 'existing' && selectedClientId && (
                <p>Client : <strong>{clients.find(c => c.id === selectedClientId)?.name}</strong></p>
              )}
              {clientMode === 'new' && newClient.name && (
                <p>Client : <strong>{[newClient.firstName, newClient.name].filter(Boolean).join(' ')}</strong> (nouveau)</p>
              )}
              {clientEmail && <p>Email rappel : <strong>{clientEmail}</strong></p>}
              {status === 'TRIAL' && selectedPlan.trialDays && (
                <p>Essai gratuit : <strong>{selectedPlan.trialDays} jours</strong></p>
              )}
            </div>
          )}

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => router.back()}>Annuler</Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Créer l&apos;abonnement
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
