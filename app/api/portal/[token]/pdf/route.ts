import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { apiError } from '@/lib/security/api-response'
import { formatDA } from '@/lib/algerian/format'

// Route publique — portail client
export async function GET(_req: NextRequest, { params }: { params: { token: string } }) {
  const invoice = await prisma.invoice.findUnique({
    where: { portalToken: params.token },
    include: { client: true, lines: true, company: true },
  })
  if (!invoice) return apiError('Lien invalide', 404)

  const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>Facture ${invoice.number}</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;font-size:12px;padding:40px}
.title{font-size:24px;font-weight:bold;color:#1D9E75}.sub{color:#666;margin-top:4px}
table{width:100%;border-collapse:collapse;margin:20px 0}th{background:#f5f5f5;padding:8px;text-align:left;border-bottom:2px solid #ddd}
td{padding:8px;border-bottom:1px solid #eee}.tr{text-align:right}.totals{width:260px;margin-left:auto}
.trow{display:flex;justify-content:space-between;padding:3px 0}.final{font-size:16px;font-weight:bold;color:#1D9E75;border-top:2px solid #1D9E75;padding-top:6px;margin-top:4px}
</style></head><body>
<div style="display:flex;justify-content:space-between;margin-bottom:30px">
<div><div class="title">${invoice.company.name}</div>${invoice.company.nif ? `<div class="sub">NIF : ${invoice.company.nif}</div>` : ''}${invoice.company.address ? `<div class="sub">${invoice.company.address}</div>` : ''}</div>
<div style="text-align:right"><div style="font-size:20px;font-weight:bold">FACTURE N° ${invoice.number}</div>
<div class="sub">Émise le ${new Date(invoice.issueDate).toLocaleDateString('fr-DZ')}</div></div></div>
<div style="margin-bottom:20px"><div class="sub">Facturé à</div><div style="font-weight:bold">${invoice.client.name}</div>
${invoice.client.address ? `<div class="sub">${invoice.client.address}</div>` : ''}</div>
<table><thead><tr><th>Description</th><th class="tr">Qté</th><th class="tr">P.U.</th><th class="tr">TVA%</th><th class="tr">Total</th></tr></thead>
<tbody>${invoice.lines.map(l => `<tr><td>${l.description}</td><td class="tr">${Number(l.quantity)}</td><td class="tr">${formatDA(Number(l.unitPrice))}</td><td class="tr">${Number(l.taxRate)}%</td><td class="tr">${formatDA(Number(l.total))}</td></tr>`).join('')}</tbody></table>
<div class="totals"><div class="trow"><span>Sous-total HT</span><span>${formatDA(Number(invoice.subtotal))}</span></div>
<div class="trow"><span>TVA</span><span>${formatDA(Number(invoice.taxAmount))}</span></div>
<div class="trow final"><span>TOTAL TTC</span><span>${formatDA(Number(invoice.total))}</span></div></div>
<script>window.addEventListener('load',()=>window.print())</script></body></html>`

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Content-Disposition': `inline; filename="facture-${invoice.number}.html"` },
  })
}
