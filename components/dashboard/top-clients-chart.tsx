'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { formatDACompact } from '@/lib/algerian/format'

interface Props {
  data: { clientName: string; total: number }[]
}

const COLORS = ['#1D9E75', '#2db88a', '#3dd19e', '#52e6b3', '#71f0c9']

export function TopClientsChart({ data }: Props) {
  if (!data.length) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Top 5 clients (CA annuel)</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v: number) => formatDACompact(v).replace(' DA', '')} />
            <YAxis type="category" dataKey="clientName" tick={{ fontSize: 11 }} width={100} />
            <Tooltip
              formatter={(v: number) => [formatDACompact(v), 'CA']}
              contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
            />
            <Bar dataKey="total" radius={[0, 4, 4, 0]}>
              {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
