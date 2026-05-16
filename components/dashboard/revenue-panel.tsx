'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { formatDA, formatDACompact } from '@/lib/algerian/format'
import { TrendingUp, TrendingDown, Minus, Loader2, BarChart3 } from 'lucide-react'

type Period = 'day' | 'week' | 'month' | '3months' | '6months' | '1year' | '2years' | '3years'

const PERIODS: { id: Period; label: string }[] = [
  { id: 'day',      label: "Aujourd'hui" },
  { id: 'week',     label: '7 jours' },
  { id: 'month',    label: '30 jours' },
  { id: '3months',  label: '3 mois' },
  { id: '6months',  label: '6 mois' },
  { id: '1year',    label: '1 an' },
  { id: '2years',   label: '2 ans' },
  { id: '3years',   label: '3 ans' },
]

interface RevenueData {
  period: Period
  label: string
  previousLabel: string
  current: number
  previous: number
  delta: number
  currentCount: number
  previousCount: number
  chart: { label: string; total: number }[]
  granularity: 'hour' | 'day' | 'week' | 'month'
}

function formatLabel(label: string, granularity: RevenueData['granularity']): string {
  if (!label) return ''
  if (granularity === 'hour') return label.split(' ')[1] ?? label
  if (granularity === 'day') {
    const [, m, d] = label.split('-')
    return `${d}/${m}`
  }
  if (granularity === 'week') {
    return label.replace('-W', ' S')
  }
  // month: YYYY-MM
  const [y, m] = label.split('-')
  const date = new Date(Number(y), Number(m) - 1)
  return date.toLocaleDateString('fr-DZ', { month: 'short', year: '2-digit' })
}

export function RevenuePanel() {
  const [period, setPeriod] = useState<Period>('month')
  const [data, setData] = useState<RevenueData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/dashboard/revenue?period=${period}`)
      .then(r => r.json())
      .then(d => { if (d && !d.error) setData(d) })
      .finally(() => setLoading(false))
  }, [period])

  const deltaPositive = data ? data.delta > 0 : false
  const deltaNeutral  = data ? data.delta === 0 : true
  const DeltaIcon = deltaNeutral ? Minus : deltaPositive ? TrendingUp : TrendingDown
  const deltaColor = deltaNeutral
    ? 'text-muted-foreground'
    : deltaPositive ? 'text-emerald-600' : 'text-rose-600'
  const deltaBg = deltaNeutral
    ? 'bg-muted'
    : deltaPositive ? 'bg-emerald-50 dark:bg-emerald-950/30' : 'bg-rose-50 dark:bg-rose-950/30'

  const chartData = (data?.chart ?? []).map(p => ({
    label: formatLabel(p.label, data!.granularity),
    total: p.total,
  }))

  return (
    <Card>
      <CardContent className="p-5 space-y-5">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Chiffre d&apos;affaires
          </p>
          <div className="flex-1" />
          <div className="flex gap-1 flex-wrap">
            {PERIODS.map(p => (
              <button
                key={p.id}
                onClick={() => setPeriod(p.id)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  period === p.id
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:text-foreground'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {loading && !data ? (
          <div className="flex items-center justify-center h-48 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : data ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="border rounded-xl p-4 bg-card">
                <p className="text-xs text-muted-foreground">{data.label}</p>
                <p className="text-2xl font-bold da-amount tabular-nums mt-1">{formatDA(data.current)}</p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {data.currentCount} facture{data.currentCount > 1 ? 's' : ''} payée{data.currentCount > 1 ? 's' : ''}
                </p>
              </div>
              <div className="border rounded-xl p-4 bg-card">
                <p className="text-xs text-muted-foreground">{data.previousLabel}</p>
                <p className="text-2xl font-bold da-amount tabular-nums mt-1 opacity-75">{formatDA(data.previous)}</p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {data.previousCount} facture{data.previousCount > 1 ? 's' : ''} payée{data.previousCount > 1 ? 's' : ''}
                </p>
              </div>
              <div className={`border rounded-xl p-4 ${deltaBg}`}>
                <p className="text-xs text-muted-foreground">Évolution</p>
                <div className="flex items-center gap-2 mt-1">
                  <DeltaIcon className={`w-5 h-5 ${deltaColor}`} />
                  <p className={`text-2xl font-bold tabular-nums ${deltaColor}`}>
                    {data.delta > 0 ? '+' : ''}{data.delta}%
                  </p>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">vs période précédente</p>
              </div>
            </div>

            <div>
              {chartData.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-2">
                  <BarChart3 className="w-8 h-8 opacity-40" />
                  <p className="text-sm">Aucune facture payée sur cette période</p>
                  <p className="text-xs">Le graphique apparaîtra dès qu&apos;une facture sera marquée comme payée.</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={chartData} margin={{ top: 0, right: 8, bottom: 0, left: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      tickFormatter={(v: number) => formatDACompact(v).replace(' DA', '')}
                    />
                    <Tooltip
                      formatter={(v: number) => [formatDA(v), 'CA']}
                      contentStyle={{
                        borderRadius: '8px',
                        border: '1px solid hsl(var(--border))',
                        background: 'hsl(var(--card))',
                      }}
                    />
                    <Bar dataKey="total" fill="#1D9E75" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </>
        ) : (
          <div className="text-center text-muted-foreground py-8 text-sm">Erreur de chargement</div>
        )}
      </CardContent>
    </Card>
  )
}
