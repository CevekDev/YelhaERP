import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'
import { sendEmail } from '@/lib/email/resend'
import { PLANS } from '@/lib/pricing/config'
import { isAlreadyProcessed } from '@/lib/webhooks/idempotence'

type ChargilyEvent = {
  type: string
  data: {
    id?: string
    amount?: number
    metadata?: Record<string, string>
  }
}

export async function POST(req: NextRequest) {
  const signature = req.headers.get('signature')
  const payload = await req.text()

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

  const chargilyId = event.data?.id
  const meta = event.data?.metadata ?? {}

  // Idempotence — un même eventId Chargily ne doit pas être traité deux fois
  // (Chargily peut rejouer en cas de timeout HTTP de notre côté).
  if (chargilyId && await isAlreadyProcessed('chargily', `${event.type}:${chargilyId}`)) {
    return NextResponse.json({ received: true, duplicate: true }, { status: 200 })
  }

  // ── YelhaSubs subscription payment ────────────────────────────────────────
  // Suppress unused-var lint for meta which is destructured but only used
  // for the implicit "no metadata = ERP payment" branch logic below.
  void meta
  if (!chargilyId) return NextResponse.json({ received: true }, { status: 200 })

  if (event.type === 'checkout.paid') {
    const payment = await prisma.yelhaPayment.findFirst({
      where: { chargilyId },
      include: { subscription: { include: { user: true } } },
    })

    if (!payment || payment.status === 'PAID') {
      return NextResponse.json({ received: true }, { status: 200 })
    }

    const now = new Date()
    const isAnnual = payment.billingCycle === 'ANNUAL'
    const periodStart = payment.periodStart
    const periodEnd = new Date(periodStart)
    if (isAnnual) {
      periodEnd.setDate(periodEnd.getDate() + 365)
    } else {
      periodEnd.setDate(periodEnd.getDate() + 30)
    }

    const planId = payment.planId as keyof typeof PLANS
    const plan = PLANS[planId]
    const limits = 'limits' in plan ? plan.limits : null
    const planEnum = payment.planId.toUpperCase() as 'STARTER' | 'PRO' | 'AGENCY' | 'BUSINESS' | 'ENTERPRISE'
    const validPlanEnums = ['STARTER', 'PRO', 'AGENCY', 'BUSINESS', 'ENTERPRISE']

    await prisma.$transaction(async (tx) => {
      await tx.yelhaPayment.update({
        where: { id: payment.id },
        data: { status: 'PAID', paidAt: now },
      })
      await tx.yelhaSubscription.update({
        where: { id: payment.subscriptionId },
        data: {
          status:             'ACTIVE',
          planId:             payment.planId,
          billingCycle:       payment.billingCycle,
          currentPeriodStart: periodStart,
          currentPeriodEnd:   periodEnd,
          lastPaymentAt:      now,
          lastPaymentRef:     payment.id,
          monthlyAmount:      payment.amount,
          ...(limits ? {
            limitEmails: limits.emails,
            limitApiReq: limits.apiRequests,
          } : {}),
        },
      })
      if (validPlanEnums.includes(planEnum)) {
        await tx.user.update({
          where: { id: payment.subscription.user.id },
          data: { plan: planEnum },
        })
      }
    })

    const user = payment.subscription.user
    const periodEndStr = periodEnd.toLocaleDateString('fr-DZ', { day: 'numeric', month: 'long', year: 'numeric' })
    await sendEmail({
      to: 'cvkdev@outlook.fr',
      subject: `[YelhaSubs] Paiement reçu — ${user.name} — Plan ${payment.planId}`,
      html: `
        <h2>Paiement YelhaSubs reçu ✅</h2>
        <p><strong>Utilisateur :</strong> ${user.name} (${user.id})</p>
        <p><strong>Plan :</strong> ${payment.planId}</p>
        <p><strong>Cycle :</strong> ${payment.billingCycle}</p>
        <p><strong>Montant :</strong> ${payment.amount} DA</p>
        <p><strong>Période jusqu'au :</strong> ${periodEndStr}</p>
        <p><strong>Référence Chargily :</strong> ${chargilyId}</p>
      `,
    }).catch(() => {})

  } else if (event.type === 'checkout.failed') {
    const payment = await prisma.yelhaPayment.findFirst({ where: { chargilyId } })
    if (payment && payment.status === 'PENDING') {
      await prisma.yelhaPayment.update({
        where: { id: payment.id },
        data: { status: 'FAILED' },
      })
      await prisma.yelhaSubscription.update({
        where: { id: payment.subscriptionId },
        data: { status: 'PAST_DUE' },
      })
    }
  }

  return NextResponse.json({ received: true }, { status: 200 })
}
