'use client'

import { useState, useEffect, useCallback } from 'react'
import { Header } from '@/components/layout/header'
import { PageHeader } from '@/components/ui/page-header'
import { DataTable } from '@/components/ui/data-table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatDA } from '@/lib/algerian/format'
import { SCF_ACCOUNTS } from '@/lib/algerian/tax'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface JournalEntry { id: string; date: string; reference: string; description: string; debit: number; credit: number; accountCode: string; accountName: string }
interface BalanceEntry { accountCode: string; accountName: string; totalDebit: number; totalCredit: number; balance: number }

export default function AccountingPage() {
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [balance, setBalance] = useState<BalanceEntry[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ date: new Date().toISOString().split('T')[0], reference: '', description: '', debit: '', credit: '', accountCode: '', accountName: '' })

  const fetchJournal = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/accounting?type=journal&page=${page}&limit=30`)
    if (res.ok) { const d = await res.json(); setEntries(d.entries); setTotal(d.total) }
    setLoading(false)
  }, [page])

  const fetchBalance = useCallback(async () => {
    const res = await fetch('/api/accounting?type=balance')
    if (res.ok) setBalance(await res.json())
  }, [])

  useEffect(() => { fetchJournal() }, [fetchJournal])

  const handleSave = async () => {
    setSaving(true)
    const res = await fetch('/api/accounting', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, debit: Number(form.debit), credit: Number(form.credit), date: new Date(form.date).toISOString() }),
    })
    setSaving(false)
    if (res.ok) { toast.success('Écriture enregistrée'); setOpen(false); fetchJournal() }
    else toast.error('Erreur')
  }

  const journalColumns = [
    { key: 'date', header: 'Date', render: (r: JournalEntry) => new Date(r.date).toLocaleDateString('fr-DZ') },
    { key: 'reference', header: 'Référence', render: (r: JournalEntry) => <span className="font-mono text-xs">{r.reference}</span> },
    { key: 'accountCode', header: 'Compte', render: (r: JournalEntry) => <span className="font-mono">{r.accountCode} — {r.accountName}</span> },
    { key: 'description', header: 'Libellé' },
    { key: 'debit', header: 'Débit', className: 'da-amount text-right', render: (r: JournalEntry) => Number(r.debit) > 0 ? formatDA(Number(r.debit)) : '—' },
    { key: 'credit', header: 'Crédit', className: 'da-amount text-right', render: (r: JournalEntry) => Number(r.credit) > 0 ? formatDA(Number(r.credit)) : '—' },
  ]

  return (
    <div>
      <Header title="Comptabilité" />
      <div className="p-6 space-y-6">
        <PageHeader title="Comptabilité — Plan SCF" actionLabel="Nouvelle écriture" onAction={() => setOpen(true)} />
        <Tabs defaultValue="journal" onValueChange={v => v === 'balance' && fetchBalance()}>
          <TabsList>
            <TabsTrigger value="journal">Journal général</TabsTrigger>
            <TabsTrigger value="balance">Balance des comptes</TabsTrigger>
          </TabsList>

          <TabsContent value="journal">
            <Card>
              <CardContent className="p-0">
                <DataTable data={entries as unknown as Record<string, unknown>[]} columns={journalColumns as never} total={total} page={page} limit={30} onPageChange={setPage} loading={loading} emptyText="Aucune écriture" />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="balance">
            <Card>
              <CardHeader><CardTitle className="text-base">Balance des comptes (cumulé)</CardTitle></CardHeader>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead className="border-b bg-muted/50">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium">Compte</th>
                      <th className="text-right px-4 py-3 font-medium da-amount">Total débit</th>
                      <th className="text-right px-4 py-3 font-medium da-amount">Total crédit</th>
                      <th className="text-right px-4 py-3 font-medium da-amount">Solde</th>
                    </tr>
                  </thead>
                  <tbody>
                    {balance.map(b => (
                      <tr key={b.accountCode} className="border-b hover:bg-muted/30">
                        <td className="px-4 py-2 font-mono text-xs">{b.accountCode} — {b.accountName}</td>
                        <td className="px-4 py-2 da-amount text-right">{formatDA(b.totalDebit)}</td>
                        <td className="px-4 py-2 da-amount text-right">{formatDA(b.totalCredit)}</td>
                        <td className={cn('px-4 py-2 da-amount text-right font-medium', b.balance >= 0 ? 'text-yelha-600' : 'text-destructive')}>
                          {formatDA(Math.abs(b.balance))} {b.balance < 0 ? 'C' : 'D'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Nouvelle écriture comptable</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Date</Label><Input type="date" value={form.date} onChange={e => setForm(f => ({...f, date: e.target.value}))} /></div>
              <div className="space-y-2"><Label>Référence</Label><Input value={form.reference} onChange={e => setForm(f => ({...f, reference: e.target.value}))} placeholder="FAC-2024-0001" /></div>
            </div>
            <div className="space-y-2">
              <Label>Compte *</Label>
              <Select onValueChange={v => {
                const [code, ...name] = v.split('|')
                setForm(f => ({...f, accountCode: code, accountName: name.join('|')}))
              }}>
                <SelectTrigger><SelectValue placeholder="Choisir un compte SCF" /></SelectTrigger>
                <SelectContent>
                  {Object.entries(SCF_ACCOUNTS).map(([code, name]) => (
                    <SelectItem key={code} value={`${code}|${name}`}>{code} — {name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Libellé</Label><Input value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Débit (DA)</Label><Input type="number" min="0" value={form.debit} onChange={e => setForm(f => ({...f, debit: e.target.value}))} /></div>
              <div className="space-y-2"><Label>Crédit (DA)</Label><Input type="number" min="0" value={form.credit} onChange={e => setForm(f => ({...f, credit: e.target.value}))} /></div>
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
