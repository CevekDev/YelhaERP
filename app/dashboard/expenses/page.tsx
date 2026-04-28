'use client'

import { useState, useEffect, useCallback } from 'react'
import { Header } from '@/components/layout/header'
import { PageHeader } from '@/components/ui/page-header'
import { DataTable } from '@/components/ui/data-table'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { formatDA } from '@/lib/algerian/format'
import { EXPENSE_ACCOUNTS } from '@/lib/algerian/expense-accounts'
import { toast } from 'sonner'
import { Plus, Loader2, CheckCircle, XCircle, Download } from 'lucide-react'

interface Expense {
  id: string; category: string; description: string; amount: number
  taxAmount: number; date: string; status: string; receiptUrl?: string
  notes?: string; user: { name: string }
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'En attente', APPROVED: 'Approuvée', REJECTED: 'Rejetée', EXPORTED: 'Exportée',
}
const STATUS_VARIANTS: Record<string, 'warning' | 'success' | 'destructive' | 'default'> = {
  PENDING: 'warning', APPROVED: 'success', REJECTED: 'destructive', EXPORTED: 'default',
}
const CATEGORY_LABELS: Record<string, string> = {
  TRANSPORT: 'Transport', REPAS: 'Repas', HEBERGEMENT: 'Hébergement',
  FOURNITURES: 'Fournitures', COMMUNICATION: 'Communication', MAINTENANCE: 'Maintenance',
  PUBLICITE: 'Publicité', FORMATION: 'Formation', HONORAIRES: 'Honoraires', AUTRE: 'Autre',
}

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('ALL')
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const [form, setForm] = useState({
    category: 'AUTRE', description: '', amount: '',
    taxAmount: '0', date: new Date().toISOString().split('T')[0], notes: '', receiptUrl: '',
  })

  const fetchExpenses = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), limit: '20' })
    if (status !== 'ALL') params.set('status', status)
    const res = await fetch(`/api/expenses?${params}`)
    if (res.ok) {
      const d = await res.json()
      setExpenses(d.expenses)
      setTotal(d.total)
    } else toast.error('Erreur chargement')
    setLoading(false)
  }, [page, status])

  useEffect(() => { fetchExpenses() }, [fetchExpenses])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const res = await fetch('/api/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        amount: Number(form.amount),
        taxAmount: Number(form.taxAmount),
        date: new Date(form.date).toISOString(),
      }),
    })
    if (!res.ok) { toast.error('Erreur lors de la création'); return }
    toast.success('Dépense ajoutée')
    setShowForm(false)
    setForm({ category: 'AUTRE', description: '', amount: '', taxAmount: '0', date: new Date().toISOString().split('T')[0], notes: '', receiptUrl: '' })
    fetchExpenses()
  }

  const handleApprove = async (id: string, action: 'approve' | 'reject') => {
    setActionLoading(id + action)
    const res = await fetch(`/api/expenses/${id}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })
    setActionLoading(null)
    if (!res.ok) { toast.error('Erreur'); return }
    toast.success(action === 'approve' ? 'Dépense approuvée' : 'Dépense rejetée')
    fetchExpenses()
  }

  const handleExport = async (id: string) => {
    setActionLoading(id + 'export')
    const res = await fetch(`/api/expenses/${id}/export-scf`, { method: 'POST' })
    setActionLoading(null)
    if (!res.ok) { const e = await res.json(); toast.error(e.error ?? 'Erreur export'); return }
    toast.success('Exporté vers la comptabilité SCF')
    fetchExpenses()
  }

  // Summary
  const totalAmount = expenses.reduce((s, e) => s + Number(e.amount), 0)
  const pendingCount = expenses.filter(e => e.status === 'PENDING').length

  const columns = [
    { key: 'date', header: 'Date', render: (r: Expense) => new Date(r.date).toLocaleDateString('fr-DZ') },
    { key: 'category', header: 'Catégorie', render: (r: Expense) => (
      <span className="text-xs bg-slate-100 rounded-full px-2 py-0.5">{CATEGORY_LABELS[r.category] ?? r.category}</span>
    )},
    { key: 'description', header: 'Description', render: (r: Expense) => (
      <div>
        <div className="font-medium">{r.description}</div>
        <div className="text-xs text-muted-foreground">par {r.user?.name}</div>
      </div>
    )},
    { key: 'amount', header: 'Montant TTC', className: 'da-amount text-right', render: (r: Expense) => formatDA(Number(r.amount)) },
    { key: 'status', header: 'Statut', render: (r: Expense) => (
      <Badge variant={STATUS_VARIANTS[r.status]}>{STATUS_LABELS[r.status]}</Badge>
    )},
    { key: 'actions', header: '', render: (r: Expense) => (
      <div className="flex gap-1 justify-end">
        {r.status === 'PENDING' && (
          <>
            <Button size="icon" variant="ghost" className="h-7 w-7 text-green-600 hover:text-green-700"
              onClick={() => handleApprove(r.id, 'approve')} disabled={actionLoading === r.id + 'approve'}>
              {actionLoading === r.id + 'approve' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
            </Button>
            <Button size="icon" variant="ghost" className="h-7 w-7 text-red-600 hover:text-red-700"
              onClick={() => handleApprove(r.id, 'reject')} disabled={actionLoading === r.id + 'reject'}>
              {actionLoading === r.id + 'reject' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
            </Button>
          </>
        )}
        {r.status === 'APPROVED' && (
          <Button size="icon" variant="ghost" className="h-7 w-7 text-blue-600 hover:text-blue-700"
            onClick={() => handleExport(r.id)} disabled={actionLoading === r.id + 'export'}
            title="Exporter vers SCF">
            {actionLoading === r.id + 'export' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
          </Button>
        )}
      </div>
    )},
  ]

  return (
    <div>
      <Header title="Dépenses" />
      <div className="p-6 space-y-4">
        <PageHeader title="Dépenses" description={`${total} dépenses`} />

        {/* Summary */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">Total (page)</div>
            <div className="text-xl font-bold da-amount mt-1">{formatDA(totalAmount)}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">En attente</div>
            <div className="text-xl font-bold mt-1 text-amber-600">{pendingCount}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">Comptes SCF</div>
            <div className="text-xl font-bold mt-1">{Object.keys(EXPENSE_ACCOUNTS).length} catégories</div>
          </Card>
        </div>

        <Card>
          <div className="p-4 border-b flex items-center gap-3">
            <Select value={status} onValueChange={v => { setStatus(v); setPage(1) }}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tous les statuts</SelectItem>
                {Object.entries(STATUS_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex-1" />
            <Button className="gap-2" onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4" />Nouvelle dépense
            </Button>
          </div>
          <CardContent className="p-0">
            <DataTable
              data={expenses as unknown as Record<string, unknown>[]}
              columns={columns as never}
              total={total} page={page} limit={20}
              onPageChange={setPage} loading={loading}
              emptyText="Aucune dépense"
            />
          </CardContent>
        </Card>
      </div>

      {/* New expense dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Nouvelle dépense</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Catégorie</Label>
              <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Description *</Label>
              <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Montant TTC (DA) *</Label>
                <Input type="number" min="0" step="1" value={form.amount}
                  onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label>TVA (DA)</Label>
                <Input type="number" min="0" step="1" value={form.taxAmount}
                  onChange={e => setForm(f => ({ ...f, taxAmount: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Date *</Label>
              <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optionnel..." />
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Annuler</Button>
              <Button type="submit">Ajouter</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
