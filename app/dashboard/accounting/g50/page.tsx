'use client'

import { useState, useEffect, useCallback } from 'react'
import { Header } from '@/components/layout/header'
import { PageHeader } from '@/components/ui/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { formatDA } from '@/lib/algerian/format'
import { toast } from 'sonner'
import { FileText, Printer, RefreshCw, CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface G50Data {
  period: { month: number; year: number }
  tva: {
    collectee: { ht: number; tva: number }
    deductible: number
    aPayerNet: number
    detail: Record<string, { base: number; tva: number }>
  }
  cnas: {
    headcount: number
    massSalaireBrut: number
    partSalarie: number
    partPatronale: number
    totalCnas: number
  }
  irg: { totalRetenu: number }
  totalAPayer: number
}

const MONTHS = [
  'Janvier','Février','Mars','Avril','Mai','Juin',
  'Juillet','Août','Septembre','Octobre','Novembre','Décembre',
]

const CURRENT_YEAR = new Date().getFullYear()
const YEARS = Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - 2 + i)

function Row({ label, value, bold, highlight }: {
  label: string; value: string; bold?: boolean; highlight?: boolean
}) {
  return (
    <div className={cn(
      'flex justify-between items-center py-2 px-3 rounded-lg',
      highlight ? 'bg-emerald-50 border border-emerald-200' : 'hover:bg-slate-50',
    )}>
      <span className={cn('text-sm text-slate-600', bold && 'font-semibold text-slate-800')}>{label}</span>
      <span className={cn(
        'text-sm font-mono tabular-nums',
        bold ? 'font-bold text-slate-900' : 'text-slate-700',
        highlight && 'text-emerald-700 font-bold',
      )}>{value}</span>
    </div>
  )
}

