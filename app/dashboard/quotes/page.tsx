'use client'

import { useState, useEffect, useCallback } from 'react'
import { Header } from '@/components/layout/header'
import { PageHeader } from '@/components/ui/page-header'
import { DataTable } from '@/components/ui/data-table'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatDA } from '@/lib/algerian/format'
import { Eye, Plus, TrendingUp } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

interface Quote {
  id: string; number: string; status: string; issueDate: string; expiryDate?: string
  total: number; client: { name: string }
}

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Brouillon', SENT: 'Envoyé', ACCEPTED: 'Accepté',
  REJECTED: 'Refusé', EXPIRED: 'Expiré', CONVERTED: 'Converti',
}
const STATUS_VARIANTS: Record<string, 'secondary' | 'info' | 'success' | 'destructive' | 'warning' | 'default'> = {
  DRAFT: 'secondary', SENT: 'info', ACCEPTED: 'success',
  REJECTED: 'destructive', EXPIRED: 'warning', CONVERTED: 'default',
}

export default function QuotesPage() {
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('ALL')
  const [loading, setLoading] = useState(true)

  const fetchQuotes = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), limit: '20' })
    if (status !== 'ALL') params.set('status', status)
    const res = await fetch(`/api/quotes?${params}`)
    if (res.ok) {
      const d = await res.json()
      setQuotes(d.quotes)
      setTotal(d.total)
    } else toast.error('Erreur chargement')
    setLoading(false)
  }, [page, status])

  useEffect(() => { fetchQuotes() }, [fetchQuotes])

  // Taux de conversion
  const converted = quotes.filter(q => q.status === 'CONVERTED').length
  const relevant = quotes.filter(q => ['SENT','ACCEPTED','REJECTED','CONVERTED'].includes(q.status)).length
  const conversionRate = relevant > 0 ? Math.round(converted / relevant * 100) : 0

  const isExpired = (q: Quote) => q.expiryDate && new Date(q.expiryDate) < new Date() && q.status !== 'CONVERTED'

  const columns = [
    { key: 'number', header: 'N° Devis', render: (r: Quote) => (
      <Link href={`/dashboard/quotes/${r.id}`} className="font-mono hover:underline text-yelha-600">{r.number}</Link>
    )},
    { key: 'client', header: 'Client', render: (r: Quote) => r.client?.name ?? '—' },
    { key: 'issueDate', header: 'Date', render: (r: Quote) => new Date(r.issueDate).toLocaleDateString('fr-DZ') },
    { key: 'expiryDate', header: 'Expiration', render: (r: Quote) => r.expiryDate
      ? <span className={isExpired(r) ? 'text-red-600 font-medium' : ''}>{new Date(r.expiryDate).toLocaleDateString('fr-DZ')}</span>
      : <span className="text-muted-foreground">—</span>
    },
    { key: 'total', header: 'Montant', className: 'da-amount text-right', render: (r: Quote) => formatDA(Number(r.total)) },
    { key: 'status', header: 'Statut', render: (r: Quote) => (
      <Badge variant={STATUS_VARIANTS[r.status]}>{STATUS_LABELS[r.status]}</Badge>
    )},
    { key: 'actions', header: '', render: (r: Quote) => (
      <Link href={`/dashboard/quotes/${r.id}`}>
        <Button variant="ghost" size="icon"><Eye className="h-4 w-4" /></Button>
      </Link>
    )},
  ]

  return (
    <div>
      <Header title="Devis" />
      <div className="p-4 md:p-6 space-y-4">
        <PageHeader title="Devis" description={`${total} devis au total`} />

        {/* Taux de conversion */}
        {relevant > 0 && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <TrendingUp className="h-4 w-4 text-yelha-500" />
            <span>Taux de conversion : <span className="font-semibold text-yelha-600">{conversionRate}%</span> ({converted}/{relevant})</span>
          </div>
        )}

        <Card>
          <div className="p-4 border-b flex items-center gap-3">
            <Select value={status} onValueChange={v => { setStatus(v); setPage(1) }}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tous les statuts</SelectItem>
                {Object.entries(STATUS_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex-1" />
            <Link href="/dashboard/quotes/new">
              <Button className="gap-2"><Plus className="h-4 w-4" />Nouveau devis</Button>
            </Link>
          </div>
          <CardContent className="p-0">
            <DataTable
              data={quotes as unknown as Record<string, unknown>[]}
              columns={columns as never}
              total={total} page={page} limit={20}
              onPageChange={setPage} loading={loading}
              emptyText="Aucun devis"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
