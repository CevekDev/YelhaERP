'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { StatCard } from '@/components/ui/stat-card'
import { formatDA } from '@/lib/algerian/format'
import { TrendingUp, TrendingDown } from 'lucide-react'

interface ResultatRow { code: string; name: string; solde: number }

export default function ResultatPage() {
  const [charges, setCharges] = useState<ResultatRow[]>([])
  const [produits, setProduits] = useState<ResultatRow[]>([])
  const [totals, setTotals] = useState({ totalCharges: 0, totalProduits: 0, resultatNet: 0 })
  const [period, setPeriod] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (period) params.set('period', period)
    fetch(`/api/accounting/compte-resultat?${params}`).then(r => r.json()).then(d => {
      setCharges(d.data?.charges ?? [])
      setProduits(d.data?.produits ?? [])
      setTotals({
        totalCharges: d.data?.totalCharges ?? 0,
        totalProduits: d.data?.totalProduits ?? 0,
        resultatNet: d.data?.resultatNet ?? 0,
      })
      setLoading(false)
    })
  }, [period])

  const benefice = totals.resultatNet >= 0

  return (
    <div className="p-4 md:p-6 space-y-6">
      <Breadcrumb items={[{ label: 'Comptabilité', href: '/dashboard/accounting' }, { label: 'Compte de Résultat' }]} />

      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Compte de Résultat</h1>
        <div className="flex gap-2">
          <Input type="month" value={period} onChange={e => setPeriod(e.target.value)} className="w-48" />
          {period && <Button variant="outline" onClick={() => setPeriod('')}>Toutes</Button>}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Total Produits" value={formatDA(totals.totalProduits)} color="green" />
        <StatCard label="Total Charges" value={formatDA(totals.totalCharges)} color="red" />
        <StatCard
          label="Résultat Net"
          value={formatDA(Math.abs(totals.resultatNet))}
          sub={benefice ? 'Bénéfice' : 'Déficit'}
          color={benefice ? 'green' : 'red'}
        />
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="border rounded-lg overflow-hidden">
          <div className="bg-green-50 px-4 py-3 border-b">
            <h2 className="font-semibold text-green-800">PRODUITS (Classe 7)</h2>
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
              ) : produits.length === 0 ? (
                <tr><td colSpan={3} className="text-center py-8 text-muted-foreground">Aucun produit</td></tr>
              ) : produits.map((row, i) => (
                <tr key={row.code} className={`border-t ${i % 2 === 1 ? 'bg-muted/10' : ''}`}>
                  <td className="px-4 py-2 font-mono text-xs">{row.code}</td>
                  <td className="px-4 py-2">{row.name}</td>
                  <td className="px-4 py-2 text-right font-mono da-amount text-green-700">{formatDA(row.solde)}</td>
                </tr>
              ))}
              <tr className="border-t-2 bg-green-50/50 font-semibold">
                <td colSpan={2} className="px-4 py-3 text-green-800">Total Produits</td>
                <td className="px-4 py-3 text-right font-mono text-green-800 da-amount">{formatDA(totals.totalProduits)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="border rounded-lg overflow-hidden">
          <div className="bg-red-50 px-4 py-3 border-b">
            <h2 className="font-semibold text-red-800">CHARGES (Classe 6)</h2>
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
              ) : charges.length === 0 ? (
                <tr><td colSpan={3} className="text-center py-8 text-muted-foreground">Aucune charge</td></tr>
              ) : charges.map((row, i) => (
                <tr key={row.code} className={`border-t ${i % 2 === 1 ? 'bg-muted/10' : ''}`}>
                  <td className="px-4 py-2 font-mono text-xs">{row.code}</td>
                  <td className="px-4 py-2">{row.name}</td>
                  <td className="px-4 py-2 text-right font-mono da-amount text-red-700">{formatDA(row.solde)}</td>
                </tr>
              ))}
              <tr className="border-t-2 bg-red-50/50 font-semibold">
                <td colSpan={2} className="px-4 py-3 text-red-800">Total Charges</td>
                <td className="px-4 py-3 text-right font-mono text-red-800 da-amount">{formatDA(totals.totalCharges)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className={`border-2 rounded-lg p-6 flex items-center justify-between ${benefice ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}`}>
        <div className="flex items-center gap-3">
          {benefice ? <TrendingUp className="w-8 h-8 text-green-600" /> : <TrendingDown className="w-8 h-8 text-red-600" />}
          <div>
            <div className={`font-bold text-lg ${benefice ? 'text-green-800' : 'text-red-800'}`}>
              {benefice ? 'Bénéfice de l\'exercice' : 'Déficit de l\'exercice'}
            </div>
            <div className={`text-sm ${benefice ? 'text-green-700' : 'text-red-700'}`}>
              {formatDA(totals.totalProduits)} − {formatDA(totals.totalCharges)}
            </div>
          </div>
        </div>
        <div className={`text-3xl font-bold font-mono da-amount ${benefice ? 'text-green-700' : 'text-red-700'}`}>
          {benefice ? '+' : '−'}{formatDA(Math.abs(totals.resultatNet))}
        </div>
      </div>
    </div>
  )
}
