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
import { Truck } from 'lucide-react'
import { TutorialOverlay } from '@/components/tutorial/tutorial-overlay'
import { useT } from '@/lib/i18n'

interface Supplier { id: string; name: string; email?: string; phone?: string; nif?: string; wilaya?: string }

export default function SuppliersPage() {
  const { t } = useT()
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
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
    const res = await fetch(`/api/suppliers?${params}`)
    if (res.ok) { const d = await res.json(); setSuppliers(d.suppliers); setTotal(d.total) }
    setLoading(false)
  }, [page, search])

  useEffect(() => { fetch_() }, [fetch_])

  const handleSave = async () => {
    if (!form.name) { toast.error('Nom requis'); return }
    setSaving(true)
    const res = await fetch('/api/suppliers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    setSaving(false)
    if (res.ok) { toast.success('Fournisseur ajouté'); setOpen(false); fetch_() }
    else { const e = await res.json(); toast.error(e.error ?? 'Erreur') }
  }

  const columns = [
    { key: 'name', header: t('common.name'), render: (r: Supplier) => <span className="font-medium">{r.name}</span> },
    { key: 'nif', header: 'NIF', render: (r: Supplier) => r.nif ?? '—' },
    { key: 'phone', header: t('common.phone'), render: (r: Supplier) => r.phone ?? '—' },
    { key: 'email', header: t('common.email'), render: (r: Supplier) => r.email ?? '—' },
    { key: 'wilaya', header: t('common.wilaya'), render: (r: Supplier) => r.wilaya ?? '—' },
  ]

  return (
    <div>
      <Header title={t('pages.suppliers_title')} />
      <div className="p-4 md:p-6">
        <PageHeader title={t('pages.suppliers_title')} description={`${total} ${t('pages.suppliers_title').toLowerCase()}`} actionLabel={t('pages.suppliers_new')} onAction={() => setOpen(true)} actionDataTutorial="new-supplier" />
        <Card>
          <div className="p-4 border-b"><SearchInput placeholder={t('common.search')} onSearch={v => { setSearch(v); setPage(1) }} /></div>
          <CardContent className="p-0">
            <DataTable data={suppliers as unknown as Record<string, unknown>[]} columns={columns as never} total={total} page={page} limit={20} onPageChange={setPage} loading={loading}
              emptyIcon={Truck} emptyText={t('pages.suppliers_title')} emptyDescription={t('pages.suppliers_desc')} emptyAction={{ label: t('pages.suppliers_new'), onClick: () => setOpen(true) }} />
          </CardContent>
        </Card>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{t('pages.suppliers_new')}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="col-span-2 space-y-2"><Label>{t('common.name')} *</Label><Input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} /></div>
            <div className="space-y-2"><Label>NIF</Label><Input value={form.nif} onChange={e => setForm(f => ({...f, nif: e.target.value}))} /></div>
            <div className="space-y-2"><Label>RC</Label><Input value={form.rc} onChange={e => setForm(f => ({...f, rc: e.target.value}))} /></div>
            <div className="space-y-2"><Label>{t('common.phone')}</Label><Input value={form.phone} onChange={e => setForm(f => ({...f, phone: e.target.value}))} /></div>
            <div className="space-y-2"><Label>{t('common.email')}</Label><Input type="email" value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} /></div>
            <div className="col-span-2 space-y-2"><Label>{t('common.address')}</Label><Input value={form.address} onChange={e => setForm(f => ({...f, address: e.target.value}))} /></div>
            <div className="col-span-2 space-y-2">
              <Label>{t('common.wilaya')}</Label>
              <Select value={form.wilaya} onValueChange={v => setForm(f => ({...f, wilaya: v}))}>
                <SelectTrigger><SelectValue placeholder={t('common.search')} /></SelectTrigger>
                <SelectContent>{WILAYAS_LIST.map(w => <SelectItem key={w.code} value={w.name}>{w.code} — {w.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>{t('common.cancel')}</Button>
            <Button onClick={handleSave} disabled={saving}>{t('common.save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <TutorialOverlay pageKey="suppliers" />
    </div>
  )
}
