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
import { WILAYAS_LIST } from '@/lib/algerian/format'
import { toast } from 'sonner'
import { Eye } from 'lucide-react'
import Link from 'next/link'

interface Client { id: string; name: string; email?: string; phone?: string; nif?: string; wilaya?: string }

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', phone: '', nif: '', nis: '', rc: '', address: '', wilaya: '' })

  const fetch_ = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), limit: '20', ...(search && { search }) })
    const res = await fetch(`/api/clients?${params}`)
    if (res.ok) { const d = await res.json(); setClients(d.clients); setTotal(d.total) }
    setLoading(false)
  }, [page, search])

  useEffect(() => { fetch_() }, [fetch_])

  const handleSave = async () => {
    if (!form.name) { toast.error('Nom requis'); return }
    setSaving(true)
    const res = await fetch('/api/clients', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    setSaving(false)
    if (res.ok) { toast.success('Client ajouté'); setOpen(false); setForm({ name:'',email:'',phone:'',nif:'',nis:'',rc:'',address:'',wilaya:'' }); fetch_() }
    else { const e = await res.json(); toast.error(e.error ?? 'Erreur') }
  }

  const columns = [
    { key: 'name', header: 'Nom', render: (r: Client) => <span className="font-medium">{r.name}</span> },
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Nouveau client</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="col-span-2 space-y-2"><Label>Nom *</Label><Input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} /></div>
            <div className="space-y-2"><Label>NIF</Label><Input value={form.nif} onChange={e => setForm(f => ({...f, nif: e.target.value}))} /></div>
            <div className="space-y-2"><Label>NIS</Label><Input value={form.nis} onChange={e => setForm(f => ({...f, nis: e.target.value}))} /></div>
            <div className="space-y-2"><Label>RC</Label><Input value={form.rc} onChange={e => setForm(f => ({...f, rc: e.target.value}))} /></div>
            <div className="space-y-2"><Label>Téléphone</Label><Input value={form.phone} onChange={e => setForm(f => ({...f, phone: e.target.value}))} placeholder="05XXXXXXXX" /></div>
            <div className="col-span-2 space-y-2"><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} /></div>
            <div className="col-span-2 space-y-2"><Label>Adresse</Label><Input value={form.address} onChange={e => setForm(f => ({...f, address: e.target.value}))} /></div>
            <div className="col-span-2 space-y-2">
              <Label>Wilaya</Label>
              <Select onValueChange={v => setForm(f => ({...f, wilaya: v}))}>
                <SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger>
                <SelectContent>{WILAYAS_LIST.map(w => <SelectItem key={w.code} value={w.name}>{w.code} — {w.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button onClick={handleSave} disabled={saving}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
