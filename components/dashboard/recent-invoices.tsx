import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatDA } from '@/lib/algerian/format'
import type { Invoice, Client } from '@prisma/client'

type InvoiceWithClient = Invoice & { client: { name: string } }

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Brouillon',
  SENT: 'Envoyée',
  PAID: 'Payée',
  PARTIAL: 'Partielle',
  OVERDUE: 'En retard',
  CANCELLED: 'Annulée',
}

const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'info'> = {
  DRAFT: 'secondary',
  SENT: 'info',
  PAID: 'success',
  PARTIAL: 'warning',
  OVERDUE: 'destructive',
  CANCELLED: 'outline',
}

interface RecentInvoicesProps {
  invoices: InvoiceWithClient[]
}

export function RecentInvoices({ invoices }: RecentInvoicesProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Dernières factures</CardTitle>
        <Link href="/dashboard/invoices" className="text-sm text-yelha-600 hover:underline">
          Voir tout
        </Link>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>N°</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Montant</TableHead>
              <TableHead>Statut</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  Aucune facture pour le moment
                </TableCell>
              </TableRow>
            ) : (
              invoices.map(inv => (
                <TableRow key={inv.id}>
                  <TableCell className="font-mono text-sm">
                    <Link href={`/dashboard/invoices/${inv.id}`} className="hover:underline">
                      {inv.number}
                    </Link>
                  </TableCell>
                  <TableCell>{inv.client.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(inv.issueDate).toLocaleDateString('fr-DZ')}
                  </TableCell>
                  <TableCell className="da-amount font-medium">{formatDA(Number(inv.total))}</TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANTS[inv.status]}>
                      {STATUS_LABELS[inv.status]}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
