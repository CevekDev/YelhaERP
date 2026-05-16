import { prisma } from '@/lib/prisma'
import { isAppIncluded, type AppId } from '@/lib/pricing/config'

const CORE_APPS: AppId[] = ['invoices', 'quotes', 'clients', 'purchases', 'stock']

export async function canAccessApp(companyId: string, appId: AppId): Promise<boolean> {
  // Core apps always accessible, no subscription needed
  if (CORE_APPS.includes(appId)) return true

  const now = new Date()

  // Check AppSubscription (independent per-app payment)
  const appSub = await prisma.appSubscription.findUnique({
    where: { companyId_appId: { companyId, appId } },
  })
  if (appSub?.status === 'ACTIVE') return true
  if (appSub?.status === 'TRIAL' && appSub.trialEndsAt && appSub.trialEndsAt > now) return true

  // Check YelhaSubscription (global ERP subscription with bundled apps)
  const sub = await prisma.yelhaSubscription.findUnique({ where: { companyId } })
  if (!sub) return false

  // Expired or cancelled ERP subscription → deny
  if (sub.status === 'EXPIRED' || sub.status === 'CANCELLED') return false

  // Trial period ended → deny extra apps
  if (sub.status === 'TRIAL' && sub.trialEndsAt && sub.trialEndsAt < now) return false

  // Enterprise plan → everything
  if (sub.planId === 'enterprise') return true

  // Plan includes this app
  if (isAppIncluded(sub.planId as Parameters<typeof isAppIncluded>[0], appId)) return true

  // Extra apps purchased alongside ERP subscription
  if (sub.extraApps.includes(appId)) return true

  // App-specific trials granted within YelhaSubscription
  if (sub.trialApps.includes(appId)) {
    const appTrialsEndsAt = (sub.appTrialsEndsAt as Record<string, string> | null) ?? {}
    const trialEnd = appTrialsEndsAt[appId]
    if (trialEnd && new Date(trialEnd) > now) return true
    // Compat: no per-app date recorded → use global trial end
    if (!trialEnd && sub.status === 'TRIAL' && sub.trialEndsAt && sub.trialEndsAt > now) return true
  }

  return false
}
