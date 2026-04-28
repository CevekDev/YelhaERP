import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTenantContext } from '@/lib/security/tenant'
import { apiError } from '@/lib/security/api-response'
import { formatDA } from '@/lib/algerian/format'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const ctx = await getTenantContext()
    const quote = await prisma.quote.findFirst({
      where: { id: params.id, companyId: ctx.companyId },
      include: { client: true, lines: true, company: true },
    })
    if (!quote) return apiError('Devis introuvable', 404)

    const html = generateQuoteHTML(quote)
    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `inline; filename="devis-${quote.number}.html"`,
      },
    })
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'UNAUTHORIZED') return apiError('Non authentifié', 401)
    return apiError('Erreur serveur', 500)
  }
}

function generateQuoteHTML(quote: {
  number: string; issueDate: Date; expiryDate?: Date | null; notes?: string | null
  subtotal: unknown; taxAmount: unknown; total: unknown; status: string
  client: { name: string; nif?: string | null; address?: string | null; email?: string | null; phone?: string | null }
  company: { name: string; nif?: string | null; address?: string | null; phone?: string | null; legalForm?: string | null; rc?: string | null }
  lines: { description: string; quantity: unknown; unitPrice: unknown; taxRate: unknown; total: unknown }[]
}) {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>Devis ${quote.number}</title>
<style>
  * { margin:0;padding:0;box-sizing:border-box }
  body { font-family:Arial,sans-serif;font-size:12px;color:#111;padding:40px }
  .header { display:flex;justify-content:space-between;margin-bottom:40px }
  .company-name { font-size:20px;font-weight:bold;color:#1D9E75 }
  .doc-title { font-size:24px;font-weight:bold;text-align:right;color:#333 }
  .doc-number { font-size:14px;color:#666;text-align:right }
  .parties { display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-bottom:30px }
  .party-label { font-size:10px;text-transform:uppercase;letter-spacing:0.1em;color:#999;margin-bottom:4px }
  .party-name { font-weight:bold;font-size:14px }
  .party-info { color:#555;margin-top:2px }
  table { width:100%;border-collapse:collapse;margin:20px 0 }
  th { background:#f5f5f5;text-align:left;padding:8px 10px;font-size:11px;border-bottom:2px solid #ddd }
  td { padding:8px 10px;border-bottom:1px solid #eee }
  .text-right { text-align:right }
  .totals { margin-left:auto;width:280px }
  .total-row { display:flex;justify-content:space-between;padding:4px 0 }
  .total-final { font-size:16px;font-weight:bold;color:#1D9E75;border-top:2px solid #1D9E75;padding-top:8px;margin-top:4px }
  .validity { margin-top:20px;padding:12px;background:#f0fdf4;border-left:3px solid #1D9E75;color:#555 }
  .notes { margin-top:20px;color:#555;border-top:1px solid #eee;padding-top:10px }
  @media print { body { padding:20px } }
</style>
</head>
<body>
<div class="header">
  <div>
    <div class="company-name">${quote.company.name}</div>
    ${quote.company.legalForm ? `<div class="party-info">${quote.company.legalForm}</div>` : ''}
    ${quote.company.nif ? `<div class="party-info">NIF : ${quote.company.nif}</div>` : ''}
    ${quote.company.rc ? `<div class="party-info">RC : ${quote.company.rc}</div>` : ''}
    ${quote.company.address ? `<div class="party-info">${quote.company.address}</div>` : ''}
    ${quote.company.phone ? `<div class="party-info">Tél : ${quote.company.phone}</div>` : ''}
  </div>
  <div>
    <div class="doc-title">DEVIS</div>
    <div class="doc-number">N° ${quote.number}</div>
    <div class="doc-number">Date : ${new Date(quote.issueDate).toLocaleDateString('fr-DZ')}</div>
    ${quote.expiryDate ? `<div class="doc-number">Valide jusqu'au : ${new Date(quote.expiryDate).toLocaleDateString('fr-DZ')}</div>` : ''}
  </div>
</div>
<div class="parties">
  <div></div>
  <div>
    <div class="party-label">Destinataire</div>
    <div class="party-name">${quote.client.name}</div>
    ${quote.client.nif ? `<div class="party-info">NIF : ${quote.client.nif}</div>` : ''}
    ${quote.client.address ? `<div class="party-info">${quote.client.address}</div>` : ''}
    ${quote.client.phone ? `<div class="party-info">Tél : ${quote.client.phone}</div>` : ''}
    ${quote.client.email ? `<div class="party-info">${quote.client.email}</div>` : ''}
  </div>
</div>
<table>
  <thead>
    <tr>
      <th>Description</th>
      <th class="text-right">Qté</th>
      <th class="text-right">Prix unitaire</th>
      <th class="text-right">TVA %</th>
      <th class="text-right">Total TTC</th>
    </tr>
  </thead>
  <tbody>
    ${quote.lines.map(l => `
    <tr>
      <td>${l.description}</td>
      <td class="text-right">${Number(l.quantity)}</td>
      <td class="text-right">${formatDA(Number(l.unitPrice))}</td>
      <td class="text-right">${Number(l.taxRate)}%</td>
      <td class="text-right">${formatDA(Number(l.total))}</td>
    </tr>`).join('')}
  </tbody>
</table>
<div class="totals">
  <div class="total-row"><span>Sous-total HT</span><span>${formatDA(Number(quote.subtotal))}</span></div>
  <div class="total-row"><span>TVA</span><span>${formatDA(Number(quote.taxAmount))}</span></div>
  <div class="total-row total-final"><span>TOTAL TTC</span><span>${formatDA(Number(quote.total))}</span></div>
</div>
${quote.expiryDate ? `<div class="validity">Ce devis est valable jusqu'au ${new Date(quote.expiryDate).toLocaleDateString('fr-DZ')}.</div>` : ''}
${quote.notes ? `<div class="notes"><strong>Notes :</strong> ${quote.notes}</div>` : ''}
<script>window.addEventListener('load',()=>window.print())</script>
</body>
</html>`
}
