import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { formatDA } from '@/lib/algerian/format'
import { TrendingUp, Download } from 'lucide-react'

export default async function PortalPage({ params }: { params: { token: string } }) {
  const invoice = await prisma.invoice.findUnique({
    where: { portalToken: params.token },
    include: {
      client: { select: { name: true, email: true, phone: true, address: true, nif: true } },
      lines: true,
      company: { select: { name: true, nif: true, nis: true, rc: true, address: true, wilaya: true, phone: true, email: true, legalForm: true } },
    },
  })

  if (!invoice) notFound()

  const STATUS_LABELS: Record<string, string> = { DRAFT: 'Brouillon', SENT: 'Envoyée', PAID: 'Payée', PARTIAL: 'Partielle', OVERDUE: 'En retard', CANCELLED: 'Annulée' }
  const STATUS_COLORS: Record<string, string> = { DRAFT: 'bg-gray-100 text-gray-700', SENT: 'bg-blue-100 text-blue-700', PAID: 'bg-green-100 text-green-700', PARTIAL: 'bg-amber-100 text-amber-700', OVERDUE: 'bg-red-100 text-red-700', CANCELLED: 'bg-gray-100 text-gray-500' }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-yelha-500 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-yelha-700">YelhaERP</span>
          </div>
          <a href={`/api/portal/${params.token}/pdf`} target="_blank"
            className="flex items-center gap-2 px-4 py-2 rounded-md bg-yelha-500 text-white text-sm font-medium hover:bg-yelha-600 transition-colors">
            <Download className="h-4 w-4" />Télécharger PDF
          </a>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {/* Status + header facture */}
        <div className="bg-white rounded-xl border p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Facture</p>
              <h1 className="text-3xl font-bold mt-1">{invoice.number}</h1>
              <p className="text-gray-500 mt-1">Émise le {new Date(invoice.issueDate).toLocaleDateString('fr-DZ')}</p>
              {invoice.dueDate && <p className="text-gray-500">Échéance : {new Date(invoice.dueDate).toLocaleDateString('fr-DZ')}</p>}
            </div>
            <div className="text-right">
              <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${STATUS_COLORS[invoice.status]}`}>
                {STATUS_LABELS[invoice.status]}
              </span>
              <p className="text-3xl font-bold text-yelha-600 mt-3 da-amount">{formatDA(Number(invoice.total))}</p>
            </div>
          </div>
        </div>

        {/* Parties */}
        <div className="grid grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border p-6">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-3">De</p>
            <p className="font-bold text-lg">{invoice.company.name}</p>
            {invoice.company.legalForm && <p className="text-gray-600">{invoice.company.legalForm}</p>}
            {invoice.company.nif && <p className="text-gray-600 text-sm">NIF : {invoice.company.nif}</p>}
            {invoice.company.address && <p className="text-gray-500 text-sm">{invoice.company.address}</p>}
            {invoice.company.phone && <p className="text-gray-500 text-sm">Tél : {invoice.company.phone}</p>}
          </div>
          <div className="bg-white rounded-xl border p-6">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-3">À</p>
            <p className="font-bold text-lg">{invoice.client.name}</p>
            {invoice.client.nif && <p className="text-gray-600 text-sm">NIF : {invoice.client.nif}</p>}
            {invoice.client.address && <p className="text-gray-500 text-sm">{invoice.client.address}</p>}
            {invoice.client.phone && <p className="text-gray-500 text-sm">Tél : {invoice.client.phone}</p>}
          </div>
        </div>

        {/* Lignes */}
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-6 py-4 font-medium text-gray-600">Description</th>
                <th className="text-right px-4 py-4 font-medium text-gray-600">Qté</th>
                <th className="text-right px-4 py-4 font-medium text-gray-600">Prix unitaire</th>
                <th className="text-right px-6 py-4 font-medium text-gray-600">Total TTC</th>
              </tr>
            </thead>
            <tbody>
              {invoice.lines.map(line => (
                <tr key={line.id} className="border-b last:border-0">
                  <td className="px-6 py-4">{line.description}</td>
                  <td className="px-4 py-4 text-right">{Number(line.quantity)}</td>
                  <td className="px-4 py-4 text-right da-amount">{formatDA(Number(line.unitPrice))}</td>
                  <td className="px-6 py-4 text-right da-amount font-medium">{formatDA(Number(line.total))}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50 border-t">
              <tr><td colSpan={3} className="px-6 py-3 text-right text-sm text-gray-500">Sous-total HT</td><td className="px-6 py-3 text-right da-amount">{formatDA(Number(invoice.subtotal))}</td></tr>
              <tr><td colSpan={3} className="px-6 py-2 text-right text-sm text-gray-500">TVA</td><td className="px-6 py-2 text-right da-amount">{formatDA(Number(invoice.taxAmount))}</td></tr>
              <tr className="font-bold text-yelha-700"><td colSpan={3} className="px-6 py-4 text-right text-base">TOTAL TTC</td><td className="px-6 py-4 text-right da-amount text-lg">{formatDA(Number(invoice.total))}</td></tr>
            </tfoot>
          </table>
        </div>

        {invoice.notes && (
          <div className="bg-white rounded-xl border p-6 text-sm text-gray-600">
            <span className="font-medium">Note : </span>{invoice.notes}
          </div>
        )}

        <p className="text-center text-xs text-gray-400">Généré par YelhaERP · Accès réservé au destinataire</p>
      </div>
    </div>
  )
}
