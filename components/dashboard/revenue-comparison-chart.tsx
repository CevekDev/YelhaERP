'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { formatDACompact } from '@/lib/algerian/format'

const MONTHS_FR = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']

interface Props {
  currentYear: { month: string; total: number }[]
  lastYear: { month: string; total: number }[]
  year: number
}

export function RevenueComparisonChart({ currentYear, lastYear, year }: Props) {
  const data = Array.from({ length: 12 }, (_, i) => {
    const monthKey = String(i + 1).padStart(2, '0')
    const cur = currentYear.find(d => d.month.slice(5) === monthKey)
    const prev = lastYear.find(d => d.month.slice(5) === monthKey)
    return {
      month: MONTHS_FR[i],
      [String(year)]: cur ? cur.total : null,
      [String(year - 1)]: prev ? prev.total : null,
    }
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Comparaison CA — {year - 1} vs {year}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => formatDACompact(v).replace(' DA', '')} />
            <Tooltip
              formatter={(v: number) => [formatDACompact(v), 'CA']}
              contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
            />
            <Legend />
            <Line type="monotone" dataKey={String(year - 1)} stroke="#94a3b8" strokeWidth={2} dot={false} connectNulls />
            <Line type="monotone" dataKey={String(year)} stroke="#1D9E75" strokeWidth={2.5} dot={false} connectNulls />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
