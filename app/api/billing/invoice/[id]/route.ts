import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { rateLimit, AUTHENTICATED_RATE_LIMIT } from '@/lib/security/ratelimit'
import { apiError, rateLimitResponse } from '@/lib/security/api-response'
import { jsPDF } from 'jspdf'
import 'jspdf-autotable'
import type { UserOptions } from 'jspdf-autotable'

declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: UserOptions) => jsPDF
  }
}

function formatDate(d: Date) {
  return d.toLocaleDateString('fr-DZ', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function formatDA(amount: number) {
  return new Intl.NumberFormat('fr-DZ').format(amount) + ' DA'
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const rl = await rateLimit(req, AUTHENTICATED_RATE_LIMIT)
  if (!rl.success) return rateLimitResponse(rl.reset)

  try {
    const session = await auth()
    const userId = session?.user?.id
    if (!userId) return apiError('Non autorisé', 401)

    const payment = await prisma.yelhaPayment.findUnique({
      where: { id: params.id },
      include: { subscription: { include: { user: true } } },
    })

    if (!payment) return apiError('Facture introuvable', 404)
    if (payment.subscription.userId !== userId) return apiError('Accès refusé', 403)
    if (payment.status !== 'PAID') return apiError('Facture non disponible — paiement non confirmé', 400)

    const user = payment.subscription.user
    const invoiceNumber = `YELHA-${payment.createdAt.getFullYear()}-${payment.id.slice(-6).toUpperCase()}`

    const doc = new jsPDF({ unit: 'mm', format: 'a4' })
    const pageW = doc.internal.pageSize.getWidth()

    // Header background
    doc.setFillColor(29, 158, 117)
    doc.rect(0, 0, pageW, 40, 'F')

    // Logo / title
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(20)
    doc.setFont('helvetica', 'bold')
    doc.text('YelhaSubs', 15, 18)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text('Facture d\'abonnement', 15, 26)
    doc.text('subs.yelha.net', 15, 33)

    // Invoice number (top right)
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text(invoiceNumber, pageW - 15, 18, { align: 'right' })
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.text(`Émise le ${formatDate(payment.createdAt)}`, pageW - 15, 25, { align: 'right' })
    if (payment.paidAt) {
      doc.text(`Payée le ${formatDate(payment.paidAt)}`, pageW - 15, 31, { align: 'right' })
    }

    // Client info box
    doc.setTextColor(30, 30, 30)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text('FACTURÉ À', 15, 52)
    doc.setFont('helvetica', 'normal')
    doc.text(user.name ?? user.email, 15, 58)
    doc.text(user.email, 15, 64)

    // Issuer info
    doc.setFont('helvetica', 'bold')
    doc.text('ÉMETTEUR', pageW / 2, 52)
    doc.setFont('helvetica', 'normal')
    doc.text('YelhaSubs — Yelha Technologies', pageW / 2, 58)
    doc.text('Alger, Algérie', pageW / 2, 64)
    doc.text('cvkdev@outlook.fr', pageW / 2, 70)

    // Divider
    doc.setDrawColor(200, 200, 200)
    doc.line(15, 76, pageW - 15, 76)

    // Table
    const planLabel = payment.planId.charAt(0).toUpperCase() + payment.planId.slice(1).toLowerCase()
    const cycleLabel = payment.billingCycle === 'ANNUAL' ? 'Annuel' : 'Mensuel'

    doc.autoTable({
      startY: 82,
      head: [['Description', 'Période', 'Cycle', 'Montant HT', 'TVA (0%)', 'Total']],
      body: [[
        `Abonnement YelhaSubs — Plan ${planLabel}`,
        `${formatDate(payment.periodStart)} — ${formatDate(payment.periodEnd)}`,
        cycleLabel,
        formatDA(payment.amount),
        '0 DA',
        formatDA(payment.amount),
      ]],
      styles: { fontSize: 9, cellPadding: 4 },
      headStyles: { fillColor: [29, 158, 117], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [247, 250, 252] },
      margin: { left: 15, right: 15 },
      columnStyles: {
        0: { cellWidth: 65 },
        1: { cellWidth: 38 },
        2: { cellWidth: 18 },
        3: { cellWidth: 24 },
        4: { cellWidth: 20 },
        5: { cellWidth: 24 },
      },
    })

    const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable?.finalY ?? 120

    // Total box
    doc.setFillColor(29, 158, 117)
    doc.roundedRect(pageW - 75, finalY + 6, 60, 16, 3, 3, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text('TOTAL PAYÉ', pageW - 45, finalY + 13, { align: 'center' })
    doc.setFontSize(11)
    doc.text(formatDA(payment.amount), pageW - 45, finalY + 20, { align: 'center' })

    // Note TVA
    doc.setTextColor(120, 120, 120)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'italic')
    doc.text('TVA non applicable — Article 293B du CGI (prestation de services numériques)', 15, finalY + 16)

    // Payment method
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(60, 60, 60)
    doc.setFontSize(8)
    const methodLabel = payment.method === 'CCP' ? 'Virement CCP' : payment.method === 'CHARGILY' ? 'Paiement en ligne (Chargily ePay)' : payment.method
    doc.text(`Méthode de paiement : ${methodLabel}`, 15, finalY + 28)
    if (payment.ccpRef) doc.text(`Référence CCP : ${payment.ccpRef}`, 15, finalY + 34)
    if (payment.chargilyId) doc.text(`Réf. transaction : ${payment.chargilyId}`, 15, finalY + 34)

    // Footer
    doc.setFillColor(248, 250, 252)
    doc.rect(0, 272, pageW, 25, 'F')
    doc.setTextColor(150, 150, 150)
    doc.setFontSize(7.5)
    doc.text('YelhaSubs — Solution de gestion algérienne | subs.yelha.net | cvkdev@outlook.fr', pageW / 2, 280, { align: 'center' })
    doc.text('Ce document tient lieu de facture conformément à la réglementation en vigueur.', pageW / 2, 286, { align: 'center' })

    const pdfBytes = doc.output('arraybuffer')

    return new NextResponse(pdfBytes, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="facture-${invoiceNumber}.pdf"`,
        'Cache-Control': 'private, no-store',
      },
    })
  } catch {
    return apiError('Erreur serveur', 500)
  }
}
