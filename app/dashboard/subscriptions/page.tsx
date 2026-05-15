'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { PageHeader } from '@/components/ui/page-header'
import { DataTable } from '@/components/ui/data-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatDA } from '@/lib/algerian/format'
import { Plus, RefreshCw, Pause, XCircle, Users, Mail } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { TutorialOverlay } from '@/components/tutorial/tutorial-overlay'

const STATUS_LABELS: Record<string, string> = {
  TRIAL: 'Essai', ACTIVE: 'Actif', PAUSED: 'Pausé', CANCELLED: 'Annulé', EXPIRED: 'Expiré',
}
const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'success' | 'warning' | 'destructive' | 'outline'> = {
  TRIAL: 'secondary', ACTIVE: 'success', PAUSED: 'warning', CANCELLED: 'destructive', EXPIRED: 'outline',
}
const INTERVAL_LABELS: Record<string, string> = {
  DAILY: 'jour', WEEKLY: 'semaine', MONTHLY: 'mois', QUARTERLY: 'trimestre', YEARLY: 'an',
}

interface Sub {
  id: string
  status: string
  startDate: string
  nextBilling: string | null
  clientEmail?: string | null
  whatsapp?: string | null
  ccpNumber?: string | null
  chargilyKey?: string | null
  emailLanguage?: string | null
  emailMessage?: string | null
  client: { id: string; name: string; firstName?: string; phone?: string }
  plan: { id: string; name: string; price: number; currency: string; interval: string; intervalCount: number }
}

const STATUS_TABS = ['ALL', 'ACTIVE', 'TRIAL', 'PAUSED', 'CANCELLED', 'EXPIRED']

