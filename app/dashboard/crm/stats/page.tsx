'use client'

import { useState, useEffect } from 'react'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { formatDA } from '@/lib/algerian/format'
import { TrendingUp, Users, Target, Trophy, AlertCircle } from 'lucide-react'

interface PipelineData {
  stage: string
  count: number
  totalValue: number
}

const STAGE_LABELS: Record<string, string> = {
  NEW: 'Nouveau', CONTACTED: 'Contacté', QUALIFIED: 'Qualifié',
  PROPOSAL: 'Proposition', NEGOTIATION: 'Négociation', WON: 'Gagné', LOST: 'Perdu',
}
const STAGE_COLORS: Record<string, string> = {
  NEW: 'bg-gray-200', CONTACTED: 'bg-blue-200', QUALIFIED: 'bg-cyan-200',
  PROPOSAL: 'bg-violet-200', NEGOTIATION: 'bg-amber-200', WON: 'bg-green-200', LOST: 'bg-red-200',
}

export default function CRMStatsPage() {
  const [data, setData] = useState<PipelineData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/crm/pipeline').then(r => r.json()).then(d => {
      const pipeline = d.data ?? {}
      const rows = Object.entries(pipeline).map(([stage, leads]: [string, any]) => ({
        stage,
        count: leads.length,
        totalValue: leads.reduce((s: number, l: any) => s + (Number(l.expectedValue) || 0), 0),
      }))
      setData(rows)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const totalLeads = data.reduce((s, r) => s + r.count, 0)
  const totalPipeline = data.filter(r => !['WON', 'LOST'].includes(r.stage)).reduce((s, r) => s + r.totalValue, 0)
  const wonValue = data.find(r => r.stage === 'WON')?.totalValue ?? 0
  const wonCount = data.find(r => r.stage === 'WON')?.count ?? 0
  const conversionRate = totalLeads > 0 ? ((wonCount / totalLeads) * 100).toFixed(1) : '0'
  const maxCount = Math.max(...data.map(r => r.count), 1)

  return (
    <div className="p-4 md:p-6 space-y-6">
      <Breadcrumb items={[
        { label: 'CRM', href: '/dashboard/crm/pipeline' },
        { label: 'Statistiques' },
      ]} />

      <h1 className="text-2xl font-bold">Statistiques CRM</h1>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total leads', value: totalLeads, icon: Users, color: 'text-blue-500' },
          { label: 'Pipeline actif', value: formatDA(totalPipeline), icon: TrendingUp, color: 'text-violet-500' },
          { label: 'Valeur gagnée', value: formatDA(wonValue), icon: Trophy, color: 'text-green-500' },
          { label: 'Taux conversion', value: `${conversionRate}%`, icon: Target, color: 'text-amber-500' },
        ].map(k => (
          <div key={k.label} className="border rounded-xl bg-card p-4 space-y-2">
            <div className="flex items-center gap-2">
              <k.icon className={`w-4 h-4 ${k.color}`} />
              <span className="text-xs text-muted-foreground">{k.label}</span>
            </div>
            <p className="text-2xl font-bold">{k.value}</p>
          </div>
        ))}
      </div>

      {/* Pipeline funnel */}
      <div className="border rounded-xl bg-card p-6 space-y-4">
        <h2 className="font-semibold">Entonnoir de vente</h2>
        {loading ? (
          <p className="text-muted-foreground text-sm">Chargement...</p>
        ) : data.length === 0 ? (
          <div className="flex flex-col items-center py-8 text-muted-foreground">
            <AlertCircle className="w-8 h-8 mb-2 opacity-40" />
            <p>Aucun lead pour le moment</p>
          </div>
        ) : (
          <div className="space-y-3">
            {data.map(row => (
              <div key={row.stage} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{STAGE_LABELS[row.stage] ?? row.stage}</span>
                  <div className="flex items-center gap-4 text-muted-foreground">
                    <span>{row.count} lead{row.count > 1 ? 's' : ''}</span>
                    {row.totalValue > 0 && <span className="da-amount font-mono text-xs">{formatDA(row.totalValue)}</span>}
                  </div>
                </div>
                <div className="h-6 rounded-full bg-muted/50 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${STAGE_COLORS[row.stage] ?? 'bg-gray-200'}`}
                    style={{ width: `${(row.count / maxCount) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
