import { prisma } from '@/lib/prisma'

/**
 * Vérifie si une company a accès à YelhaSubs.
 * - true si l'abonnement YelhaSub est ACTIVE
 * - true si on est dans la période d'essai TRIAL non-expirée
 * - false sinon (EXPIRED, CANCELLED, PAST_DUE, PAUSED, pas d'abonnement)
 */
export async function canAccessSubs(companyId: string): Promise<boolean> {
  const sub = await prisma.yelhaSubscription.findUnique({ where: { companyId } })
  if (!sub) return false
  const now = new Date()
  if (sub.status === 'ACTIVE') return sub.currentPeriodEnd > now
  if (sub.status === 'TRIAL') return !!sub.trialEndsAt && sub.trialEndsAt > now
  return false
}
