import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getTenantContext } from '@/lib/security/tenant'
import { apiError, apiSuccess, rateLimitResponse } from '@/lib/security/api-response'
import { rateLimit, AUTHENTICATED_RATE_LIMIT } from '@/lib/security/ratelimit'
import { TRIAL_ELIGIBLE_APPS, APPS, type AppId } from '@/lib/pricing/config'

const schema = z.object({
  apps: z
    .array(z.enum(Object.keys(APPS) as [AppId, ...AppId[]]))
    .length(3, 'Vous devez choisir exactement 3 applications'),
})

// CompanyModules fields that can be toggled
type ModuleField = keyof Omit<
  Parameters<typeof prisma.companyModules.upsert>[0]['create'],
  'companyId' | 'id' | 'createdAt' | 'updatedAt'
>

export async function POST(req: NextRequest) {
  try {
    const rl = await rateLimit(req, AUTHENTICATED_RATE_LIMIT)
    if (!rl.success) return rateLimitResponse(rl.reset)

    const { companyId } = await getTenantContext()

    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) return apiError('Données invalides', 422, parsed.error.flatten())

    const { apps } = parsed.data

    // Validate all apps are in TRIAL_ELIGIBLE_APPS
    const ineligible = apps.filter(a => !TRIAL_ELIGIBLE_APPS.includes(a as AppId))
    if (ineligible.length > 0) {
      return apiError(`Apps non éligibles à l'essai : ${ineligible.join(', ')}`, 422)
    }

    // Subscription must be in TRIAL status
    const sub = await prisma.yelhaSubscription.findUnique({ where: { companyId } })
    if (!sub) return apiError('Abonnement introuvable', 404)
    if (sub.status !== 'TRIAL') {
      return apiError('Les apps d\'essai ne peuvent être définies que pendant la période d\'essai', 422)
    }

    // Update trialApps
    const updated = await prisma.yelhaSubscription.update({
      where: { companyId },
      data: { trialApps: apps },
    })

    // Upsert CompanyModules to reflect chosen trial apps
    const moduleData: Record<string, boolean> = {}
    for (const appId of apps) {
      // Map AppId to CompanyModules field name (they match exactly in the schema)
      moduleData[appId] = true
    }

    await prisma.companyModules.upsert({
      where: { companyId },
      create: {
        companyId,
        ...moduleData,
      },
      update: moduleData,
    })

    return apiSuccess({ subscription: updated, trialApps: apps })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erreur'
    if (msg === 'UNAUTHORIZED') return apiError('Non authentifié', 401)
    return apiError('Erreur serveur', 500, err)
  }
}
