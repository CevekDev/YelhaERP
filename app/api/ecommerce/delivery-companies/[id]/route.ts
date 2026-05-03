import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { getTenantContext } from '@/lib/security/tenant'
import { apiSuccess, apiError } from '@/lib/security/api-response'

const patchSchema = z.object({
  name:          z.string().min(1).max(100).optional(),
  isDefault:     z.boolean().optional(),
  isActive:      z.boolean().optional(),
  apiKey:        z.string().max(500).optional(),
  apiSecret:     z.string().max(500).optional(),
  webhookSecret: z.string().max(500).optional(),
})

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await getTenantContext()
  if (!ctx) return apiError('Non autorisé', 401)

  const existing = await prisma.deliveryCompany.findFirst({
    where: { id: params.id, companyId: ctx.companyId },
  })
  if (!existing) return apiError('Société introuvable', 404)

  let body: unknown
  try { body = await req.json() } catch { return apiError('Corps invalide', 400) }
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return apiError('Données invalides', 400)

  const { isDefault, ...rest } = parsed.data

  const updated = await prisma.$transaction(async (tx) => {
    if (isDefault === true) {
      await tx.deliveryCompany.updateMany({
        where: { companyId: ctx.companyId, isDefault: true, id: { not: params.id } },
        data: { isDefault: false },
      })
    }
    return tx.deliveryCompany.update({
      where: { id: params.id },
      data: { ...rest, ...(isDefault !== undefined ? { isDefault } : {}) },
      include: { deliveryOptions: true },
    })
  })

  return apiSuccess(updated)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await getTenantContext()
  if (!ctx) return apiError('Non autorisé', 401)

  await prisma.deliveryCompany.update({
    where: { id: params.id },
    data: { isActive: false },
  })
  return apiSuccess({ deleted: true })
}
