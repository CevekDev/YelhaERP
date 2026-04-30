'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { Lock, Unlock, CheckCircle } from 'lucide-react'

interface FiscalPeriod {
  id: string
  year: number
  month: number
  isClosed: boolean
  closedAt?: string
  closedBy?: string
}

const MONTHS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']

export default function PeriodesPage() {
  const [periods, setPeriods] = useState<FiscalPeriod[]>([])
  const [loading, setLoading] = useState(true)
  const [closing, setClosing] = useState<string | null>(null)
  const currentYear = new Date().getFullYear()
  const [year, setYear] = useState(currentYear)

  useEffect(() => {
    setLoading(true)
    fetch('/api/accounting/periods').then(r => r.json()).then(d => {
      setPeriods(d.data ?? [])
      setLoading(false)
    }).catch(() => { setPeriods([]); setLoading(false) })
  }, [])

  const closePeriod = async (y: number, m: number) => {
    const key = `${y}-${m}`
    setClosing(key)
    await fetch('/api/accounting/periods/close', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ year: y, month: m }),
    })
    const res = await fetch('/api/accounting/periods')
    const data = await res.json()
    setPeriods(data.data ?? [])
    setClosing(null)
  }

  const months = Array.from({ length: 12 }, (_, i) => i + 1)

  return (
    <div className="p-4 md:p-6 space-y-6">
      <Breadcrumb items={[{ label: 'Comptabilité', href: '/dashboard/accounting' }, { label: 'Périodes' }]} />

      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Périodes Fiscales</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setYear(y => y - 1)}>&larr;</Button>
          <span className="px-4 py-2 border rounded-md font-semibold">{year}</span>
          <Button variant="outline" onClick={() => setYear(y => y + 1)}>&rarr;</Button>
        </div>
      </div>

      <div className="grid grid-cols-3 md:grid-cols-4 gap-4">
        {months.map(m => {
          const found = periods.find(p => p.year === year && p.month === m)
          const key = `${year}-${m}`
          const isCurrent = year === currentYear && m === new Date().getMonth() + 1
          return (
            <div key={m} className={`border rounded-lg p-4 ${found?.isClosed ? 'bg-muted/30' : isCurrent ? 'border-primary bg-primary/5' : 'bg-card'}`}>
              <div className="flex items-center justify-between mb-3">
                <span className="font-semibold">{MONTHS[m-1]} {year}</span>
                {found?.isClosed ? (
                  <Lock className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <Unlock className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
              {found?.isClosed ? (
                <div>
                  <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                    <CheckCircle className="w-3 h-3 mr-1" />Clôturé
                  </Badge>
                  {found.closedAt && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(found.closedAt).toLocaleDateString('fr-DZ')}
                    </p>
                  )}
                </div>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full text-xs"
                  disabled={closing === key}
                  onClick={() => closePeriod(year, m)}
                >
                  {closing === key ? 'Clôture...' : 'Clôturer'}
                </Button>
              )}
            </div>
          )
        })}
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
        <strong>Attention :</strong> La clôture d'une période est irréversible. Aucune nouvelle écriture ne pourra être ajoutée dans une période clôturée.
      </div>
    </div>
  )
}
