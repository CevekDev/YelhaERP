'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { formatDACompact } from '@/lib/algerian/format'

interface RevenueChartProps {
  data: { month: string; total: number }[]
}

function formatMonth(m: string) {
  const [year, month] = m.split('-')
  const date = new Date(Number(year), Number(month) - 1)
  return date.toLocaleDateString('fr-DZ', { month: 'short' })
}

export function RevenueChart({ data }: RevenueChartProps) {
  const chartData = data.map(d => ({
    month: formatMonth(d.month),
    total: d.total,
  }))

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-base">Chiffre d'affaires — 6 derniers mois</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData} margin={{ top: 0, right: 8, bottom: 0, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis
              tick={{ fontSize: 12 }}
              tickFormatter={(v: number) => formatDACompact(v).replace(' DA', '')}
            />
            <Tooltip
              formatter={(v: number) => [formatDACompact(v), 'CA']}
              contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
            />
            <Bar dataKey="total" fill="#1D9E75" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
