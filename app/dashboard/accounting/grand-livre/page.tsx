'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { formatDA } from '@/lib/algerian/format'
import { TrendingUp, TrendingDown } from 'lucide-react'

interface GrandLivreRow {
  id: string
  date: string
  reference: string
  description: string
  debit: number
  credit: number
  balance: number
}

interface Account {
  id: string
  code: string
  name: string
}

export default function GrandLivrePage() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [accountId, setAccountId] = useState('')
  const [period, setPeriod] = useState('')
  const [rows, setRows] = useState<GrandLivreRow[]>([])
  const [account, setAccount] = useState<Account | null>(null)
  const [totals, setTotals] = useState({ totalDebit: 0, totalCredit: 0, finalBalance: 0 })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch('/api/accounting/accounts').then(r => r.json()).then(d => setAccounts(d.data ?? []))
  }, [])

  useEffect(() => {
    if (!accountId) return
    setLoading(true)
    const params = new URLSearchParams({ accountId })
    if (period) params.set('period', period)
    fetch(`/api/accounting/grand-livre?${params}`).then(r => r.json()).then(d => {
      setRows(d.data?.rows ?? [])
      setAccount(d.data?.account ?? null)
      setTotals({ totalDebit: d.data?.totalDebit ?? 0, totalCredit: d.data?.totalCredit ?? 0, finalBalance: d.data?.finalBalance ?? 0 })
      setLoading(false)
    })
  }, [accountId, period])

  return (
    <div className="p-4 md:p-6 space-y-6">
      <Breadcrumb items={[{ label: 'Comptabilité', href: '/dashboard/accounting' }, { label: 'Grand Livre' }]} />

      <h1 className="text-2xl font-bold">Grand Livre</h1>

      <div className="flex gap-3 flex-wrap">
        <Select value={accountId} onValueChange={setAccountId}>
          <SelectTrigger className="w-72"><SelectValue placeholder="Sélectionner un compte..." /></SelectTrigger>
          <SelectContent>
            {accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.code} — {a.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input type="month" value={period} onChange={e => setPeriod(e.target.value)} className="w-48" />
        {period && <Button variant="outline" onClick={() => setPeriod('')}>Toutes périodes</Button>}
      </div>

      {!accountId && (
        <div className="text-center py-20 text-muted-foreground">
          <p>Sélectionnez un compte pour afficher son grand livre.</p>
        </div>
      )}

      {accountId && account && (
        <>
          <div className="bg-card border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-mono text-lg font-bold">{account.code}</div>
                <div className="text-muted-foreground">{account.name}</div>
              </div>
              <div className="flex gap-6 text-right">
                <div>
                  <div className="text-xs text-muted-foreground">Total Débit</div>
                  <div className="font-mono font-medium da-amount">{formatDA(totals.totalDebit)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Total Crédit</div>
                  <div className="font-mono font-medium da-amount">{formatDA(totals.totalCredit)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Solde final</div>
                  <div className={`font-mono font-bold flex items-center gap-1 ${totals.finalBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {totals.finalBalance >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    {formatDA(Math.abs(totals.finalBalance))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Date</th>
                  <th className="text-left px-4 py-3 font-medium">Référence</th>
                  <th className="text-left px-4 py-3 font-medium">Libellé</th>
                  <th className="text-right px-4 py-3 font-medium">Débit</th>
                  <th className="text-right px-4 py-3 font-medium">Crédit</th>
                  <th className="text-right px-4 py-3 font-medium">Solde</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="text-center py-12 text-muted-foreground">Chargement...</td></tr>
                ) : rows.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-12 text-muted-foreground">Aucun mouvement</td></tr>
                ) : rows.map(row => (
                  <tr key={row.id} className="border-t hover:bg-muted/20">
                    <td className="px-4 py-2.5">{new Date(row.date).toLocaleDateString('fr-DZ')}</td>
                    <td className="px-4 py-2.5 font-mono text-xs">{row.reference}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{row.description}</td>
                    <td className="px-4 py-2.5 text-right font-mono da-amount">{row.debit > 0 ? formatDA(row.debit) : '—'}</td>
                    <td className="px-4 py-2.5 text-right font-mono da-amount">{row.credit > 0 ? formatDA(row.credit) : '—'}</td>
                    <td className={`px-4 py-2.5 text-right font-mono font-medium ${row.balance >= 0 ? 'text-foreground' : 'text-red-600'}`}>
                      {formatDA(row.balance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
