'use client'

import { useState, useEffect } from 'react'
import { Header } from '@/components/layout/header'
import { PageHeader } from '@/components/ui/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatDA } from '@/lib/algerian/format'
import { toast } from 'sonner'
import { Calculator, AlertCircle, CheckCircle } from 'lucide-react'

interface G50Data { month: number; year: number; tvaCollectee: number; tvaDeductible: number; netDue: number; deadline: string }
interface Declaration { id: string; type: string; period: string; amount: number; status: string; dueDate: string }

const now = new Date()
const MONTHS = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc']

export default function TaxPage() {
  const [g50, setG50] = useState<G50Data | null>(null)
  const [declarations, setDeclarations] = useState<Declaration[]>([])
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch('/api/tax').then(r => r.json()).then(setDeclarations)
  }, [])

  const calculateG50 = async () => {
    setLoading(true)
    const res = await fetch(`/api/tax?type=g50-calculate&month=${month}&year=${now.getFullYear()}`)
    if (res.ok) setG50(await res.json())
    else toast.error('Erreur lors du calcul')
    setLoading(false)
  }

  const saveDeclaration = async () => {
    if (!g50) return
    const res = await fetch('/api/tax', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'G50', period: `${g50.year}-${String(g50.month).padStart(2, '0')}`, amount: g50.netDue, dueDate: g50.deadline }),
    })
    if (res.ok) { toast.success('Déclaration enregistrée'); fetch('/api/tax').then(r => r.json()).then(setDeclarations) }
    else toast.error('Erreur')
  }

  return (
    <div>
      <Header title="Fiscalité" />
      <div className="p-6 space-y-6">
        <PageHeader title="Fiscalité — Déclarations" />

        {/* Calcul G50 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base flex items-center gap-2"><Calculator className="h-4 w-4 text-yelha-500" />Calcul G50 automatique</CardTitle>
            <div className="flex items-center gap-2">
              <Select value={String(month)} onValueChange={v => setMonth(Number(v))}>
                <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                <SelectContent>{MONTHS.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m} {now.getFullYear()}</SelectItem>)}</SelectContent>
              </Select>
              <Button onClick={calculateG50} disabled={loading}>
                {loading ? 'Calcul...' : 'Calculer'}
              </Button>
            </div>
          </CardHeader>
          {g50 && (
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                {[
                  { label: 'TVA collectée', value: g50.tvaCollectee, className: 'text-amber-600' },
                  { label: 'TVA déductible', value: g50.tvaDeductible, className: 'text-yelha-600' },
                  { label: 'Net à payer', value: g50.netDue, className: 'text-red-600 font-bold' },
                  { label: 'Échéance', value: new Date(g50.deadline).toLocaleDateString('fr-DZ'), isDate: true },
                ].map(k => (
                  <div key={k.label} className="p-3 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground">{k.label}</p>
                    <p className={`text-lg font-semibold mt-1 da-amount ${k.className ?? ''}`}>
                      {k.isDate ? k.value : formatDA(Number(k.value))}
                    </p>
                  </div>
                ))}
              </div>
              <Button size="sm" onClick={saveDeclaration}>Enregistrer la déclaration</Button>
            </CardContent>
          )}
        </Card>

        {/* Historique déclarations */}
        <Card>
          <CardHeader><CardTitle className="text-base">Historique des déclarations</CardTitle></CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-3">Type</th>
                  <th className="text-left px-4 py-3">Période</th>
                  <th className="text-right px-4 py-3">Montant</th>
                  <th className="text-left px-4 py-3">Échéance</th>
                  <th className="text-left px-4 py-3">Statut</th>
                </tr>
              </thead>
              <tbody>
                {declarations.length === 0 ? (
                  <tr><td colSpan={5} className="text-center text-muted-foreground py-10">Aucune déclaration enregistrée</td></tr>
                ) : declarations.map(d => {
                  const due = new Date(d.dueDate)
                  const overdue = d.status === 'PENDING' && due < now
                  return (
                    <tr key={d.id} className="border-b hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium">{d.type}</td>
                      <td className="px-4 py-3">{d.period}</td>
                      <td className="px-4 py-3 da-amount text-right">{formatDA(Number(d.amount))}</td>
                      <td className="px-4 py-3">{due.toLocaleDateString('fr-DZ')}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {d.status === 'PAID' ? <CheckCircle className="h-3.5 w-3.5 text-yelha-500" /> : overdue ? <AlertCircle className="h-3.5 w-3.5 text-red-500" /> : <AlertCircle className="h-3.5 w-3.5 text-amber-500" />}
                          <Badge variant={d.status === 'PAID' ? 'success' : overdue ? 'destructive' : 'warning'}>
                            {d.status === 'PAID' ? 'Payée' : overdue ? 'En retard' : 'En attente'}
                          </Badge>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
