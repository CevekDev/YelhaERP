import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTenantContext } from '@/lib/security/tenant'
import { apiError, rateLimitResponse } from '@/lib/security/api-response'
import { rateLimit, AUTHENTICATED_RATE_LIMIT } from '@/lib/security/ratelimit'

const CHARGILY_BASE = process.env.CHARGILY_MODE === 'live'
  ? 'https://pay.chargily.net/api/v2'
  : 'https://pay.chargily.net/test/api/v2'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { success, reset } = await rateLimit(req, AUTHENTICATED_RATE_LIMIT)
  if (!success) return rateLimitResponse(reset)
  try {
    const ctx = await getTenantContext()
    const invoice = await prisma.invoice.findFirst({
      where: { id: params.id, companyId: ctx.companyId },
      include: { client: { select: { name: true, email: true, phone: true } } },
    })
    if (!invoice) return apiError('Facture introuvable', 404)
    if (invoice.status === 'PAID') return apiError('Facture déjà payée', 400)

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
    const token = invoice.portalToken

    const payload = {
      amount: Math.round(Number(invoice.total)),
      currency: 'dzd',
      success_url: `${appUrl}/portal/${token}?paid=1`,
      failure_url: `${appUrl}/portal/${token}?paid=0`,
      webhook_url: `${appUrl}/api/webhooks/chargily`,
      description: `Facture ${invoice.number}`,
      locale: 'ar',
      metadata: { invoice_id: params.id, portal_token: token ?? '' },
      customer: {
        name: invoice.client.name,
        email: invoice.client.email ?? undefined,
        phone: invoice.client.phone ?? undefined,
      },
    }

    const res = await fetch(`${CHARGILY_BASE}/checkouts`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.CHARGILY_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const err = await res.text()
      return apiError(`Chargily error: ${err}`, 502)
    }

    const data = await res.json()
    return NextResponse.json({ checkout_url: data.checkout_url })
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'UNAUTHORIZED') return apiError('Non autorisé', 401)
    return apiError('Erreur serveur', 500, e)
  }
}

// Public endpoint for portal (no auth) — used directly from portal page
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  // We allow unauthenticated checkout creation from the portal by token
  const token = req.nextUrl.searchParams.get('token')
  if (!token) return apiError('Token requis', 400)

  try {
    const invoice = await prisma.invoice.findFirst({
      where: { id: params.id, portalToken: token },
      include: { client: { select: { name: true, email: true, phone: true } } },
    })
    if (!invoice) return apiError('Facture introuvable', 404)
    if (invoice.status === 'PAID') return apiError('Facture déjà payée', 400)

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

    const payload = {
      amount: Math.round(Number(invoice.total)),
      currency: 'dzd',
      success_url: `${appUrl}/portal/${token}?paid=1`,
      failure_url: `${appUrl}/portal/${token}?paid=0`,
      webhook_url: `${appUrl}/api/webhooks/chargily`,
      description: `Facture ${invoice.number}`,
      locale: 'ar',
      metadata: { invoice_id: params.id, portal_token: token },
      customer: {
        name: invoice.client.name,
        email: invoice.client.email ?? undefined,
        phone: invoice.client.phone ?? undefined,
      },
    }

    const res = await fetch(`${CHARGILY_BASE}/checkouts`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.CHARGILY_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const err = await res.text()
      return apiError(`Chargily error: ${err}`, 502)
    }

    const data = await res.json()
    return NextResponse.json({ checkout_url: data.checkout_url })
  } catch (e: unknown) {
    return apiError('Erreur serveur', 500, e)
  }
}
