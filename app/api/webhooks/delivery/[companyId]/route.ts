import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

// Flexible status mapping: each company sends different status names
const STATUS_MAP: Record<string, string> = {
  // Generic
  'pending':           'PENDING',
  'confirmed':         'CONFIRMED',
  'picked_up':         'SHIPPED',
  'in_transit':        'SHIPPED',
  'out_for_delivery':  'OUT_FOR_DELIVERY',
  'delivered':         'DELIVERED',
  'undelivered':       'NO_ANSWER',
  'returned':          'RETURNED',
  'cancelled':         'CANCELLED',
  // Yalidine
  'pris en charge':    'CONFIRMED',
  'en cours':          'SHIPPED',
  'en livraison':      'OUT_FOR_DELIVERY',
  'livré':             'DELIVERED',
  'retour':            'RETURNED',
  // Maystro
  'RECEIVED_AT_WAREHOUSE': 'CONFIRMED',
  'OUT_FOR_DELIVERY':      'OUT_FOR_DELIVERY',
  'DELIVERED':             'DELIVERED',
  'RETURN_RECEIVED':       'RETURNED',
}

function mapStatus(rawStatus: string): string | null {
  const normalized = rawStatus.toLowerCase().trim()
  return STATUS_MAP[rawStatus] ?? STATUS_MAP[normalized] ?? null
}

export async function POST(req: NextRequest, { params }: { params: { companyId: string } }) {
  // Find the delivery company config
  const deliveryCompany = await prisma.deliveryCompany.findFirst({
    where: { id: params.companyId, isActive: true },
  })
  if (!deliveryCompany) {
    return NextResponse.json({ error: 'Company not found' }, { status: 404 })
  }

  const body = await req.text()

  // Verify webhook signature if secret is configured
  if (deliveryCompany.webhookSecret) {
    const sig = req.headers.get('x-signature') ?? req.headers.get('x-webhook-signature') ?? req.headers.get('x-hmac-sha256') ?? ''
    const expected = crypto.createHmac('sha256', deliveryCompany.webhookSecret).update(body).digest('hex')
    const sigBuf = Buffer.from(sig)
    const expectedBuf = Buffer.from(expected)
    const valid = sigBuf.length === expectedBuf.length && crypto.timingSafeEqual(sigBuf, expectedBuf)
    if (!valid) return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let payload: unknown
  try { payload = JSON.parse(body) } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Extract tracking number and status from payload (flexible structure)
  const p = payload as Record<string, unknown>
  const trackingNumber = (p.tracking_number ?? p.trackingNumber ?? p.barcode ?? p.id ?? '') as string
  const rawStatus      = (p.status ?? p.state ?? p.order_status ?? '') as string
  const externalId     = (p.id ?? p.order_id ?? p.orderId ?? trackingNumber) as string

  if (!trackingNumber && !externalId) {
    return NextResponse.json({ error: 'No tracking number' }, { status: 400 })
  }

  // Find matching order
  const order = await prisma.ecomOrder.findFirst({
    where: {
      companyId: deliveryCompany.companyId,
      OR: [
        { trackingNumber },
        { externalId: externalId },
      ],
    },
  })

  if (!order) {
    // Log unknown order silently
    return NextResponse.json({ received: true })
  }

  const mappedStatus = mapStatus(rawStatus)

  if (mappedStatus && mappedStatus !== order.status) {
    const tsMap: Record<string, string> = {
      CONFIRMED: 'confirmedAt', SHIPPED: 'shippedAt',
      DELIVERED: 'deliveredAt', RETURNED: 'returnedAt',
    }
    const tsField = tsMap[mappedStatus]

    await prisma.$transaction([
      prisma.ecomOrder.update({
        where: { id: order.id },
        data: {
          status:         mappedStatus as never,
          externalStatus: rawStatus,
          externalId:     externalId || order.externalId,
          ...(tsField ? { [tsField]: new Date() } : {}),
        },
      }),
      prisma.ecomStatusHistory.create({
        data: {
          orderId: order.id,
          status:  mappedStatus as never,
          note:    `Webhook ${deliveryCompany.name}: ${rawStatus}`,
          source:  'WEBHOOK',
        },
      }),
    ])
  }

  return NextResponse.json({ received: true })
}
