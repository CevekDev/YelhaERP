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
      // Subscription payment — upgrade company plan
      await prisma.company.update({
        where: { id: meta.company_id },
        data: {
          plan: meta.plan as 'STARTER' | 'PRO' | 'AGENCY',
          // Reset trial end date when upgrading
          trialEndsAt: null,
        },
      }).catch(() => null)
    }
  }

  return NextResponse.json({ received: true }, { status: 200 })
}
