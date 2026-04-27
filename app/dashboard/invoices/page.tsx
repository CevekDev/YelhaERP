'use client'

import { useState, useEffect, useCallback } from 'react'
import { Header } from '@/components/layout/header'
import { PageHeader } from '@/components/ui/page-header'
import { DataTable } from '@/components/ui/data-table'
import { SearchInput } from '@/components/ui/search-input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { formatDA } from '@/lib/algerian/format'
import Link from 'next/link'
import { Eye, Plus } from 'lucide-react'
import { toast } from 'sonner'

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Brouillon', SENT: 'Envoyée', PAID: 'Payée',
  PARTIAL: 'Partielle', OVERDUE: 'En retard', CANCELLED: 'Annulée',
}
const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'info'> = {
  DRAFT: 'secondary', SENT: 'info', PAID: 'success',
  PARTIAL: 'warning', OVERDUE: 'destructive', CANCELLED: 'outline',
}

interface Invoice {
  id: string; number: string; status: string; issueDate: string
  total: number; client: { name: string }; type: string
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState<string>('ALL')
  const [loading, setLoading] = useState(true)

  const fetchInvoices = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), limit: '20' })
    if (status !== 'ALL') params.set('status', status)
    const res = await fetch(`/api/invoices?${params}`)
    if (res.ok) {
      const data = await res.json()
      setInvoices(data.invoices)
      setTotal(data.total)
    } else toast.error('Erreur lors du chargement')
    setLoading(false)
  }, [page, status])

  useEffect(() => { fetchInvoices() }, [fetchInvoices])

  const columns = [
    { key: 'number', header: 'N° Facture', className: 'font-mono', render: (row: Invoice) => (
      <Link href={`/dashboard/invoices/${row.id}`} className="hover:underline text-yelha-600">{row.number}</Link>
    )},
    { key: 'client', header: 'Client', render: (row: Invoice) => row.client?.name ?? '—' },
    { key: 'issueDate', header: 'Date', render: (row: Invoice) => new Date(row.issueDate).toLocaleDateString('fr-DZ') },
    { key: 'total', header: 'Montant', className: 'da-amount text-right',
      render: (row: Invoice) => formatDA(Number(row.total)) },
    { key: 'status', header: 'Statut', render: (row: Invoice) => (
      <Badge variant={STATUS_VARIANTS[row.status]}>{STATUS_LABELS[row.status]}</Badge>
    )},
    { key: 'actions', header: '', render: (row: Invoice) => (
      <Link href={`/dashboard/invoices/${row.id}`}>
        <Button variant="ghost" size="icon"><Eye className="h-4 w-4" /></Button>
      </Link>
    )},
  ]

  return (
    <div>
      <Header title="Facturation" />
      <div className="p-6">
        <PageHeader title="Factures" description={`${total} facture${total > 1 ? 's' : ''} au total`} />
        <Card>
          <div className="p-4 border-b flex items-center gap-3">
            <Select value={status} onValueChange={v => { setStatus(v); setPage(1) }}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tous</SelectItem>
                {Object.entries(STATUS_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex-1" />
            <Link href="/dashboard/invoices/new">
              <Button className="gap-2"><Plus className="h-4 w-4" />Nouvelle facture</Button>
            </Link>
          </div>
          <CardContent className="p-0">
            <DataTable
              data={invoices as unknown as Record<string, unknown>[]}
              columns={columns as never}
              total={total} page={page} limit={20}
              onPageChange={setPage} loading={loading}
              emptyText="Aucune facture"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
