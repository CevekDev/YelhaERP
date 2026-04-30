import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

export async function POST(req: NextRequest) {
  const signature = req.headers.get('signature')
  const payload = await req.text()

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  const secret = process.env.CHARGILY_SECRET_KEY ?? ''
  const computed = crypto.createHmac('sha256', secret).update(payload).digest('hex')

  if (!crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(signature))) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 403 })
  }

  let event: { type: string; data: { status: string; metadata?: { invoice_id?: string } } }
  try {
    event = JSON.parse(payload)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (event.type === 'checkout.paid') {
    const invoiceId = event.data?.metadata?.invoice_id
    if (invoiceId) {
      const invoice = await prisma.invoice.findUnique({
        where: { id: invoiceId },
        include: { payments: true },
      })
      if (invoice && invoice.status !== 'PAID') {
        // Determine payment method from Chargily (we use EDAHABIA as default)
        const method = 'CHARGILY_EDAHABIA'

        await prisma.$transaction([
          prisma.invoicePayment.create({
            data: {
              invoiceId,
              amount: invoice.total,
              method,
              reference: event.data?.metadata?.invoice_id ?? null,
              notes: 'Paiement en ligne via Chargily Pay',
              paidAt: new Date(),
            },
          }),
          prisma.invoice.update({
            where: { id: invoiceId },
            data: { status: 'PAID' },
          }),
        ])
      }
    }
  }

  return NextResponse.json({ received: true }, { status: 200 })
}
