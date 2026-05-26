'use client'

import { useState, useEffect, useCallback } from 'react'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Loader2, Search, Trash2, AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react'
import { formatDA } from '@/lib/algerian/format'
import { toast } from 'sonner'

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'En attente', TRIAL: 'Essai', ACTIVE: 'Actif',
  PAUSED: 'Pausé', CANCELLED: 'Annulé', EXPIRED: 'Expiré', PAST_DUE: 'Impayé',
}
const STATUS_COLORS: Record<string, string> = {
  ACTIVE:    'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  TRIAL:     'bg-blue-500/15 text-blue-400 border-blue-500/20',
  PENDING:   'bg-amber-500/15 text-amber-400 border-amber-500/20',
  PAUSED:    'bg-yellow-500/15 text-yellow-400 border-yellow-500/20',
  PAST_DUE:  'bg-orange-500/15 text-orange-400 border-orange-500/20',
  CANCELLED: 'bg-red-500/15 text-red-400 border-red-500/20',
  EXPIRED:   'bg-muted/40 text-muted-foreground border-border',
}
const INTERVAL_LABELS: Record<string, string> = {
  WEEKLY: 'sem', MONTHLY: 'mois', QUARTERLY: 'trim', YEARLY: 'an',
}

interface Subscription {
  id: string; status: string; startDate: string; nextBilling: string | null; clientEmail?: string | null
  plan: { id: string; name: string; price: number; interval: string; intervalCount: number }
}
interface Client {
  id: string; name: string; firstName?: string; phone?: string; email?: string; wilaya?: string
  subscriptions: Subscription[]
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${STATUS_COLORS[status] ?? STATUS_COLORS.EXPIRED}`}>
      {STATUS_LABELS[status] ?? status}
    </span>
  )
}

function ClientRow({ client, onDelete }: { client: Client; onDelete: () => void }) {
  const [expanded, setExpanded] = useState(false)
  const hasSubs = client.subscriptions.length > 0

  return (
    <>
      <tr className="border-b last:border-0 hover:bg-muted/10 transition-colors">
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => hasSubs && setExpanded(e => !e)}
              className={`shrink-0 ${hasSubs ? 'text-muted-foreground hover:text-foreground' : 'text-transparent'}`}
            >
              {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
            <div>
              <p className="font-medium text-sm">{[client.firstName, client.name].filter(Boolean).join(' ')}</p>
              {client.phone && <p className="text-xs text-muted-foreground">{client.phone}</p>}
            </div>
          </div>
        </td>
        <td className="px-4 py-3 text-muted-foreground text-sm hidden sm:table-cell">{client.email ?? '—'}</td>
        <td className="px-4 py-3 text-muted-foreground text-sm hidden md:table-cell">{client.wilaya ?? '—'}</td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            {hasSubs ? (
              <div className="flex gap-1 flex-wrap">
                {client.subscriptions.map(s => <StatusBadge key={s.id} status={s.status} />)}
              </div>
            ) : (
              <span className="text-xs text-muted-foreground">—</span>
            )}
          </div>
        </td>
        <td className="px-4 py-3 w-10">
          <Button variant="ghost" size="icon" onClick={onDelete} title="Supprimer" className="h-8 w-8">
            <Trash2 className="h-3.5 w-3.5 text-destructive" />
          </Button>
        </td>
      </tr>
      {expanded && client.subscriptions.map(sub => (
        <tr key={sub.id} className="border-b last:border-0 bg-muted/5">
          <td className="pl-12 pr-4 py-2.5" colSpan={2}>
            <div className="flex items-center gap-2">
              <StatusBadge status={sub.status} />
              <span className="text-sm font-medium">{sub.plan.name}</span>
              <span className="text-xs text-muted-foreground da-amount">
                {formatDA(Number(sub.plan.price))} / {sub.plan.intervalCount > 1 ? `${sub.plan.intervalCount} ` : ''}{INTERVAL_LABELS[sub.plan.interval] ?? sub.plan.interval}
              </span>
            </div>
          </td>
          <td className="px-4 py-2.5 text-xs text-muted-foreground hidden md:table-cell">
            Début : {new Date(sub.startDate).toLocaleDateString('fr-DZ')}
          </td>
          <td className="px-4 py-2.5 text-xs text-muted-foreground">
            {sub.nextBilling
              ? `Prochain : ${new Date(sub.nextBilling).toLocaleDateString('fr-DZ')}`
              : sub.clientEmail ?? ''}
          </td>
          <td />
        </tr>
      ))}
    </>
  )
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<Client | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchClients = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ limit: '100' })
    if (search) params.set('search', search)
    const res = await fetch(`/api/clients?${params}`)
    if (res.ok) {
      const d = await res.json()
      setClients(d.clients ?? [])
    }
    setLoading(false)
  }, [search])

  useEffect(() => {
    const t = setTimeout(fetchClients, 300)
    return () => clearTimeout(t)
  }, [fetchClients])

  async function confirmDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    const res = await fetch(`/api/clients/${deleteTarget.id}`, { method: 'DELETE' })
    const d = await res.json().catch(() => ({}))
    if (res.ok) {
      toast.success('Client supprimé')
      setDeleteTarget(null)
      fetchClients()
    } else {
      toast.error(d.error ?? 'Erreur de suppression')
    }
    setDeleting(false)
  }

  return (
    <div>
      <Header title="Clients" />
      <div className="p-4 md:p-6 max-w-4xl">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-bold">Clients</h1>
            <p className="text-muted-foreground text-sm mt-1">
              {clients.length > 0 ? `${clients.length} client${clients.length > 1 ? 's' : ''}` : 'Liste de vos clients enregistrés.'}
            </p>
          </div>
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Rechercher par nom, téléphone ou email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : clients.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <p className="font-medium">{search ? 'Aucun résultat' : 'Aucun client'}</p>
            <p className="text-sm mt-1">{search ? 'Modifiez votre recherche.' : "Les clients apparaissent ici après création d'un abonnement."}</p>
          </div>
        ) : (
          <div className="rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-muted-foreground text-xs">
                  <th className="text-left px-4 py-3 font-medium">Client</th>
                  <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Email</th>
                  <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Wilaya</th>
                  <th className="text-left px-4 py-3 font-medium">Abonnements</th>
                  <th className="px-4 py-3 w-10" />
                </tr>
              </thead>
              <tbody>
                {clients.map(c => (
                  <ClientRow key={c.id} client={c} onDelete={() => setDeleteTarget(c)} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog open={!!deleteTarget} onOpenChange={open => { if (!open) setDeleteTarget(null) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Supprimer le client
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Supprimer <strong>{[deleteTarget?.firstName, deleteTarget?.name].filter(Boolean).join(' ')}</strong> ?
            {(deleteTarget?.subscriptions?.length ?? 0) > 0 && (
              <> Ses {deleteTarget!.subscriptions.length} abonnement(s) non-actifs seront aussi supprimés.</>
            )}
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Annuler</Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleting}>
              {deleting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Supprimer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
