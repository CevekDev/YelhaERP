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
import { Eye, Plus, FileText } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { TutorialOverlay } from '@/components/tutorial/tutorial-overlay'
import { useT } from '@/lib/i18n'
const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'info'> = {
  DRAFT: 'secondary', SENT: 'info', PAID: 'success',
  PARTIAL: 'warning', OVERDUE: 'destructive', CANCELLED: 'outline',
}

interface Invoice {
  id: string; number: string; status: string; issueDate: string
  total: number; client: { name: string }; type: string
}

export default function InvoicesPage() {
  const { t } = useT()
  const router = useRouter()

  const STATUS_LABELS: Record<string, string> = {
    DRAFT: t('pages.invoices_status_draft'),
    SENT: t('pages.invoices_status_sent'),
    PAID: t('pages.invoices_status_paid'),
    PARTIAL: t('pages.invoices_status_partial'),
    OVERDUE: t('pages.invoices_status_overdue'),
    CANCELLED: t('pages.invoices_status_cancelled'),
  }

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
    { key: 'number', header: t('pages.invoices_col_number'), className: 'font-mono', render: (row: Invoice) => (
      <Link href={`/dashboard/invoices/${row.id}`} className="hover:underline text-yelha-600">{row.number}</Link>
    )},
    { key: 'client', header: t('pages.invoices_col_client'), render: (row: Invoice) => row.client?.name ?? '—' },
    { key: 'issueDate', header: t('pages.invoices_col_date'), render: (row: Invoice) => new Date(row.issueDate).toLocaleDateString('fr-DZ') },
    { key: 'total', header: t('pages.invoices_col_total'), className: 'da-amount text-right',
      render: (row: Invoice) => formatDA(Number(row.total)) },
    { key: 'status', header: t('pages.invoices_col_status'), render: (row: Invoice) => (
      <Badge variant={STATUS_VARIANTS[row.status]}>{STATUS_LABELS[row.status]}</Badge>
    )},
    { key: 'actions', header: '', render: (row: Invoice) => (
      <Link href={`/dashboard/invoices/${row.id}`}>
        <Button variant="ghost" size="icon"><Eye className="h-4 w-4" /></Button>
      </Link>
    )},
  ]

  return (
    <>
    <div>
      <Header title={t('pages.invoices_title')} />
      <div className="p-4 md:p-6">
        <PageHeader title={t('pages.invoices_title')} description={`${total} ${t('pages.invoices_title').toLowerCase()}`} />
        <Card>
          <div className="p-4 border-b flex items-center gap-3 flex-wrap">
            <Select value={status} onValueChange={v => { setStatus(v); setPage(1) }}>
              <SelectTrigger className="w-40" data-tutorial="invoice-filters">
                <SelectValue placeholder={t('common.status')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{t('common.apply')}</SelectItem>
                {Object.entries(STATUS_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex-1" />
            <Link href="/dashboard/invoices/new">
              <Button className="gap-2" data-tutorial="new-invoice"><Plus className="h-4 w-4" />{t('pages.invoices_new')}</Button>
            </Link>
          </div>
          <CardContent className="p-0">
            <DataTable
              data={invoices as unknown as Record<string, unknown>[]}
              columns={columns as never}
              total={total} page={page} limit={20}
              onPageChange={setPage} loading={loading}
              emptyIcon={FileText}
              emptyText={t('pages.invoices_title')}
              emptyDescription={t('pages.invoices_desc')}
              emptyAction={{ label: t('pages.invoices_new'), onClick: () => router.push('/dashboard/invoices/new') }}
            />
          </CardContent>
        </Card>
      </div>
    </div>
    <TutorialOverlay pageKey="invoices" />
    </>
  )
}
