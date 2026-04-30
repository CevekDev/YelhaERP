'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { StatCard } from '@/components/ui/stat-card'
import { formatDA } from '@/lib/algerian/format'
import { Download } from 'lucide-react'

interface BalanceLine {
  code: string
  name: string
  class: number
  type: string
  totalDebit: number
  totalCredit: number
  solde: number
}

export default function BalancePage() {
  const [balance, setBalance] = useState<BalanceLine[]>([])
  const [totals, setTotals] = useState({ totalDebit: 0, totalCredit: 0 })
  const [period, setPeriod] = useState('')
  const [loading, setLoading] = useState(true)

  const fetchBalance = async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (period) params.set('period', period)
    const res = await fetch(`/api/accounting/balance-generale?${params}`)
    const data = await res.json()
    setBalance(data.data?.balance ?? [])
    setTotals(data.data?.totals ?? { totalDebit: 0, totalCredit: 0 })
    setLoading(false)
  }

  useEffect(() => { fetchBalance() }, [period])

  const exportCSV = () => {
    const rows = [['Code','Nom','Classe','Type','Total Débit','Total Crédit','Solde']]
    balance.forEach(l => rows.push([l.code, l.name, String(l.class), l.type, String(l.totalDebit), String(l.totalCredit), String(l.solde)]))
    const csv = rows.map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `balance-${period || 'all'}.csv`; a.click()
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <Breadcrumb items={[{ label: 'Comptabilité', href: '/dashboard/accounting' }, { label: 'Balance Générale' }]} />

      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Balance Générale</h1>
        <Button variant="outline" onClick={exportCSV}><Download className="w-4 h-4 mr-2" />Exporter CSV</Button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <StatCard label="Total Débit" value={formatDA(totals.totalDebit)} color="blue" />
        <StatCard label="Total Crédit" value={formatDA(totals.totalCredit)} color="purple" />
      </div>

      <div className="flex gap-3">
        <Input type="month" value={period} onChange={e => setPeriod(e.target.value)} className="w-48" />
        {period && <Button variant="outline" onClick={() => setPeriod('')}>Toutes périodes</Button>}
      </div>

      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Code</th>
              <th className="text-left px-4 py-3 font-medium">Intitulé</th>
              <th className="text-center px-4 py-3 font-medium">Cl.</th>
              <th className="text-right px-4 py-3 font-medium">Total Débit</th>
              <th className="text-right px-4 py-3 font-medium">Total Crédit</th>
              <th className="text-right px-4 py-3 font-medium">Solde</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="text-center py-12 text-muted-foreground">Chargement...</td></tr>
            ) : balance.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-12 text-muted-foreground">Aucune donnée</td></tr>
            ) : balance.map((line, i) => (
              <tr key={line.code} className={`border-t hover:bg-muted/20 ${i % 2 === 1 ? 'bg-muted/10' : ''}`}>
                <td className="px-4 py-2.5 font-mono font-medium">{line.code}</td>
                <td className="px-4 py-2.5">{line.name}</td>
                <td className="px-4 py-2.5 text-center text-muted-foreground">{line.class}</td>
                <td className="px-4 py-2.5 text-right font-mono da-amount">{formatDA(line.totalDebit)}</td>
                <td className="px-4 py-2.5 text-right font-mono da-amount">{formatDA(line.totalCredit)}</td>
                <td className={`px-4 py-2.5 text-right font-mono font-medium ${line.solde < 0 ? 'text-red-600' : ''}`}>
                  {formatDA(line.solde)}
                </td>
              </tr>
            ))}
            <tr className="border-t-2 bg-muted/30 font-semibold">
              <td colSpan={3} className="px-4 py-3">Total général</td>
              <td className="px-4 py-3 text-right font-mono da-amount">{formatDA(totals.totalDebit)}</td>
              <td className="px-4 py-3 text-right font-mono da-amount">{formatDA(totals.totalCredit)}</td>
              <td className="px-4 py-3 text-right font-mono">{formatDA(totals.totalDebit - totals.totalCredit)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