export default function SubscriptionsPage() {
  const router = useRouter()
  const [subs, setSubs] = useState<Sub[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [loading, setLoading] = useState(true)

  // Email settings dialog
  const [emailDialogSub, setEmailDialogSub] = useState<Sub | null>(null)
  const [emailForm, setEmailForm] = useState({
    clientEmail: '', whatsapp: '', ccpNumber: '', chargilyKey: '', emailLanguage: 'fr', emailMessage: '',
  })
  const [savingEmail, setSavingEmail] = useState(false)

  const fetchSubs = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page) })
    if (statusFilter !== 'ALL') params.set('status', statusFilter)
    const res = await fetch(`/api/subscriptions?${params}`)
    if (res.ok) {
      const d = await res.json()
      setSubs(d.subscriptions)
      setTotal(d.total)
    } else toast.error('Erreur de chargement')
    setLoading(false)
  }, [page, statusFilter])

  useEffect(() => { fetchSubs() }, [fetchSubs])

  async function updateStatus(id: string, status: string) {
    const res = await fetch(`/api/subscriptions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (res.ok) { toast.success('Statut mis à jour'); fetchSubs() }
    else toast.error('Erreur')
  }

  function openEmailDialog(sub: Sub) {
    setEmailForm({
      clientEmail: sub.clientEmail ?? '',
      whatsapp: sub.whatsapp ?? '',
      ccpNumber: sub.ccpNumber ?? '',
      chargilyKey: sub.chargilyKey ?? '',
      emailLanguage: sub.emailLanguage ?? 'fr',
      emailMessage: sub.emailMessage ?? '',
    })
    setEmailDialogSub(sub)
  }

  async function saveEmailSettings() {
    if (!emailDialogSub) return
    if (emailForm.clientEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailForm.clientEmail)) {
      toast.error('Email invalide'); return
    }
    setSavingEmail(true)
    const res = await fetch(`/api/subscriptions/${emailDialogSub.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientEmail:   emailForm.clientEmail || null,
        whatsapp:      emailForm.whatsapp || null,
        ccpNumber:     emailForm.ccpNumber || null,
        chargilyKey:   emailForm.chargilyKey || null,
        emailLanguage: emailForm.emailLanguage,
        emailMessage:  emailForm.emailMessage || null,
      }),
    })
    if (res.ok) {
      toast.success('Paramètres mis à jour')
      setEmailDialogSub(null)
      fetchSubs()
    } else toast.error('Erreur')
    setSavingEmail(false)
  }

  const columns = [
    {
      key: 'client', header: 'Client',
      render: (row: Sub) => (
        <div>
          <p className="font-medium text-sm">{[row.client.firstName, row.client.name].filter(Boolean).join(' ')}</p>
          {row.client.phone && <p className="text-xs text-muted-foreground">{row.client.phone}</p>}
        </div>
      ),
    },
    {
      key: 'plan', header: 'Plan',
      render: (row: Sub) => (
        <div>
          <p className="font-medium text-sm">{row.plan.name}</p>
          <p className="text-xs text-muted-foreground da-amount">
            {formatDA(Number(row.plan.price))} / {row.plan.intervalCount > 1 ? `${row.plan.intervalCount} ` : ''}{INTERVAL_LABELS[row.plan.interval]}
          </p>
        </div>
      ),
    },
    {
      key: 'startDate', header: 'Début',
      render: (row: Sub) => new Date(row.startDate).toLocaleDateString('fr-DZ'),
    },
    {
      key: 'nextBilling', header: 'Prochain paiement',
      render: (row: Sub) => row.nextBilling
        ? new Date(row.nextBilling).toLocaleDateString('fr-DZ')
        : <span className="text-muted-foreground">—</span>,
    },
    {
      key: 'status', header: 'Statut',
      render: (row: Sub) => (
        <div className="flex items-center gap-1.5">
          <Badge variant={STATUS_VARIANTS[row.status]}>{STATUS_LABELS[row.status]}</Badge>
          {row.clientEmail && (
            <span title={`Email rappel: ${row.clientEmail}`} className="text-primary">
              <Mail className="h-3 w-3" />
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'actions', header: '',
      render: (row: Sub) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" title="Paramètres email" onClick={() => openEmailDialog(row)}>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </Button>
          {row.status === 'ACTIVE' && (
            <Button variant="ghost" size="icon" title="Mettre en pause" onClick={() => updateStatus(row.id, 'PAUSED')}>
              <Pause className="h-4 w-4" />
            </Button>
          )}
          {row.status === 'PAUSED' && (
            <Button variant="ghost" size="icon" title="Réactiver" onClick={() => updateStatus(row.id, 'ACTIVE')}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          )}
          {!['CANCELLED', 'EXPIRED'].includes(row.status) && (
            <Button variant="ghost" size="icon" title="Annuler" onClick={() => updateStatus(row.id, 'CANCELLED')}>
              <XCircle className="h-4 w-4 text-destructive" />
            </Button>
          )}
        </div>
      ),
    },
  ]

  return (
    <div>
      <Header title="Abonnements" />
      <div className="p-4 md:p-6">
        <PageHeader
          title="Abonnements"
          description={`${total} abonnement${total > 1 ? 's' : ''} au total`}
        />

        <Card>
          <div className="p-4 border-b flex items-center gap-3 flex-wrap">
            <div className="flex gap-1 flex-wrap">
              {STATUS_TABS.map(s => (
                <button
                  key={s}
                  onClick={() => { setStatusFilter(s); setPage(1) }}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                    statusFilter === s
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {s === 'ALL' ? 'Tous' : STATUS_LABELS[s]}
                </button>
              ))}
            </div>
            <div className="flex-1" />
            <Link href="/dashboard/subscriptions/plans" data-tutorial="manage-plans">
              <Button variant="outline" className="gap-2"><Users className="h-4 w-4" />Plans</Button>
            </Link>
            <Link href="/dashboard/subscriptions/new" data-tutorial="new-sub">
              <Button className="gap-2"><Plus className="h-4 w-4" />Nouvel abonnement</Button>
            </Link>
          </div>
          <CardContent className="p-0">
            <DataTable
              data={subs as unknown as Record<string, unknown>[]}
              columns={columns as never}
              total={total} page={page} limit={20}
              onPageChange={setPage} loading={loading}
              emptyIcon={RefreshCw}
              emptyText="Aucun abonnement"
              emptyDescription="Créez votre premier abonnement pour commencer."
              emptyAction={{ label: 'Nouvel abonnement', onClick: () => router.push('/dashboard/subscriptions/new') }}
            />
          </CardContent>
        </Card>
      </div>

      {/* Email Settings Dialog */}
      <Dialog open={!!emailDialogSub} onOpenChange={open => { if (!open) setEmailDialogSub(null) }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Paramètres de rappel email
            </DialogTitle>
          </DialogHeader>
          {emailDialogSub && (
            <div className="space-y-4 mt-2">
              <p className="text-sm text-muted-foreground">
                <strong>{[emailDialogSub.client.firstName, emailDialogSub.client.name].filter(Boolean).join(' ')}</strong>
                {' · '}{emailDialogSub.plan.name}
              </p>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5 col-span-2 sm:col-span-1">
                  <Label>Email du client</Label>
                  <Input
                    type="email"
                    value={emailForm.clientEmail}
                    onChange={e => setEmailForm(f => ({ ...f, clientEmail: e.target.value }))}
                    placeholder="client@exemple.com"
                  />
                </div>
                <div className="space-y-1.5 col-span-2 sm:col-span-1">
                  <Label>Votre WhatsApp</Label>
                  <Input
                    value={emailForm.whatsapp}
                    onChange={e => setEmailForm(f => ({ ...f, whatsapp: e.target.value }))}
                    placeholder="+213 5XX XX XX XX"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Numéro CCP</Label>
                  <Input
                    value={emailForm.ccpNumber}
                    onChange={e => setEmailForm(f => ({ ...f, ccpNumber: e.target.value }))}
                    placeholder="123456789 / Clé 12"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Clé Chargily ePay</Label>
                  <Input
                    type="password"
                    value={emailForm.chargilyKey}
                    onChange={e => setEmailForm(f => ({ ...f, chargilyKey: e.target.value }))}
                    placeholder="test_sk_..."
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Langue de l&apos;email</Label>
                <Select
                  value={emailForm.emailLanguage}
                  onValueChange={v => setEmailForm(f => ({ ...f, emailLanguage: v }))}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fr">🇫🇷 Français</SelectItem>
                    <SelectItem value="en">🇬🇧 English</SelectItem>
                    <SelectItem value="ar">🇩🇿 العربية</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Message personnalisé</Label>
                <Textarea
                  value={emailForm.emailMessage}
                  onChange={e => setEmailForm(f => ({ ...f, emailMessage: e.target.value }))}
                  placeholder="Message affiché dans l'email de rappel..."
                  rows={3}
                  maxLength={2000}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setEmailDialogSub(null)}>Annuler</Button>
                <Button onClick={saveEmailSettings} disabled={savingEmail}>
                  {savingEmail ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : null}
                  Enregistrer
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <TutorialOverlay pageKey="subscriptions" />
    </div>
  )
}
