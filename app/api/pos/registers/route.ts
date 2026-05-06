import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { getTenantContext, requireRole } from '@/lib/security/tenant'
import { apiSuccess, apiError } from '@/lib/security/api-response'

const registerSchema = z.object({
  name: z.string().min(1).max(100).trim(),
})

export async function GET(_req: NextRequest) {
  const ctx = await getTenantContext()
  if (!ctx) return apiError('Non autorisé', 401)
  const registers = await prisma.posRegister.findMany({
    where: { companyId: ctx.companyId, isActive: true },
    orderBy: { createdAt: 'asc' },
  })
  return apiSuccess(registers)
}

export async function POST(req: NextRequest) {
  const ctx = await getTenantContext()
  if (!ctx) return apiError('Non autorisé', 401)
  requireRole(ctx.role, 'ADMIN')
  let body: unknown
  try { body = await req.json() } catch { return apiError('Corps invalide', 400) }
  const parsed = registerSchema.safeParse(body)
  if (!parsed.success) return apiError('Données invalides', 400)
  const register = await prisma.posRegister.create({
    data: { companyId: ctx.companyId, name: parsed.data.name },
  })
  return apiSuccess(register, 201)
}
