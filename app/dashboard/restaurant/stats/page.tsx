'use client'

import { useState, useEffect, useCallback } from 'react'
import { formatDA, formatDACompact } from '@/lib/algerian/format'
import { toast } from 'sonner'
import { Loader2, TrendingUp, ShoppingBag, Receipt, UtensilsCrossed } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { PageHeader } from '@/components/ui/page-header'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'

// ── Types ──────────────────────────────────────────────────────────────────────
type Period = 'today' | 'week' | 'month'

type StatsData = {
  revenue: number
  orders: number
  avgTicket: number
  busiestTable?: string | null
  revenueByTime: { label: string; revenue: number }[]
  topItems: { name: string; quantity: number; revenue: number }[]
  ordersByType: { type: string; count: number }[]
  revenueByCategory: { category: string; revenue: number; orders: number }[]
}

// ── Constants ──────────────────────────────────────────────────────────────────
const PERIOD_LABELS: Record<Period, string> = {
  today: "Aujourd'hui",
  week:  'Cette semaine',
  month: 'Ce mois',
}

const TYPE_LABELS: Record<string, string> = {
  DINE_IN:  'Sur place',
  TAKEAWAY: 'Emporter',
  DELIVERY: 'Livraison',
}

const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

// ── Custom tooltip ──────────────────────────────────────────────────────────────
function RevenueTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-card border rounded-lg px-3 py-2 shadow-md text-sm">
      <p className="font-medium mb-1">{label}</p>
      <p className="text-primary da-amount">{formatDA(payload[0].value)}</p>
    </div>
  )
}

// ── Component ──────────────────────────────────────────────────────────────────
export default function StatsPage() {
  const [period, setPeriod] = useState<Period>('today')
  const [stats, setStats] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchStats = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/restaurant/stats?period=${period}`)
      const data = await res.json()
      setStats(data.data ?? null)
    } catch {
      toast.error('Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }, [period])

  useEffect(() => { fetchStats() }, [fetchStats])

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Restaurant — Statistiques</h2>
          <p className="text-muted-foreground mt-1">Analyse des performances</p>
        </div>
        {/* Period selector */}
        <div className="flex gap-1 bg-muted rounded-lg p-1">
          {(['today', 'week', 'month'] as Period[]).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                period === p
                  ? 'bg-background shadow text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : !stats ? (
        <div className="text-center py-16 text-muted-foreground">Aucune donnée disponible</div>
      ) : (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              icon={<TrendingUp className="h-5 w-5 text-green-500" />}
              label="Chiffre d'affaires"
              value={formatDACompact(stats.revenue)}
              className="da-amount"
            />
            <KpiCard
              icon={<ShoppingBag className="h-5 w-5 text-blue-500" />}
              label="Commandes"
              value={String(stats.orders)}
            />
            <KpiCard
              icon={<Receipt className="h-5 w-5 text-purple-500" />}
              label="Ticket moyen"
              value={formatDA(stats.avgTicket)}
              className="da-amount"
            />
            <KpiCard
              icon={<UtensilsCrossed className="h-5 w-5 text-orange-500" />}
              label="Table la + occupée"
              value={stats.busiestTable ? `Table ${stats.busiestTable}` : '—'}
            />
          </div>

          {/* Revenue chart */}
          {stats.revenueByTime.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold mb-4">
                  CA {period === 'today' ? 'par heure' : period === 'week' ? 'par jour' : 'par jour'}
                </h3>
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={stats.revenueByTime}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} tickFormatter={v => formatDACompact(v)} />
                    <Tooltip content={<RevenueTooltip />} />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Top items */}
            {stats.topItems.length > 0 && (
              <Card className="lg:col-span-2">
                <CardContent className="p-4">
                  <h3 className="font-semibold mb-4">Top 10 articles</h3>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={stats.topItems} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={v => String(v)} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={120} />
                      <Tooltip
                        formatter={(value: number) => [value, 'Quantité']}
                      />
                      <Bar dataKey="quantity" fill="#10b981" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Order types pie */}
            {stats.ordersByType.length > 0 && (
              <Card>
                <CardContent className="p-4">
                  <h3 className="font-semibold mb-4">Répartition des commandes</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={stats.ordersByType}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        dataKey="count"
                        nameKey="type"
                      >
                        {stats.ordersByType.map((_, idx) => (
                          <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number, name: string) => [v, TYPE_LABELS[name] ?? name]} />
                      <Legend
                        formatter={(value: string) => TYPE_LABELS[value] ?? value}
                        iconSize={10}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Revenue by category */}
          {stats.revenueByCategory.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold mb-4">CA par catégorie</h3>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Catégorie</TableHead>
                        <TableHead className="text-right">Commandes</TableHead>
                        <TableHead className="text-right">CA</TableHead>
                        <TableHead className="text-right">%</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stats.revenueByCategory.map((cat, idx) => {
                        const pct = stats.revenue > 0
                          ? Math.round(cat.revenue / stats.revenue * 100)
                          : 0
                        return (
                          <TableRow key={idx}>
                            <TableCell className="font-medium">{cat.category}</TableCell>
                            <TableCell className="text-right">{cat.orders}</TableCell>
                            <TableCell className="text-right font-semibold da-amount">
                              {formatDA(cat.revenue)}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-primary rounded-full"
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                                <span className="text-xs text-muted-foreground w-8">{pct}%</span>
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}

// ── KPI Card ───────────────────────────────────────────────────────────────────
function KpiCard({ icon, label, value, className }: {
  icon: React.ReactNode
  label: string
  value: string
  className?: string
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-2">
          {icon}
          <span className="text-xs text-muted-foreground">{label}</span>
        </div>
        <p className={`text-xl font-bold ${className ?? ''}`}>{value}</p>
      </CardContent>
    </Card>
  )
}
