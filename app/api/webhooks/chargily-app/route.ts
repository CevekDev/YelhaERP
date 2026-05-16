import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { prisma } from '@/lib/prisma'
import { sendAppPaymentConfirmation } from '@/lib/email/resend'
import { getAppPlanConfig } from '@/lib/pricing/app-plans'

interface ChargilyEvent {
  type: string
  data: {
    id?: string
    status?: string
    amount?: number
    metadata?: Record<string, string>
  }
}

export async function POST(req: NextRequest) {
  const signature = req.headers.get('signature')
  const payload   = await req.text()

  if (!signature) {
    return NextResponse.json({ error: 'Signature manquante' }, { status: 400 })
  }

  const secret = process.env.CHARGILY_WEBHOOK_SECRET ?? ''
  const computed = crypto.createHmac('sha256', secret).update(payload).digest('hex')
  const computedBuf = Buffer.from(computed)
  const signatureBuf = Buffer.from(signature)
  const signatureValid = computedBuf.length === signatureBuf.length &&
    crypto.timingSafeEqual(computedBuf, signatureBuf)

  if (!signatureValid) {
    return NextResponse.json({ error: 'Signature invalide' }, { status: 403 })
  }

  let event: ChargilyEvent
  try { event = JSON.parse(payload) } catch {
    return NextResponse.json({ error: 'JSON invalide' }, { status: 400 })
  }

  if (event.type !== 'checkout.paid') {
    return NextResponse.json({ received: true }, { status: 200 })
  }

  const chargilyId = event.data?.id
  const appPaymentId = event.data?.metadata?.appPaymentId
  if (!chargilyId || !appPaymentId) {
    return NextResponse.json({ received: true }, { status: 200 })
  }

  const payment = await prisma.appPayment.findUnique({
    where: { id: appPaymentId },
    include: {
      appSubscription: {
        include: { company: { include: { users: { where: { role: 'OWNER' }, take: 1 } } } },
      },
    },
  })

  if (!payment || payment.status === 'PAID') {
    return NextResponse.json({ received: true }, { status: 200 })
  }

  const now = new Date()
  const periodEnd = new Date(now)
  periodEnd.setMonth(periodEnd.getMonth() + 1)

  await prisma.$transaction(async (tx) => {
    await tx.appPayment.update({
      where: { id: payment.id },
      data: { status: 'PAID', paidAt: now, chargilyId },
    })

    await tx.appSubscription.update({
      where: { id: payment.appSubscriptionId },
      data: {
        status: 'ACTIVE',
        planId: payment.planId,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        monthlyAmount: payment.amount,
        lastPaymentAt: now,
        lastPaymentRef: payment.ccpRef ?? payment.id,
      },
    })
  })

  // Email de confirmation au propriétaire de la company
  const owner = payment.appSubscription.company.users[0]
  if (owner) {
    const appConfig = getAppPlanConfig(payment.appId)
    await sendAppPaymentConfirmation({
      to: owner.email,
      name: owner.name,
      appName: appConfig?.appName ?? payment.appId,
      planName: payment.planId,
      amount: payment.amount,
      periodStart: now,
      periodEnd,
    })
  }

  return NextResponse.json({ received: true }, { status: 200 })
}
