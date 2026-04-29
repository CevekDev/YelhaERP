'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Header } from '@/components/layout/header'
import { PageHeader } from '@/components/ui/page-header'
import { DataTable } from '@/components/ui/data-table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { ShieldAlert } from 'lucide-react'

interface Company {
  id: string; name: string; plan: string; createdAt: string
  _count: { users: number; invoices: number }
}

const PLAN_COLORS: Record<string, string> = {
  TRIAL: 'warning', STARTER: 'info', PRO: 'success', AGENCY: 'default',
}

export default function AdminPage() {
  const { data: session } = useSession()
  const [companies, setCompanies] = useState<Company[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Company | null>(null)
  const [newPlan, setNewPlan] = useState('')
  const [saving, setSaving] = useState(false)

  // Seul OWNER peut accéder
  if (session?.user?.role !== 'OWNER') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <ShieldAlert className="h-12 w-12 text-destructive" />
        <p className="text-lg font-medium">Accès réservé aux propriétaires</p>
      </div>
    )
  }

  const fetchData = async () => {
    setLoading(true)
    const res = await fetch(`/api/admin/companies?page=${page}`)
    if (res.ok) { const d = await res.json(); setCompanies(d.companies); setTotal(d.total) }
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [page])

  const handleChangePlan = async () => {
    if (!selected || !newPlan) return
    setSaving(true)
    const res = await fetch('/api/admin/companies', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ companyId: selected.id, plan: newPlan }),
    })
    setSaving(false)
    if (res.ok) { toast.success('Plan mis à jour'); setSelected(null); fetchData() }
    else toast.error('Erreur')
  }

  const columns = [
    { key: 'name', header: 'Entreprise', render: (r: Company) => <span className="font-medium">{r.name}</span> },
    { key: 'plan', header: 'Plan', render: (r: Company) => <Badge variant={PLAN_COLORS[r.plan] as 'warning' | 'info' | 'success' | 'default'}>{r.plan}</Badge> },
    { key: 'users', header: 'Utilisateurs', render: (r: Company) => r._count.users },
    { key: 'invoices', header: 'Factures', render: (r: Company) => r._count.invoices },
    { key: 'createdAt', header: 'Inscrit le', render: (r: Company) => new Date(r.createdAt).toLocaleDateString('fr-DZ') },
    { key: 'actions', header: '', render: (r: Company) => (
      <Button variant="ghost" size="sm" onClick={() => { setSelected(r); setNewPlan(r.plan) }}>Changer plan</Button>
    )},
  ]

  return (
    <div>
      <Header title="Administration" />
      <div className="p-4 md:p-6 space-y-6">
        <PageHeader title="Panneau d'administration" description="Gestion des abonnements et des entreprises" />

        <div className="grid grid-cols-3 gap-4">
          {[{ label: 'Entreprises', value: total }, { label: 'TRIAL', value: companies.filter(c => c.plan === 'TRIAL').length }, { label: 'PRO / AGENCY', value: companies.filter(c => ['PRO','AGENCY'].includes(c.plan)).length }].map(k => (
            <Card key={k.label}>
              <CardContent className="pt-4">
                <p className="text-sm text-muted-foreground">{k.label}</p>
                <p className="text-2xl font-bold mt-1">{k.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">Toutes les entreprises</CardTitle></CardHeader>
          <CardContent className="p-0">
            <DataTable data={companies as unknown as Record<string, unknown>[]} columns={columns as never} total={total} page={page} limit={20} onPageChange={setPage} loading={loading} emptyText="Aucune entreprise" />
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Changer le plan — {selected?.name}</DialogTitle></DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label>Nouveau plan</Label>
              <Select value={newPlan} onValueChange={setNewPlan}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="TRIAL">TRIAL — Essai gratuit</SelectItem>
                  <SelectItem value="STARTER">STARTER — 1 500 DA/mois</SelectItem>
                  <SelectItem value="PRO">PRO — 3 200 DA/mois</SelectItem>
                  <SelectItem value="AGENCY">AGENCY — 9 900 DA/mois</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelected(null)}>Annuler</Button>
            <Button onClick={handleChangePlan} disabled={saving}>Appliquer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
