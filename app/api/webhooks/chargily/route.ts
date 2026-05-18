import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

export async function POST(req: NextRequest) {
  const signature = req.headers.get('signature')
  const payload = await req.text()

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  const secret = process.env.CHARGILY_WEBHOOK_SECRET ?? ''
  const computed = crypto.createHmac('sha256', secret).update(payload).digest('hex')
  const computedBuf = Buffer.from(computed)
  const signatureBuf = Buffer.from(signature)
  const signatureValid = computedBuf.length === signatureBuf.length &&
    crypto.timingSafeEqual(computedBuf, signatureBuf)

  if (!signatureValid) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 403 })
  }

  let event: { type: string; data: { metadata?: Record<string, string>; amount?: number } }
  try {
    event = JSON.parse(payload)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (event.type === 'checkout.paid') {
    const meta = event.data?.metadata ?? {}

    // ── Invoice payment ───────────────────────────────────────
    if (meta.invoice_id) {
      try {
        const invoice = await prisma.invoice.findUnique({
          where: { id: meta.invoice_id },
          select: { id: true, total: true, status: true, companyId: true, number: true },
        })

        if (!invoice || invoice.status === 'PAID') {
          return NextResponse.json({ received: true }, { status: 200 })
        }

        const paidAmount = Number(event.data?.amount ?? invoice.total)

        await prisma.$transaction(async (tx) => {
          await tx.invoicePayment.create({
            data: {
              invoiceId: invoice.id,
              amount: paidAmount,
              method: 'CHARGILY_EDAHABIA',
              paidAt: new Date(),
              reference: `chargily-${Date.now()}`,
            },
          })

          const totalPaid = await tx.invoicePayment.aggregate({
            where: { invoiceId: invoice.id },
            _sum: { amount: true },
          })
          const sumPaid = Number(totalPaid._sum.amount ?? 0)
          const invoiceTotal = Number(invoice.total)

          const newStatus = sumPaid >= invoiceTotal ? 'PAID' : 'PARTIAL'

          await tx.invoice.update({
            where: { id: invoice.id },
            data: { status: newStatus },
          })
        })
      } catch (e) {
        console.error('[webhook] invoice payment error:', e)
      }
    }
  }

  return NextResponse.json({ received: true }, { status: 200 })
}
