import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getTenantContext, requireRole } from '@/lib/security/tenant'
import { apiError, apiSuccess, rateLimitResponse } from '@/lib/security/api-response'
import { rateLimit, AUTHENTICATED_RATE_LIMIT } from '@/lib/security/ratelimit'

const createClientSchema = z.object({
  name: z.string().min(1).max(100),
  phone: z.string().min(1).max(30),
  email: z.string().email().optional().nullable(),
})

export async function GET(req: NextRequest) {
  const rl = await rateLimit(req, AUTHENTICATED_RATE_LIMIT)
  if (!rl.success) return rateLimitResponse(rl.reset)

  let ctx
  try {
    ctx = await getTenantContext()
  } catch (e) {
    if (e instanceof Error && e.message === 'UNAUTHORIZED') return apiError('Non authentifié', 401)
    throw e
  }

  const { searchParams } = new URL(req.url)
  const search = searchParams.get('search')

  const clients = await prisma.loyaltyClient.findMany({
    where: {
      companyId: ctx.companyId,
      isActive: true,
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { phone: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    },
    include: { _count: { select: { orders: true } } },
    orderBy: { joinedAt: 'desc' },
  })

  return apiSuccess(clients)
}

export async function POST(req: NextRequest) {
  const rl = await rateLimit(req, AUTHENTICATED_RATE_LIMIT)
  if (!rl.success) return rateLimitResponse(rl.reset)

  let ctx
  try {
    ctx = await getTenantContext()
  } catch (e) {
    if (e instanceof Error && e.message === 'UNAUTHORIZED') return apiError('Non authentifié', 401)
    throw e
  }

  try {
    requireRole(ctx.role, 'EMPLOYEE')
  } catch {
    return apiError('Accès refusé', 403)
  }

  let body
  try {
    body = createClientSchema.parse(await req.json())
  } catch (e) {
    return apiError('Données invalides', 400, e)
  }

  // Check for duplicate phone in this company
  const existing = await prisma.loyaltyClient.findFirst({
    where: { companyId: ctx.companyId, phone: body.phone },
  })
  if (existing) return apiError('Un client avec ce numéro existe déjà', 409)

  const qrCode = `LYL-${ctx.companyId.slice(-8)}-${Date.now()}`

  const client = await prisma.loyaltyClient.create({
    data: {
      companyId: ctx.companyId,
      name: body.name,
      phone: body.phone,
      email: body.email,
      qrCode,
    },
    include: { _count: { select: { orders: true } } },
  })

  return apiSuccess(client, 201)
}
