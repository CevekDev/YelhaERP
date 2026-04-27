import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getTenantContext, requireRole } from '@/lib/security/tenant'
import { apiError, apiSuccess, rateLimitResponse } from '@/lib/security/api-response'
import { rateLimit, AUTHENTICATED_RATE_LIMIT } from '@/lib/security/ratelimit'

const wooConfigSchema = z.object({
  siteUrl: z.string().url(),
  consumerKey: z.string().min(1),
  consumerSecret: z.string().min(1),
})

export async function GET(_req: NextRequest) {
  try {
    const ctx = await getTenantContext()
    const integration = await prisma.integration.findUnique({
      where: { companyId_type: { companyId: ctx.companyId, type: 'WOOCOMMERCE' } },
      select: { id: true, isActive: true, lastSync: true, config: true },
    })
    if (!integration) return apiSuccess(null)
    return apiSuccess({
      ...integration,
      config: { siteUrl: (integration.config as Record<string, string>).siteUrl },
    })
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'UNAUTHORIZED') return apiError('Non authentifié', 401)
    return apiError('Erreur serveur', 500)
  }
}

export async function POST(req: NextRequest) {
  const { success, reset } = await rateLimit(req, AUTHENTICATED_RATE_LIMIT)
  if (!success) return rateLimitResponse(reset)
  try {
    const ctx = await getTenantContext()
    requireRole(ctx.role, 'ADMIN')
    const body = await req.json().catch(() => null)
    const parsed = wooConfigSchema.safeParse(body)
    if (!parsed.success) return apiError('Configuration invalide', 422)

    // Tester la connexion WooCommerce
    const authHeader = Buffer.from(`${parsed.data.consumerKey}:${parsed.data.consumerSecret}`).toString('base64')
    const testUrl = `${parsed.data.siteUrl.replace(/\/$/, '')}/wp-json/wc/v3/system_status`
    const testRes = await fetch(testUrl, {
      headers: { Authorization: `Basic ${authHeader}` },
    }).catch(() => null)

    if (!testRes?.ok) return apiError('Connexion WooCommerce échouée. Vérifiez l\'URL et les clés.', 400)

    await prisma.integration.upsert({
      where: { companyId_type: { companyId: ctx.companyId, type: 'WOOCOMMERCE' } },
      update: { config: parsed.data, isActive: true },
      create: { companyId: ctx.companyId, type: 'WOOCOMMERCE', config: parsed.data, isActive: true },
    })
    return apiSuccess({ siteUrl: parsed.data.siteUrl })
  } catch (e: unknown) {
    if (e instanceof Error) {
      if (e.message === 'UNAUTHORIZED') return apiError('Non authentifié', 401)
      if (e.message === 'FORBIDDEN') return apiError('Accès refusé', 403)
    }
    return apiError('Erreur serveur', 500)
  }
}
