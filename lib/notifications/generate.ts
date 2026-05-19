import { prisma } from '@/lib/prisma'
import { NotificationType } from '@prisma/client'

interface NotifInput {
  companyId: string
  type: NotificationType
  title: string
  message: string
  priority?: string
  actionUrl?: string
}

async function createIfNotDuplicate(n: NotifInput) {
  const existing = await prisma.notification.findFirst({
    where: {
      companyId: n.companyId,
      type: n.type,
      createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
    },
  })
  if (existing) return null
  return prisma.notification.create({ data: { ...n, priority: n.priority ?? 'NORMAL' } })
}

/**
 * YelhaSubs notifications — focusées sur les abonnements clients.
 * (Les modules ERP — factures/devis/stock — ont été supprimés.)
 */
export async function generateNotificationsForCompany(companyId: string) {
  const now = new Date()
  const generated: string[] = []

  // Abonnements clients qui arrivent à échéance dans <3 jours
  const in3days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)
  const expiringSubs = await prisma.subscription.count({
    where: {
      companyId,
      status: { in: ['ACTIVE', 'TRIAL'] },
      nextBilling: { lte: in3days, gte: now },
    },
  })
  if (expiringSubs > 0) {
    const n = await createIfNotDuplicate({
      companyId,
      type: NotificationType.SUBSCRIPTION_EXPIRING,
      title: `${expiringSubs} abonnement${expiringSubs > 1 ? 's' : ''} à renouveler`,
      message: `${expiringSubs} de vos clients ont un abonnement qui expire dans moins de 3 jours.`,
      priority: 'NORMAL',
      actionUrl: '/dashboard/subscriptions',
    })
    if (n) generated.push(n.id)
  }

  // Abonnements EXPIRED (paiement en retard)
  const pastDue = await prisma.subscription.count({
    where: { companyId, status: 'EXPIRED' },
  })
  if (pastDue > 0) {
    const n = await createIfNotDuplicate({
      companyId,
      type: NotificationType.SUBSCRIPTION_EXPIRED,
      title: `${pastDue} abonnement${pastDue > 1 ? 's' : ''} en retard de paiement`,
      message: `${pastDue} abonnement${pastDue > 1 ? 's clients ont' : ' client a'} un paiement en retard.`,
      priority: 'HIGH',
      actionUrl: '/dashboard/subscriptions',
    })
    if (n) generated.push(n.id)
  }

  return generated
}