export default function G50Page() {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [data, setData] = useState<G50Data | null>(null)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/accounting/g50?month=${month}&year=${year}`)
      if (!res.ok) throw new Error()
      const json = await res.json()
      setData(json.data)
    } catch {
      toast.error('Erreur lors du chargement des données G50')
    } finally {
      setLoading(false)
    }
  }, [month, year])

  useEffect(() => { load() }, [load])

  const handlePrint = () => {
    window.print()
  }

  const monthLabel = MONTHS[month - 1]

  return (
    <div className="flex flex-col h-full">
      <Header title="Déclaration G50" />
      <div className="flex-1 overflow-y-auto p-6 space-y-6 print:p-4">
        <div className="flex items-center justify-between print:hidden">
          <PageHeader
            title="Déclaration G50"
            description="Déclaration mensuelle TVA, CNAS et IRG (à déposer avant le 20 du mois suivant)"
          />
          <div className="flex items-center gap-3">
            <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map((m, i) => (
                  <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {YEARS.map(y => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={load} disabled={loading}>
              <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
            </Button>
            <Button variant="outline" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              Imprimer
            </Button>
          </div>
        </div>

        {/* Print header */}
        <div className="hidden print:block text-center mb-6">
          <h1 className="text-2xl font-bold">DÉCLARATION G50</h1>
          <p className="text-lg">Période : {monthLabel} {year}</p>
          <p className="text-sm text-gray-500">Formulaire mensuel — TVA, CNAS, IRG</p>
        </div>

        {loading && !data && (
          <div className="text-center py-16 text-slate-400">Chargement...</div>
        )}

        {data && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Section TVA */}
            <Card className="border-blue-200">
              <CardHeader className="bg-blue-50 rounded-t-lg pb-3">
                <CardTitle className="text-base flex items-center gap-2 text-blue-800">
                  <FileText className="h-4 w-4" />
                  Section I — Taxe sur la Valeur Ajoutée (TVA)
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-1">
                <Row label="Chiffre d'affaires HT" value={formatDA(data.tva.collectee.ht)} />
                <Row label="TVA collectée (19%)" value={formatDA(data.tva.collectee.tva)} bold />

                {Object.entries(data.tva.detail).filter(([, v]) => v.tva > 0).map(([rate, v]) => (
                  <Row
                    key={rate}
                    label={`  → Base TVA ${rate}%`}
                    value={`${formatDA(v.base)} × ${rate}% = ${formatDA(v.tva)}`}
                  />
                ))}

                <Separator className="my-2" />
                <Row label="TVA déductible (achats)" value={`− ${formatDA(data.tva.deductible)}`} />
                <Separator className="my-2" />
                <Row
                  label="TVA nette à payer"
                  value={formatDA(data.tva.aPayerNet)}
                  bold highlight
                />
                <p className="text-xs text-slate-400 mt-2 px-3">
                  Délai de dépôt : avant le 20 {MONTHS[month % 12]} {month === 12 ? year + 1 : year}
                </p>
              </CardContent>
            </Card>

            {/* Section CNAS */}
            <Card className="border-purple-200">
              <CardHeader className="bg-purple-50 rounded-t-lg pb-3">
                <CardTitle className="text-base flex items-center gap-2 text-purple-800">
                  <FileText className="h-4 w-4" />
                  Section II — CNAS (Cotisations Sociales)
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-1">
                <Row label="Nombre de salariés" value={String(data.cnas.headcount)} />
                <Row label="Masse salariale brute" value={formatDA(data.cnas.massSalaireBrut)} />
                <Separator className="my-2" />
                <Row label="Part salarié (9%)" value={formatDA(data.cnas.partSalarie)} />
                <Row label="Part patronale (26%)" value={formatDA(data.cnas.partPatronale)} />
                <Separator className="my-2" />
                <Row
                  label="Total CNAS à payer"
                  value={formatDA(data.cnas.totalCnas)}
                  bold highlight
                />
                <p className="text-xs text-slate-400 mt-2 px-3">
                  Référence légale : Décret n° 96-209 du 5 juin 1996
                </p>
              </CardContent>
            </Card>

            {/* Section IRG */}
            <Card className="border-amber-200">
              <CardHeader className="bg-amber-50 rounded-t-lg pb-3">
                <CardTitle className="text-base flex items-center gap-2 text-amber-800">
                  <FileText className="h-4 w-4" />
                  Section III — IRG Salaires (Retenue à la source)
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-1">
                <p className="text-xs text-slate-500 px-3 mb-3">
                  Barème progressif 2026 : 0% → 23% → 27% → 30% → 33% → 35%<br/>
                  Abattement 40% (min 1 000 DA / max 1 500 DA)
                </p>
                <Row label="Nombre de salariés imposables" value={String(data.cnas.headcount)} />
                <Separator className="my-2" />
                <Row
                  label="IRG total retenu"
                  value={formatDA(data.irg.totalRetenu)}
                  bold highlight
                />
              </CardContent>
            </Card>

            {/* Récapitulatif */}
            <Card className="border-emerald-300 bg-emerald-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2 text-emerald-800">
                  <CheckCircle className="h-4 w-4" />
                  Récapitulatif G50 — {monthLabel} {year}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Row label="TVA nette" value={formatDA(data.tva.aPayerNet)} bold />
                <Row label="CNAS (total)" value={formatDA(data.cnas.totalCnas)} bold />
                <Row label="IRG (retenu)" value={formatDA(data.irg.totalRetenu)} bold />
                <Separator />
                <div className="flex justify-between items-center py-3 px-3 bg-white rounded-xl border-2 border-emerald-400">
                  <span className="text-base font-bold text-emerald-900">TOTAL À PAYER</span>
                  <span className="text-xl font-black text-emerald-700 font-mono">
                    {formatDA(data.totalAPayer)}
                  </span>
                </div>
                <div className="mt-4 p-3 bg-white rounded-lg border border-amber-200">
                  <p className="text-xs text-amber-700 font-medium">
                    ⚠️ Date limite de dépôt :{' '}
                    <strong>20 {MONTHS[month % 12]} {month === 12 ? year + 1 : year}</strong>
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Dépôt auprès de la Recette des Impôts et paiement à la Caisse principale du Trésor
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <Badge variant="outline" className="justify-center py-2 text-xs">
                    Réf. : Art. 75 Code des Taxes
                  </Badge>
                  <Badge variant="outline" className="justify-center py-2 text-xs">
                    DGI — Direction des Impôts
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
