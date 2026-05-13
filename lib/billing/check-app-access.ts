import { prisma } from '@/lib/prisma'
import { isAppIncluded, type AppId } from '@/lib/pricing/config'

const CORE_APPS: AppId[] = ['invoices', 'quotes', 'clients', 'purchases', 'stock']

export async function canAccessApp(companyId: string, appId: AppId): Promise<boolean> {
  const sub = await prisma.yelhaSubscription.findUnique({
    where: { companyId },
  })

  if (!sub) return false

  // Trial expired → deny all non-core access
  if (sub.status === 'TRIAL') {
    const now = new Date()
    if (sub.trialEndsAt && sub.trialEndsAt < now) {
      return CORE_APPS.includes(appId)
    }
  }

  // Core apps always accessible
  if (CORE_APPS.includes(appId)) return true

  // Enterprise plan → everything
  if (sub.planId === 'enterprise') return true

  // Plan includes this app
  if (isAppIncluded(sub.planId as Parameters<typeof isAppIncluded>[0], appId)) return true

  // Extra apps purchased
  if (sub.extraApps.includes(appId)) return true

  // Trial apps — vérifier la date d'expiration par app
  if (sub.trialApps.includes(appId)) {
    const appTrialsEndsAt = (sub.appTrialsEndsAt as Record<string, string> | null) ?? {}
    const trialEnd = appTrialsEndsAt[appId]
    if (trialEnd && new Date(trialEnd) > new Date()) return true
    // Compat: essai global (compte créé avant le système per-app)
    if (!trialEnd && sub.status === 'TRIAL' && sub.trialEndsAt && sub.trialEndsAt > new Date()) return true
  }

  return false
}
