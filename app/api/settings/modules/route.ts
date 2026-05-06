import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getTenantContext, requireRole } from '@/lib/security/tenant'
import { apiError, apiSuccess, rateLimitResponse } from '@/lib/security/api-response'
import { rateLimit, AUTHENTICATED_RATE_LIMIT } from '@/lib/security/ratelimit'

const patchSchema = z.object({
  crm: z.boolean().optional(),
  invoices: z.boolean().optional(),
  quotes: z.boolean().optional(),
  clients: z.boolean().optional(),
  suppliers: z.boolean().optional(),
  purchases: z.boolean().optional(),
  stock: z.boolean().optional(),
  accounting: z.boolean().optional(),
  hr: z.boolean().optional(),
  payroll: z.boolean().optional(),
  projects: z.boolean().optional(),
  production: z.boolean().optional(),
  pos: z.boolean().optional(),
  ecommerce: z.boolean().optional(),
  restaurant: z.boolean().optional(),
  subscriptions: z.boolean().optional(),
  tax: z.boolean().optional(),
  expenses: z.boolean().optional(),
})

export async function GET(req: NextRequest) {
  const { success, reset } = await rateLimit(req, AUTHENTICATED_RATE_LIMIT)
  if (!success) return rateLimitResponse(reset)

  try {
    const ctx = await getTenantContext()

    const modules = await prisma.companyModules.upsert({
      where: { companyId: ctx.companyId },
      update: {},
      create: { companyId: ctx.companyId },
    })

    return apiSuccess(modules)
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'UNAUTHORIZED') return apiError('Non authentifié', 401)
    return apiError('Erreur serveur', 500)
  }
}

export async function PATCH(req: NextRequest) {
  const { success, reset } = await rateLimit(req, AUTHENTICATED_RATE_LIMIT)
  if (!success) return rateLimitResponse(reset)

  try {
    const ctx = await getTenantContext()
    requireRole(ctx.role, 'OWNER')

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return apiError('Corps invalide', 400)
    }

    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) return apiError('Données invalides', 422, parsed.error.flatten())

    const modules = await prisma.companyModules.upsert({
      where: { companyId: ctx.companyId },
      update: parsed.data,
      create: { companyId: ctx.companyId, ...parsed.data },
    })

    return apiSuccess(modules)
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'UNAUTHORIZED') return apiError('Non authentifié', 401)
    if (e instanceof Error && e.message === 'FORBIDDEN') return apiError('Accès refusé', 403)
    return apiError('Erreur serveur', 500)
  }
}
