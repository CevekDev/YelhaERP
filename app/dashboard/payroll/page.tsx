'use client'

import { useState, useEffect, useCallback } from 'react'
import { Header } from '@/components/layout/header'
import { PageHeader } from '@/components/ui/page-header'
import { DataTable } from '@/components/ui/data-table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatDA } from '@/lib/algerian/format'
import { toast } from 'sonner'
import { Play, UserPlus, Users } from 'lucide-react'
import { useT } from '@/lib/i18n'

interface Employee { id: string; firstName: string; lastName: string; position?: string; baseSalary: number; isActive: boolean }
interface PayrollEntry { id: string; month: number; year: number; netSalary: number; grossSalary: number; cnasEmployee: number; cnasEmployer: number; irg: number; isPaid: boolean; employee: { firstName: string; lastName: string } }

const MONTHS_FR = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc']


export default function PayrollPage() {
  const { t } = useT()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [entries, setEntries] = useState<PayrollEntry[]>([])
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year] = useState(now.getFullYear())
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [openEmp, setOpenEmp] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ firstName: '', lastName: '', position: '', nin: '', socialNumber: '', baseSalary: '', hireDate: '' })

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [e, p] = await Promise.all([
      fetch('/api/payroll?type=employees').then(r => r.json()),
      fetch(`/api/payroll?type=entries&month=${month}&year=${year}`).then(r => r.json()),
    ])
    setEmployees(e)
    setEntries(p)
    setLoading(false)
  }, [month, year])

  useEffect(() => { fetchData() }, [fetchData])

  const generatePayroll = async () => {
    setGenerating(true)
    const res = await fetch('/api/payroll?action=generate', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ month, year }),
    })
    setGenerating(false)
    if (res.ok) { toast.success(`Fiches de paie générées — ${MONTHS_FR[month - 1]} ${year}`); fetchData() }
    else toast.error('Erreur lors de la génération')
  }

  const addEmployee = async () => {
    setSaving(true)
    const res = await fetch('/api/payroll?action=employee', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, baseSalary: Number(form.baseSalary), hireDate: new Date(form.hireDate).toISOString() }),
    })
    setSaving(false)
    if (res.ok) { toast.success('Employé ajouté'); setOpenEmp(false); fetchData() }
    else { const e = await res.json(); toast.error(e.error ?? 'Erreur') }
  }

  const empColumns = [
    { key: 'name', header: t('pages.payroll_col_employee'), render: (r: Employee) => <span className="font-medium">{r.firstName} {r.lastName}</span> },
    { key: 'position', header: 'Poste', render: (r: Employee) => r.position ?? '—' },
    { key: 'baseSalary', header: 'Salaire de base', className: 'da-amount', render: (r: Employee) => formatDA(Number(r.baseSalary)) },
    { key: 'status', header: t('pages.payroll_col_status'), render: (r: Employee) => <Badge variant={r.isActive ? 'success' : 'secondary'}>{r.isActive ? 'Actif' : 'Inactif'}</Badge> },
  ]

  const payColumns = [
    { key: 'name', header: t('pages.payroll_col_employee'), render: (r: PayrollEntry) => `${r.employee.firstName} ${r.employee.lastName}` },
    { key: 'grossSalary', header: t('pages.payroll_col_gross'), className: 'da-amount', render: (r: PayrollEntry) => formatDA(Number(r.grossSalary)) },
    { key: 'cnasEmployee', header: t('pages.payroll_col_cnas'), className: 'da-amount', render: (r: PayrollEntry) => formatDA(Number(r.cnasEmployee)) },
    { key: 'irg', header: t('pages.payroll_col_irg'), className: 'da-amount', render: (r: PayrollEntry) => formatDA(Number(r.irg)) },
    { key: 'netSalary', header: t('pages.payroll_col_net'), className: 'da-amount font-bold', render: (r: PayrollEntry) => <span className="text-yelha-600">{formatDA(Number(r.netSalary))}</span> },
    { key: 'isPaid', header: t('pages.payroll_col_status'), render: (r: PayrollEntry) => <Badge variant={r.isPaid ? 'success' : 'warning'}>{r.isPaid ? t('pages.payroll_paid') : t('pages.payroll_pending')}</Badge> },
  ]

  const totalNet = entries.reduce((s, e) => s + Number(e.netSalary), 0)
  const totalCNASEmployer = entries.reduce((s, e) => s + Number(e.cnasEmployer), 0)

  return (
    <div>
      <Header title={t('pages.payroll_title')} />
      <div className="p-4 md:p-6 space-y-6">
        <PageHeader title={t('pages.payroll_title')} description={t('pages.payroll_desc')} />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Employés actifs', value: String(employees.length) },
            { label: t('pages.payroll_tab_entries'), value: String(entries.length) },
            { label: t('pages.payroll_col_net'), value: formatDA(totalNet), da: true },
            { label: 'Charge CNAS patronale', value: formatDA(totalCNASEmployer), da: true },
          ].map(k => (
            <Card key={k.label}>
              <CardContent className="pt-4">
                <p className="text-sm text-muted-foreground">{k.label}</p>
                <p className={`text-xl font-bold mt-1 ${k.da ? 'da-amount' : ''}`}>{k.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="entries">
          <div className="flex items-center justify-between mb-4">
            <TabsList>
              <TabsTrigger value="entries">{t('pages.payroll_tab_entries')}</TabsTrigger>
              <TabsTrigger value="employees">{t('pages.payroll_tab_employees')}</TabsTrigger>
            </TabsList>
            <div className="flex items-center gap-2">
              <Select value={String(month)} onValueChange={v => setMonth(Number(v))}>
                <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                <SelectContent>{MONTHS_FR.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m} {year}</SelectItem>)}</SelectContent>
              </Select>
              <Button onClick={generatePayroll} disabled={generating} className="gap-2">
                <Play className="h-4 w-4" />{t('pages.payroll_generate')} {MONTHS_FR[month - 1]}
              </Button>
            </div>
          </div>

          <TabsContent value="entries">
            <Card>
              <CardContent className="p-0">
                <DataTable data={entries as unknown as Record<string, unknown>[]} columns={payColumns as never} total={entries.length} page={1} limit={100} onPageChange={() => {}} loading={loading} emptyText="Aucune fiche — cliquez sur Générer" />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="employees">
            <Card>
              <div className="p-4 border-b flex justify-end">
                <Button variant="outline" size="sm" onClick={() => setOpenEmp(true)} className="gap-2">
                  <UserPlus className="h-4 w-4" />{t('pages.payroll_new_employee')}
                </Button>
              </div>
              <CardContent className="p-0">
                <DataTable data={employees as unknown as Record<string, unknown>[]} columns={empColumns as never} total={employees.length} page={1} limit={100} onPageChange={() => {}} loading={loading}
                  emptyIcon={Users} emptyText="Aucun employé" emptyDescription="Ajoutez vos employés pour générer les bulletins de paie." emptyAction={{ label: 'Ajouter un employé', onClick: () => setOpenEmp(true) }} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={openEmp} onOpenChange={setOpenEmp}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t('pages.payroll_new_employee')}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="space-y-2"><Label>Prénom *</Label><Input value={form.firstName} onChange={e => setForm(f => ({...f, firstName: e.target.value}))} /></div>
            <div className="space-y-2"><Label>Nom *</Label><Input value={form.lastName} onChange={e => setForm(f => ({...f, lastName: e.target.value}))} /></div>
            <div className="col-span-2 space-y-2"><Label>Poste</Label><Input value={form.position} onChange={e => setForm(f => ({...f, position: e.target.value}))} /></div>
            <div className="space-y-2"><Label>NIN</Label><Input value={form.nin} onChange={e => setForm(f => ({...f, nin: e.target.value}))} /></div>
            <div className="space-y-2"><Label>N° Sécurité sociale</Label><Input value={form.socialNumber} onChange={e => setForm(f => ({...f, socialNumber: e.target.value}))} /></div>
            <div className="space-y-2"><Label>Salaire de base (DA) *</Label><Input type="number" min="0" value={form.baseSalary} onChange={e => setForm(f => ({...f, baseSalary: e.target.value}))} /></div>
            <div className="space-y-2"><Label>Date d'embauche *</Label><Input type="date" value={form.hireDate} onChange={e => setForm(f => ({...f, hireDate: e.target.value}))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenEmp(false)}>Annuler</Button>
            <Button onClick={addEmployee} disabled={saving}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
