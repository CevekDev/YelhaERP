'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { Plus, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import { formatDA } from '@/lib/algerian/format'

interface AccountLine {
  accountId: string
  accountCode: string
  description: string
  debit: number
  credit: number
}

interface Entry {
  id: string
  date: string
  reference: string
  description: string
  period: string
  lines: { id: string; accountCode: string; description: string; debit: number | string; credit: number | string; account: { name: string } }[]
}

export default function JournalPage() {
  const [entries, setEntries] = useState<Entry[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [period, setPeriod] = useState('')
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [accounts, setAccounts] = useState<{ id: string; code: string; name: string }[]>([])
  const [form, setForm] = useState({ date: new Date().toISOString().split('T')[0], reference: '', description: '', period: new Date().toISOString().slice(0,7), lines: [{ accountId:'', accountCode:'', description:'', debit:0, credit:0 }, { accountId:'', accountCode:'', description:'', debit:0, credit:0 }] as AccountLine[] })
  const limit = 20

  const fetchEntries = async () => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), limit: String(limit) })
    if (period) params.set('period', period)
    const res = await fetch(`/api/accounting/entries?${params}`)
    const data = await res.json()
    setEntries(data.data?.entries ?? [])
    setTotal(data.data?.total ?? 0)
    setLoading(false)
  }

  const fetchAccounts = async () => {
    const res = await fetch('/api/accounting/accounts')
    const data = await res.json()
    setAccounts(data.data ?? [])
  }

  useEffect(() => { fetchEntries() }, [page, period])
  useEffect(() => { fetchAccounts() }, [])

  const addLine = () => setForm(f => ({ ...f, lines: [...f.lines, { accountId:'', accountCode:'', description:'', debit:0, credit:0 }] }))
  const removeLine = (i: number) => setForm(f => ({ ...f, lines: f.lines.filter((_, idx) => idx !== i) }))
  const updateLine = (i: number, field: keyof AccountLine, value: string | number) => {
    setForm(f => {
      const lines = [...f.lines]
      if (field === 'accountId') {
        const acc = accounts.find(a => a.id === value)
        lines[i] = { ...lines[i], accountId: String(value), accountCode: acc?.code ?? '' }
      } else {
        lines[i] = { ...lines[i], [field]: value }
      }
      return { ...f, lines }
    })
  }

  const totalDebit = form.lines.reduce((s, l) => s + Number(l.debit), 0)
  const totalCredit = form.lines.reduce((s, l) => s + Number(l.credit), 0)
  const balanced = Math.abs(totalDebit - totalCredit) < 0.01

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!balanced) return
    const res = await fetch('/api/accounting/entries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (res.ok) { setOpen(false); fetchEntries() }
  }

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="p-4 md:p-6 space-y-6">
      <Breadcrumb items={[{ label: 'Comptabilité', href: '/dashboard/accounting' }, { label: 'Journal' }]} />

      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Journal des écritures</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" />Nouvelle écriture</Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl">
            <DialogHeader><DialogTitle>Nouvelle écriture comptable</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 mt-2">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <Label>Date</Label>
                  <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required />
                </div>
                <div className="space-y-1">
                  <Label>Période</Label>
                  <Input type="month" value={form.period} onChange={e => setForm(f => ({ ...f, period: e.target.value }))} required />
                </div>
                <div className="space-y-1">
                  <Label>Référence</Label>
                  <Input value={form.reference} onChange={e => setForm(f => ({ ...f, reference: e.target.value }))} required />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Description</Label>
                <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} required />
              </div>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left px-3 py-2">Compte</th>
                      <th className="text-left px-3 py-2">Libellé</th>
                      <th className="text-right px-3 py-2 w-28">Débit</th>
                      <th className="text-right px-3 py-2 w-28">Crédit</th>
                      <th className="w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {form.lines.map((line, i) => (
                      <tr key={i} className="border-t">
                        <td className="px-2 py-1">
                          <Select value={line.accountId} onValueChange={v => updateLine(i, 'accountId', v)}>
                            <SelectTrigger className="h-8"><SelectValue placeholder="Compte..." /></SelectTrigger>
                            <SelectContent>
                              {accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.code} — {a.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-2 py-1">
                          <Input className="h-8" value={line.description} onChange={e => updateLine(i, 'description', e.target.value)} />
                        </td>
                        <td className="px-2 py-1">
                          <Input className="h-8 text-right" type="number" min="0" step="0.01" value={line.debit} onChange={e => updateLine(i, 'debit', Number(e.target.value))} />
                        </td>
                        <td className="px-2 py-1">
                          <Input className="h-8 text-right" type="number" min="0" step="0.01" value={line.credit} onChange={e => updateLine(i, 'credit', Number(e.target.value))} />
                        </td>
                        <td className="px-2 py-1">
                          {form.lines.length > 2 && (
                            <button type="button" onClick={() => removeLine(i)} className="text-destructive hover:opacity-70">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                    <tr className="border-t bg-muted/30">
                      <td colSpan={2} className="px-3 py-2 font-medium text-sm">Total</td>
                      <td className="px-3 py-2 text-right font-mono font-medium">{formatDA(totalDebit)}</td>
                      <td className="px-3 py-2 text-right font-mono font-medium">{formatDA(totalCredit)}</td>
                      <td></td>
                    </tr>
                  </tbody>
                </table>
              </div>
              {!balanced && totalDebit + totalCredit > 0 && (
                <p className="text-sm text-destructive">Écriture déséquilibrée : différence de {formatDA(Math.abs(totalDebit - totalCredit))}</p>
              )}
              <div className="flex justify-between">
                <Button type="button" variant="outline" onClick={addLine}><Plus className="w-4 h-4 mr-2" />Ajouter une ligne</Button>
                <Button type="submit" disabled={!balanced}>Valider l'écriture</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-3">
        <Input type="month" value={period} onChange={e => setPeriod(e.target.value)} className="w-48" placeholder="Période..." />
        {period && <Button variant="outline" onClick={() => setPeriod('')}>Effacer</Button>}
      </div>

      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Date</th>
              <th className="text-left px-4 py-3 font-medium">Référence</th>
              <th className="text-left px-4 py-3 font-medium">Description</th>
              <th className="text-left px-4 py-3 font-medium">Période</th>
              <th className="text-right px-4 py-3 font-medium">Montant</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="text-center py-12 text-muted-foreground">Chargement...</td></tr>
            ) : entries.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-12 text-muted-foreground">Aucune écriture</td></tr>
            ) : entries.map(entry => (
              <tr key={entry.id} className="border-t hover:bg-muted/30">
                <td className="px-4 py-3">{new Date(entry.date).toLocaleDateString('fr-DZ')}</td>
                <td className="px-4 py-3 font-mono text-xs">{entry.reference}</td>
                <td className="px-4 py-3">
                  <div>{entry.description}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {entry.lines.map(l => `${l.accountCode} ${l.account.name}`).join(' · ')}
                  </div>
                </td>
                <td className="px-4 py-3"><Badge variant="outline">{entry.period}</Badge></td>
                <td className="px-4 py-3 text-right font-mono da-amount">
                  {formatDA(entry.lines.reduce((s, l) => s + Number(l.debit), 0))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{total} écriture{total > 1 ? 's' : ''}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm py-1.5 px-3 border rounded-md">{page} / {totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
