'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { formatDA } from '@/lib/algerian/format'

interface BilanRow { code: string; name: string; class: number; solde: number }

export default function BilanPage() {
  const [actif, setActif] = useState<BilanRow[]>([])
  const [passif, setPassif] = useState<BilanRow[]>([])
  const [totals, setTotals] = useState({ totalActif: 0, totalPassif: 0 })
  const [period, setPeriod] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (period) params.set('period', period)
    fetch(`/api/accounting/bilan?${params}`).then(r => r.json()).then(d => {
      setActif(d.data?.actif ?? [])
      setPassif(d.data?.passif ?? [])
      setTotals({ totalActif: d.data?.totalActif ?? 0, totalPassif: d.data?.totalPassif ?? 0 })
      setLoading(false)
    })
  }, [period])

  const maxLen = Math.max(actif.length, passif.length)

  return (
    <div className="p-4 md:p-6 space-y-6">
      <Breadcrumb items={[{ label: 'Comptabilité', href: '/dashboard/accounting' }, { label: 'Bilan' }]} />
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Bilan Comptable</h1>
        <div className="flex gap-2">
          <Input type="month" value={period} onChange={e => setPeriod(e.target.value)} className="w-48" />
          {period && <Button variant="outline" onClick={() => setPeriod('')}>Toutes</Button>}
        </div>
      </div>

      {!loading && Math.abs(totals.totalActif - totals.totalPassif) > 1 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-800 text-sm">
          Déséquilibre : Actif {formatDA(totals.totalActif)} ≠ Passif {formatDA(totals.totalPassif)}
        </div>
      )}

      <div className="grid grid-cols-2 gap-6">
        <div className="border rounded-lg overflow-hidden">
          <div className="bg-blue-50 px-4 py-3 border-b">
            <h2 className="font-semibold text-blue-800">ACTIF</h2>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-muted/30">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Code</th>
                <th className="text-left px-4 py-2 font-medium">Intitulé</th>
                <th className="text-right px-4 py-2 font-medium">Montant</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={3} className="text-center py-8 text-muted-foreground">Chargement...</td></tr>
              ) : actif.length === 0 ? (
                <tr><td colSpan={3} className="text-center py-8 text-muted-foreground">Aucun poste</td></tr>
              ) : actif.map((row, i) => (
                <tr key={row.code} className={`border-t ${i % 2 === 1 ? 'bg-muted/10' : ''}`}>
                  <td className="px-4 py-2 font-mono text-xs">{row.code}</td>
                  <td className="px-4 py-2">{row.name}</td>
                  <td className="px-4 py-2 text-right font-mono da-amount">{formatDA(row.solde)}</td>
                </tr>
              ))}
              <tr className="border-t-2 bg-blue-50/50 font-semibold">
                <td colSpan={2} className="px-4 py-3 text-blue-800">Total Actif</td>
                <td className="px-4 py-3 text-right font-mono text-blue-800 da-amount">{formatDA(totals.totalActif)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="border rounded-lg overflow-hidden">
          <div className="bg-purple-50 px-4 py-3 border-b">
            <h2 className="font-semibold text-purple-800">PASSIF</h2>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-muted/30">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Code</th>
                <th className="text-left px-4 py-2 font-medium">Intitulé</th>
                <th className="text-right px-4 py-2 font-medium">Montant</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={3} className="text-center py-8 text-muted-foreground">Chargement...</td></tr>
              ) : passif.length === 0 ? (
                <tr><td colSpan={3} className="text-center py-8 text-muted-foreground">Aucun poste</td></tr>
              ) : passif.map((row, i) => (
                <tr key={row.code} className={`border-t ${i % 2 === 1 ? 'bg-muted/10' : ''}`}>
                  <td className="px-4 py-2 font-mono text-xs">{row.code}</td>
                  <td className="px-4 py-2">{row.name}</td>
                  <td className="px-4 py-2 text-right font-mono da-amount">{formatDA(row.solde)}</td>
                </tr>
              ))}
              <tr className="border-t-2 bg-purple-50/50 font-semibold">
                <td colSpan={2} className="px-4 py-3 text-purple-800">Total Passif</td>
                <td className="px-4 py-3 text-right font-mono text-purple-800 da-amount">{formatDA(totals.totalPassif)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
