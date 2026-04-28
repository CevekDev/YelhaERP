'use client'

import { useState, useEffect, useCallback } from 'react'
import { Header } from '@/components/layout/header'
import { PageHeader } from '@/components/ui/page-header'
import { DataTable } from '@/components/ui/data-table'
import { SearchInput } from '@/components/ui/search-input'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { WILAYAS_LIST } from '@/lib/algerian/format'
import { toast } from 'sonner'
import { Eye, Building2, User } from 'lucide-react'
import Link from 'next/link'

interface Client { id: string; name: string; firstName?: string; clientType: string; email?: string; phone?: string; nif?: string; wilaya?: string }

const EMPTY_FORM = { clientType: 'COMPANY', name: '', firstName: '', email: '', phone: '', nif: '', nis: '', rc: '', address: '', wilaya: '', description: '' }

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)

  const f = (k: string, v: string) => setForm(prev => ({ ...prev, [k]: v }))

  const fetch_ = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), limit: '20', ...(search && { search }) })
    const res = await fetch(`/api/clients?${params}`)
    if (res.ok) { const d = await res.json(); setClients(d.clients); setTotal(d.total) }
    setLoading(false)
  }, [page, search])

  useEffect(() => { fetch_() }, [fetch_])

  const handleSave = async () => {
    const nameField = form.clientType === 'COMPANY' ? form.name : form.firstName
    if (!nameField) { toast.error(form.clientType === 'COMPANY' ? 'Nom de société requis' : 'Prénom requis'); return }
    if (form.clientType === 'INDIVIDUAL' && !form.name) { toast.error('Nom de famille requis'); return }
    setSaving(true)
    const payload = { ...form, name: form.clientType === 'COMPANY' ? form.name : `${form.firstName} ${form.name}`.trim() }
    const res = await fetch('/api/clients', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    setSaving(false)
    if (res.ok) { toast.success('Client ajouté'); setOpen(false); setForm(EMPTY_FORM); fetch_() }
    else { const e = await res.json(); toast.error(e.error ?? 'Erreur') }
  }

  const columns = [
    { key: 'name', header: 'Nom / Société', render: (r: Client) => (
      <div className="flex items-center gap-2">
        <div className={`w-6 h-6 rounded-full flex items-center justify-center ${r.clientType === 'COMPANY' ? 'bg-blue-100' : 'bg-yelha-100'}`}>
          {r.clientType === 'COMPANY' ? <Building2 className="h-3 w-3 text-blue-600" /> : <User className="h-3 w-3 text-yelha-600" />}
        </div>
        <span className="font-medium">{r.name}</span>
      </div>
    )},
    { key: 'nif', header: 'NIF', render: (r: Client) => r.nif ?? <span className="text-muted-foreground">—</span> },
    { key: 'phone', header: 'Téléphone', render: (r: Client) => r.phone ?? <span className="text-muted-foreground">—</span> },
    { key: 'email', header: 'Email', render: (r: Client) => r.email ?? <span className="text-muted-foreground">—</span> },
    { key: 'wilaya', header: 'Wilaya', render: (r: Client) => r.wilaya ?? <span className="text-muted-foreground">—</span> },
    { key: 'actions', header: '', render: (r: Client) => (
      <Link href={`/dashboard/clients/${r.id}`}><Button variant="ghost" size="icon"><Eye className="h-4 w-4" /></Button></Link>
    )},
  ]

  return (
    <div>
      <Header title="Clients" />
      <div className="p-6">
        <PageHeader title="Clients" description={`${total} client${total > 1 ? 's' : ''}`} actionLabel="Nouveau client" onAction={() => setOpen(true)} />
        <Card>
          <div className="p-4 border-b"><SearchInput placeholder="Rechercher par nom, NIF..." onSearch={v => { setSearch(v); setPage(1) }} /></div>
          <CardContent className="p-0">
            <DataTable data={clients as unknown as Record<string, unknown>[]} columns={columns as never} total={total} page={page} limit={20} onPageChange={setPage} loading={loading} emptyText="Aucun client" />
          </CardContent>
        </Card>
      </div>

      <Dialog open={open} onOpenChange={v => { setOpen(v); if (!v) setForm(EMPTY_FORM) }}>
        <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
          <DialogHeader className="shrink-0">
            <DialogTitle>Nouveau client</DialogTitle>
          </DialogHeader>

          {/* Type selector */}
          <div className="shrink-0">
            <Tabs value={form.clientType} onValueChange={v => setForm({ ...EMPTY_FORM, clientType: v })}>
              <TabsList className="w-full">
                <TabsTrigger value="COMPANY" className="flex-1 gap-2">
                  <Building2 className="h-4 w-4" />Entreprise
                </TabsTrigger>
                <TabsTrigger value="INDIVIDUAL" className="flex-1 gap-2">
                  <User className="h-4 w-4" />Particulier
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Scrollable form */}
          <div className="flex-1 overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-4 py-2">
              {form.clientType === 'COMPANY' ? (
                <>
                  <div className="col-span-2 space-y-2">
                    <Label>Nom de la société *</Label>
                    <Input value={form.name} onChange={e => f('name', e.target.value)} placeholder="SARL Example..." />
                  </div>
                  <div className="space-y-2"><Label>NIF</Label><Input value={form.nif} onChange={e => f('nif', e.target.value)} placeholder="000123456789000" /></div>
                  <div className="space-y-2"><Label>NIS</Label><Input value={form.nis} onChange={e => f('nis', e.target.value)} /></div>
                  <div className="space-y-2"><Label>RC</Label><Input value={form.rc} onChange={e => f('rc', e.target.value)} placeholder="16/00-0000000" /></div>
                  <div className="space-y-2"><Label>Téléphone</Label><Input value={form.phone} onChange={e => f('phone', e.target.value)} placeholder="021XXXXXX" /></div>
                  <div className="col-span-2 space-y-2"><Label>Email</Label><Input type="email" value={form.email} onChange={e => f('email', e.target.value)} /></div>
                  <div className="col-span-2 space-y-2"><Label>Adresse</Label><Input value={form.address} onChange={e => f('address', e.target.value)} /></div>
                </>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label>Prénom *</Label>
                    <Input value={form.firstName} onChange={e => f('firstName', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Nom *</Label>
                    <Input value={form.name} onChange={e => f('name', e.target.value)} />
                  </div>
                  <div className="space-y-2"><Label>Téléphone</Label><Input value={form.phone} onChange={e => f('phone', e.target.value)} placeholder="05XXXXXXXX" /></div>
                  <div className="space-y-2"><Label>Email</Label><Input type="email" value={form.email} onChange={e => f('email', e.target.value)} /></div>
                </>
              )}

              {/* Wilaya - both types */}
              <div className="col-span-2 space-y-2">
                <Label>Wilaya</Label>
                <Select value={form.wilaya} onValueChange={v => f('wilaya', v)}>
                  <SelectTrigger><SelectValue placeholder="Choisir une wilaya..." /></SelectTrigger>
                  <SelectContent>
                    {WILAYAS_LIST.map(w => <SelectItem key={w.code} value={w.name}>{w.code} — {w.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Description - both types */}
              <div className="col-span-2 space-y-2">
                <Label>Description <span className="text-muted-foreground text-xs">(optionnel)</span></Label>
                <textarea
                  value={form.description}
                  onChange={e => f('description', e.target.value)}
                  rows={3}
                  placeholder="Notes, activité, informations supplémentaires..."
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="shrink-0 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-yelha-500 hover:bg-yelha-600">
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
