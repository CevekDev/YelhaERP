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

  let event: { type: string; data: { metadata?: Record<string, string> } }
  try {
    event = JSON.parse(payload)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (event.type === 'checkout.paid') {
    const meta = event.data?.metadata ?? {}

    if (meta.type === 'subscription' && meta.company_id && meta.plan) {
      const VALID_PLANS = new Set(['STARTER', 'PRO', 'AGENCY'])
      const VALID_MONTHS = new Set([1, 2, 3, 6, 12])

      if (!VALID_PLANS.has(meta.plan)) {
        console.error('[webhook] Invalid plan in metadata:', meta.plan)
        return NextResponse.json({ received: true }, { status: 200 })
      }

      const months = parseInt(meta.months ?? '1', 10)
      if (!VALID_MONTHS.has(months)) {
        console.error('[webhook] Invalid months in metadata:', meta.months)
        return NextResponse.json({ received: true }, { status: 200 })
      }

      await prisma.company.update({
        where: { id: meta.company_id },
        data: {
          plan: meta.plan as 'STARTER' | 'PRO' | 'AGENCY',
          trialEndsAt: null,
        },
      }).catch(() => null)
    }
  }

  return NextResponse.json({ received: true }, { status: 200 })
}
