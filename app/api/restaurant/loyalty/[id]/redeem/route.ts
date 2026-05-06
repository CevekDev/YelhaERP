import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getTenantContext, requireRole } from '@/lib/security/tenant'
import { apiError, apiSuccess, rateLimitResponse } from '@/lib/security/api-response'
import { rateLimit, AUTHENTICATED_RATE_LIMIT } from '@/lib/security/ratelimit'

const redeemSchema = z.object({
  points: z.number().int().positive(),
  orderId: z.string().cuid().optional(),
  description: z.string().max(255).optional(),
})

function calculateTier(totalPoints: number): 'STANDARD' | 'SILVER' | 'GOLD' | 'VIP' {
  if (totalPoints >= 10000) return 'VIP'
  if (totalPoints >= 5000) return 'GOLD'
  if (totalPoints >= 1000) return 'SILVER'
  return 'STANDARD'
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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

  const client = await prisma.loyaltyClient.findFirst({
    where: { id: params.id, companyId: ctx.companyId },
  })
  if (!client) return apiError('Client introuvable', 404)

  let body
  try {
    body = redeemSchema.parse(await req.json())
  } catch (e) {
    return apiError('Données invalides', 400, e)
  }

  if (client.points < body.points) {
    return apiError('Points insuffisants', 400)
  }

  const newPoints = client.points - body.points
  const newTier = calculateTier(newPoints)

  const result = await prisma.$transaction(async (tx) => {
    const updatedClient = await tx.loyaltyClient.update({
      where: { id: params.id },
      data: {
        points: { decrement: body.points },
        tier: newTier,
      },
    })

    const transaction = await tx.loyaltyTransaction.create({
      data: {
        clientId: params.id,
        type: 'REDEEMED',
        points: -body.points,
        description: body.description ?? `Utilisation de ${body.points} points`,
        orderId: body.orderId,
      },
    })

    return { client: updatedClient, transaction }
  })

  return apiSuccess(result, 201)
}
