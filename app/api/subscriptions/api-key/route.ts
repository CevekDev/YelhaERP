import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getTenantContext } from '@/lib/security/tenant'
import { apiSuccess, apiError } from '@/lib/security/api-response'
import { generateRawKey } from '@/lib/sub-api/auth'

const postSchema = z.object({
  name: z.string().max(100).optional(),
})

export async function GET() {
  const ctx = await getTenantContext()
  if (!ctx) return apiError('Non autorisé', 401)

  const keys = await prisma.subApiKey.findMany({
    where: { companyId: ctx.companyId, isActive: true },
    select: { id: true, name: true, keyPrefix: true, lastUsedAt: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  })
  return apiSuccess(keys)
}

export async function POST(req: NextRequest) {
  const ctx = await getTenantContext()
  if (!ctx) return apiError('Non autorisé', 401)

  let body: unknown = {}
  try { body = await req.json() } catch { /* nom optionnel */ }
  const parsed = postSchema.safeParse(body)
  if (!parsed.success) return apiError('Données invalides', 400)

  // Max 5 clés actives
  const activeCount = await prisma.subApiKey.count({
    where: { companyId: ctx.companyId, isActive: true },
  })
  if (activeCount >= 5) {
    return apiError('Limite atteinte : 5 clés actives maximum. Révoquez une clé existante.', 409)
  }

  const { rawKey, keyHash, keyPrefix } = generateRawKey()

  const created = await prisma.subApiKey.create({
    data: {
      companyId: ctx.companyId,
      name:      parsed.data.name || null,
      keyHash,
      keyPrefix,
    },
    select: { id: true, name: true, keyPrefix: true, createdAt: true },
  })

  // rawKey n'est renvoyée qu'une seule fois
  return apiSuccess({ ...created, key: rawKey }, 201)
}
