import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email/resend'
import { PLANS, type AppId } from '@/lib/pricing/config'

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
  try {
    event = JSON.parse(payload)
  } catch {
    return NextResponse.json({ error: 'JSON invalide' }, { status: 400 })
  }

  const chargilyId = event.data?.id
  if (!chargilyId) {
    return NextResponse.json({ received: true }, { status: 200 })
  }

  if (event.type === 'checkout.paid') {
    const payment = await prisma.yelhaPayment.findFirst({
      where: { chargilyId },
      include: { subscription: { include: { company: true } } },
    })

    if (!payment) {
      console.warn('[chargily-yelha] Payment not found for chargilyId:', chargilyId)
      return NextResponse.json({ received: true }, { status: 200 })
    }

    if (payment.status === 'PAID') {
      return NextResponse.json({ received: true }, { status: 200 })
    }

    const now = new Date()
    const isAnnual = payment.billingCycle === 'ANNUAL'
    // Use periodStart from payment (set at checkout) to preserve early-renewal days
    const periodStart = payment.periodStart
    const periodEnd = new Date(periodStart)
    if (isAnnual) {
      periodEnd.setDate(periodEnd.getDate() + 365)
    } else {
      periodEnd.setDate(periodEnd.getDate() + 30)
    }

    // Get plan limits
    const planId = payment.planId as keyof typeof PLANS
    const plan = PLANS[planId]
    const limits = 'limits' in plan ? plan.limits : null

    const planEnum = payment.planId.toUpperCase() as 'TRIAL' | 'STARTER' | 'PRO' | 'AGENCY' | 'BUSINESS' | 'ENTERPRISE'
    const validPlanEnums = ['TRIAL', 'STARTER', 'PRO', 'AGENCY', 'BUSINESS', 'ENTERPRISE']

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
          extraApps:          payment.extraApps,
          currentPeriodStart: periodStart,
          currentPeriodEnd:   periodEnd,
          lastPaymentAt:      now,
          lastPaymentRef:     payment.id,
          monthlyAmount:      payment.amount,
          ...(limits ? {
            limitEmails:     limits.emails,
            limitApiReq:     limits.apiRequests,
            limitAiReq:      limits.aiRequests,
            limitDeliverers: limits.deliverers,
            limitSkus:       limits.skus,
          } : {}),
        },
      })

      if (validPlanEnums.includes(planEnum)) {
        await tx.company.update({
          where: { id: payment.subscription.company.id },
          data: { plan: planEnum },
        })
      }
    })

    // Send confirmation email to Yelha admin
    const company = payment.subscription.company
    const appIds = payment.extraApps as AppId[]
    const periodEndStr = periodEnd.toLocaleDateString('fr-DZ', { day: 'numeric', month: 'long', year: 'numeric' })

    await sendEmail({
      to: 'cvkdev@outlook.fr',
      subject: `[YelhaERP] Paiement reçu — ${company.name} — Plan ${payment.planId}`,
      html: `
        <h2>Paiement abonnement reçu ✅</h2>
        <p><strong>Entreprise :</strong> ${company.name} (${company.id})</p>
        <p><strong>Plan :</strong> ${payment.planId}</p>
        <p><strong>Cycle :</strong> ${payment.billingCycle}</p>
        <p><strong>Montant :</strong> ${payment.amount} DA</p>
        <p><strong>Apps supplémentaires :</strong> ${appIds.length > 0 ? appIds.join(', ') : 'Aucune'}</p>
        <p><strong>Période jusqu'au :</strong> ${periodEndStr}</p>
        <p><strong>Référence Chargily :</strong> ${chargilyId}</p>
      `,
    }).catch(() => {})

  } else if (event.type === 'checkout.failed') {
    const payment = await prisma.yelhaPayment.findFirst({
      where: { chargilyId },
    })

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
