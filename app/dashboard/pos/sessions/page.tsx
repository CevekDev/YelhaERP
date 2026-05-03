'use client'
import { useEffect, useState } from 'react'
import { formatDA } from '@/lib/algerian/format'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Loader2, ArrowLeft, TrendingUp, Banknote, CreditCard, AlertTriangle } from 'lucide-react'
import Link from 'next/link'

type Session = {
  id: string
  number: number
  status: string
  openingCash: number
  closingCash: number | null
  totalSales: number
  totalCash: number
  totalCard: number
  totalDebt: number
  resetInterval: string
  openedAt: string
  closedAt: string | null
  _count: { sales: number }
}

export default function SessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/pos/sessions')
      .then(r => r.json())
      .then(d => setSessions(d.data ?? []))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/pos"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Historique des sessions</h1>
          <p className="text-muted-foreground text-sm">Toutes vos sessions de caisse</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">Aucune session trouvée</div>
      ) : (
        <div className="space-y-3">
          {sessions.map(s => (
            <div key={s.id} className="border rounded-xl p-4 bg-card">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-lg">Session #{s.number}</span>
                  <Badge className={s.status === 'OPEN' ? 'bg-green-500 text-white' : 'bg-muted text-muted-foreground'}>
                    {s.status === 'OPEN' ? 'En cours' : 'Fermée'}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {new Date(s.openedAt).toLocaleDateString('fr-DZ', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {s._count.sales} vente{s._count.sales > 1 ? 's' : ''}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <div className="text-xs text-muted-foreground mb-1 flex items-center justify-center gap-1">
                    <TrendingUp className="h-3 w-3" />Total ventes
                  </div>
                  <div className="font-bold da-amount">{formatDA(Number(s.totalSales))}</div>
                </div>
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <div className="text-xs text-muted-foreground mb-1 flex items-center justify-center gap-1">
                    <Banknote className="h-3 w-3" />Espèces
                  </div>
                  <div className="font-bold da-amount">{formatDA(Number(s.totalCash))}</div>
                </div>
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <div className="text-xs text-muted-foreground mb-1 flex items-center justify-center gap-1">
                    <CreditCard className="h-3 w-3" />Carte
                  </div>
                  <div className="font-bold da-amount">{formatDA(Number(s.totalCard))}</div>
                </div>
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <div className="text-xs text-muted-foreground mb-1 flex items-center justify-center gap-1">
                    <AlertTriangle className="h-3 w-3" />Dettes
                  </div>
                  <div className="font-bold text-amber-500 da-amount">{formatDA(Number(s.totalDebt))}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
