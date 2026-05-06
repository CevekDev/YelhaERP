import { prisma } from '@/lib/prisma'
import { isAppIncluded, type AppId } from '@/lib/pricing/config'

const CORE_APPS: AppId[] = ['invoices', 'quotes', 'clients', 'stock', 'expenses']

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

  // Trial apps selected
  if (sub.status === 'TRIAL' && sub.trialApps.includes(appId)) return true

  return false
}
