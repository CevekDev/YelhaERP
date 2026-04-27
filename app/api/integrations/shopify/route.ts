import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getTenantContext, requireRole } from '@/lib/security/tenant'
import { apiError, apiSuccess, rateLimitResponse } from '@/lib/security/api-response'
import { rateLimit, AUTHENTICATED_RATE_LIMIT } from '@/lib/security/ratelimit'

const shopifyConfigSchema = z.object({
  shopDomain: z.string().min(1).regex(/^[a-z0-9-]+\.myshopify\.com$/, 'Domaine Shopify invalide'),
  accessToken: z.string().min(10),
  webhookSecret: z.string().min(10).optional(),
})

export async function GET(_req: NextRequest) {
  try {
    const ctx = await getTenantContext()
    const integration = await prisma.integration.findUnique({
      where: { companyId_type: { companyId: ctx.companyId, type: 'SHOPIFY' } },
      select: { id: true, isActive: true, lastSync: true, config: true },
    })
    if (!integration) return apiSuccess(null)
    // Masquer le token dans la réponse
    const { config } = integration
    return apiSuccess({
      ...integration,
      config: { shopDomain: (config as Record<string, string>).shopDomain },
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
    const parsed = shopifyConfigSchema.safeParse(body)
    if (!parsed.success) return apiError('Configuration invalide', 422)

    // Tester la connexion Shopify
    const testRes = await fetch(
      `https://${parsed.data.shopDomain}/admin/api/2024-01/shop.json`,
      { headers: { 'X-Shopify-Access-Token': parsed.data.accessToken } }
    ).catch(() => null)

    if (!testRes?.ok) return apiError('Impossible de se connecter à Shopify. Vérifiez vos credentials.', 400)

    const integration = await prisma.integration.upsert({
      where: { companyId_type: { companyId: ctx.companyId, type: 'SHOPIFY' } },
      update: { config: parsed.data, isActive: true },
      create: { companyId: ctx.companyId, type: 'SHOPIFY', config: parsed.data, isActive: true },
    })
    return apiSuccess({ id: integration.id, shopDomain: parsed.data.shopDomain })
  } catch (e: unknown) {
    if (e instanceof Error) {
      if (e.message === 'UNAUTHORIZED') return apiError('Non authentifié', 401)
      if (e.message === 'FORBIDDEN') return apiError('Accès refusé', 403)
    }
    return apiError('Erreur serveur', 500)
  }
}
