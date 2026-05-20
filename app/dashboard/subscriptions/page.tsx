'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Header } from '@/components/layout/header'
import { PageHeader } from '@/components/ui/page-header'
import { DataTable } from '@/components/ui/data-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatDA } from '@/lib/algerian/format'
import { Plus, RefreshCw, Pause, XCircle, Users, Mail, Settings as SettingsIcon, MailCheck, MailX, Zap, Trash2, AlertTriangle, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'En attente', TRIAL: 'Essai', ACTIVE: 'Actif', PAUSED: 'Pausé', CANCELLED: 'Annulé', EXPIRED: 'Expiré',
}
const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'success' | 'warning' | 'destructive' | 'outline' | 'info'> = {
  PENDING: 'info', TRIAL: 'secondary', ACTIVE: 'success', PAUSED: 'warning', CANCELLED: 'destructive', EXPIRED: 'outline',
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
  client: { id: string; name: string; firstName?: string; phone?: string; email?: string }
  plan: { id: string; name: string; price: number; currency: string; interval: string; intervalCount: number }
}

const STATUS_TABS = ['ALL', 'PENDING', 'ACTIVE', 'TRIAL', 'PAUSED', 'CANCELLED', 'EXPIRED']

export default function SubscriptionsPage() {
  const router = useRouter()
  const [subs, setSubs] = useState<Sub[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [loading, setLoading] = useState(true)

  // Edit email dialog
  const [emailDialogSub, setEmailDialogSub] = useState<Sub | null>(null)
  const [emailValue, setEmailValue] = useState('')
  const [savingEmail, setSavingEmail] = useState(false)

  // Delete confirmation dialog
  const [deleteSub, setDeleteSub] = useState<Sub | null>(null)
  const [deleting, setDeleting] = useState(false)

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
    setEmailValue(sub.clientEmail ?? '')
    setEmailDialogSub(sub)
  }

  async function confirmDelete() {
    if (!deleteSub) return
    setDeleting(true)
    const res = await fetch(`/api/subscriptions/${deleteSub.id}`, { method: 'DELETE' })
    if (res.ok) {
      toast.success('Abonnement supprimé')
      setDeleteSub(null)
      fetchSubs()
    } else {
      const d = await res.json().catch(() => ({}))
      toast.error(d.error ?? 'Erreur de suppression')
    }
    setDeleting(false)
  }

  async function saveEmail() {
    if (!emailDialogSub) return
    if (emailValue && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue)) {
      toast.error('Email invalide'); return
    }
    setSavingEmail(true)
    const res = await fetch(`/api/subscriptions/${emailDialogSub.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientEmail: emailValue || null }),
    })
    if (res.ok) {
      toast.success(emailValue ? 'Email mis à jour' : 'Email retiré')
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
          <p className="text-xs text-muted-foreground da-amount whitespace-nowrap">
            {formatDA(Number(row.plan.price))} / {row.plan.intervalCount > 1 ? `${row.plan.intervalCount} ` : ''}{INTERVAL_LABELS[row.plan.interval]}
          </p>
        </div>
      ),
    },
    {
      key: 'startDate', header: 'Début',
      className: 'hidden sm:table-cell',
      render: (row: Sub) => new Date(row.startDate).toLocaleDateString('fr-DZ'),
    },
    {
      key: 'nextBilling', header: 'Paiement',
      className: 'hidden md:table-cell',
      render: (row: Sub) => row.nextBilling
        ? new Date(row.nextBilling).toLocaleDateString('fr-DZ')
        : <span className="text-muted-foreground">—</span>,
    },
    {
      key: 'status', header: 'Statut',
      render: (row: Sub) => <Badge variant={STATUS_VARIANTS[row.status]}>{STATUS_LABELS[row.status]}</Badge>,
    },
    {
      key: 'reminder', header: 'Rappel',
      className: 'hidden lg:table-cell',
      render: (row: Sub) =>
        row.clientEmail ? (
          <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400" title={row.clientEmail}>
            <MailCheck className="h-3.5 w-3.5" />
            <span className="truncate max-w-[120px]">{row.clientEmail}</span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <MailX className="h-3.5 w-3.5" />
            Aucun
          </span>
        ),
    },
    {
      key: 'actions', header: '',
      render: (row: Sub) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" title="Email de rappel" onClick={() => openEmailDialog(row)}>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </Button>
          {row.status === 'PENDING' && (
            <Button variant="ghost" size="icon" title="Activer (paiement reçu)" onClick={() => updateStatus(row.id, 'ACTIVE')}
              className="text-green-600 hover:text-green-700 hover:bg-green-50">
              <CheckCircle className="h-4 w-4" />
            </Button>
          )}
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
          <Button variant="ghost" size="icon" title="Supprimer définitivement" onClick={() => setDeleteSub(row)}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
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
            <Link href="/dashboard/subscriptions/integration" title="Intégration API">
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                <Zap className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/dashboard/subscriptions/plans" title="Plans" data-tutorial="manage-plans">
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                <Users className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/dashboard/subscriptions/settings" title="Paramètres emails">
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                <SettingsIcon className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/dashboard/subscriptions/new" data-tutorial="new-sub">
              <Button className="gap-2 text-sm"><Plus className="h-4 w-4" />Nouveau</Button>
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

      {/* Edit reminder email dialog */}
      <Dialog open={!!emailDialogSub} onOpenChange={open => { if (!open) setEmailDialogSub(null) }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email de rappel
            </DialogTitle>
          </DialogHeader>
          {emailDialogSub && (
            <div className="space-y-4 mt-2">
              <p className="text-sm text-muted-foreground">
                <strong>{[emailDialogSub.client.firstName, emailDialogSub.client.name].filter(Boolean).join(' ')}</strong>
                {' · '}{emailDialogSub.plan.name}
              </p>
              <div className="space-y-1.5">
                <Label>Email du client</Label>
                <Input
                  type="email"
                  value={emailValue}
                  onChange={e => setEmailValue(e.target.value)}
                  placeholder="client@exemple.com"
                />
                <p className="text-xs text-muted-foreground">
                  Sans email, aucun rappel automatique ne sera envoyé. Le contenu et la langue se configurent dans{' '}
                  <Link href="/dashboard/subscriptions/settings" className="text-primary underline">Paramètres</Link>.
                </p>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setEmailDialogSub(null)}>Annuler</Button>
                <Button onClick={saveEmail} disabled={savingEmail}>
                  {savingEmail ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : null}
                  Enregistrer
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteSub} onOpenChange={open => { if (!open) setDeleteSub(null) }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Supprimer l&apos;abonnement
            </DialogTitle>
          </DialogHeader>
          {deleteSub && (
            <div className="space-y-4 mt-2">
              <p className="text-sm">
                Voulez-vous vraiment supprimer définitivement l&apos;abonnement de{' '}
                <strong>{[deleteSub.client.firstName, deleteSub.client.name].filter(Boolean).join(' ')}</strong>
                {' '}({deleteSub.plan.name}) ?
              </p>
              <div className="flex gap-3 items-start p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-sm">
                <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                <div className="text-destructive">
                  Cette action est <strong>irréversible</strong>. L&apos;abonnement disparaîtra complètement.
                  Pour le conserver dans l&apos;historique, utilisez plutôt <strong>Annuler</strong> (croix rouge).
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setDeleteSub(null)}>Annuler</Button>
                <Button variant="destructive" onClick={confirmDelete} disabled={deleting}>
                  {deleting ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
                  Supprimer définitivement
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  )
}
