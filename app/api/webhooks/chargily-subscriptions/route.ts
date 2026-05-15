import crypto from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

interface ChargilyPayload {
  type?: string
  data?: {
    id?: string
    amount?: number
    status?: string
    metadata?: {
      type?: string
      subscriptionId?: string
      companyId?: string
    }
  }
}

function verifySignature(body: string, signature: string | null, secret: string): boolean {
  if (!signature) return false
  try {
    const computed = crypto.createHmac('sha256', secret).update(body).digest('hex')
    const a = Buffer.from(computed)
    const b = Buffer.from(signature)
    if (a.length !== b.length) return false
    return crypto.timingSafeEqual(a, b)
  } catch {
    return false
  }
}

function computeNextBilling(start: Date, interval: string, count: number): Date {
  const next = new Date(start)
  switch (interval) {
    case 'DAILY':     next.setDate(start.getDate() + count); break
    case 'WEEKLY':    next.setDate(start.getDate() + count * 7); break
    case 'MONTHLY':   next.setMonth(start.getMonth() + count); break
    case 'QUARTERLY': next.setMonth(start.getMonth() + count * 3); break
    case 'YEARLY':    next.setFullYear(start.getFullYear() + count); break
  }
  return next
}

export async function POST(req: NextRequest) {
  // Lire le body brut pour la signature
  const body = await req.text()
  let payload: ChargilyPayload
  try { payload = JSON.parse(body) as ChargilyPayload }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const meta = payload.data?.metadata
  if (!meta || meta.type !== 'sub_renewal' || !meta.subscriptionId || !meta.companyId) {
    // Pas pour nous, on ignore proprement
    return NextResponse.json({ ignored: true }, { status: 200 })
  }

  const sub = await prisma.subscription.findFirst({
    where: { id: meta.subscriptionId, companyId: meta.companyId },
    include: {
      plan: true,
      company: { include: { subscriptionSettings: true } },
    },
  })
  if (!sub) return NextResponse.json({ error: 'Subscription not found' }, { status: 404 })

  // Vérification signature avec la clé secrète de la company
  const secret = sub.company.subscriptionSettings?.chargilyKey
  if (!secret) return NextResponse.json({ error: 'No Chargily secret configured' }, { status: 400 })

  const signature = req.headers.get('signature')
  if (!verifySignature(body, signature, secret)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 403 })
  }

  // Traitement par type d'événement
  const eventType = payload.type ?? ''
  const dataStatus = payload.data?.status ?? ''

  const isPaid =
    eventType === 'checkout.paid' ||
    dataStatus === 'paid' ||
    dataStatus === 'completed'

  if (!isPaid) {
    // On n'enregistre PAS les paiements en pending — on ignore juste
    return NextResponse.json({ ignored: true, reason: 'not_paid' }, { status: 200 })
  }

  // Activer + étendre nextBilling
  const now = new Date()
  const baseDate = sub.nextBilling && sub.nextBilling > now ? sub.nextBilling : now
  const newNextBilling = computeNextBilling(baseDate, sub.plan.interval, sub.plan.intervalCount)

  await prisma.subscription.update({
    where: { id: sub.id },
    data: {
      status: 'ACTIVE',
      nextBilling: newNextBilling,
      // Reset des anti-spam pour permettre un nouveau cycle
      lastRenewalReminderAt: null,
      lastTrialEndReminderAt: null,
    },
  })

  return NextResponse.json({ success: true, subscriptionId: sub.id, nextBilling: newNextBilling }, { status: 200 })
}
