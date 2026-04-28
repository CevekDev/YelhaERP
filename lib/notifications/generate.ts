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

export async function generateNotificationsForCompany(companyId: string) {
  const now = new Date()
  const generated: string[] = []

  // 1. Overdue invoices
  const overdueInvoices = await prisma.invoice.count({
    where: {
      companyId,
      status: { notIn: ['PAID', 'CANCELLED'] },
      dueDate: { lt: now, not: null },
    },
  })
  if (overdueInvoices > 0) {
    const n = await createIfNotDuplicate({
      companyId,
      type: NotificationType.INVOICE_OVERDUE,
      title: `${overdueInvoices} facture${overdueInvoices > 1 ? 's' : ''} en retard`,
      message: `Vous avez ${overdueInvoices} facture${overdueInvoices > 1 ? 's' : ''} dont la date d'échéance est dépassée.`,
      priority: 'HIGH',
      actionUrl: '/dashboard/invoices',
    })
    if (n) generated.push(n.id)
  }

  // 2. Quotes expiring in 3 days
  const in3days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)
  const expiringQuotes = await prisma.quote.count({
    where: {
      companyId,
      status: 'SENT',
      expiryDate: { lte: in3days, gte: now },
    },
  })
  if (expiringQuotes > 0) {
    const n = await createIfNotDuplicate({
      companyId,
      type: NotificationType.QUOTE_EXPIRING,
      title: `${expiringQuotes} devis expire bientôt`,
      message: `${expiringQuotes} devis envoyé${expiringQuotes > 1 ? 's' : ''} expire${expiringQuotes > 1 ? 'nt' : ''} dans moins de 3 jours.`,
      priority: 'NORMAL',
      actionUrl: '/dashboard/quotes',
    })
    if (n) generated.push(n.id)
  }

  // 3. Low stock (stockQty <= stockAlert, only when stockAlert > 0)
  const lowStockProducts = await prisma.product.findMany({
    where: { companyId, isActive: true },
    select: { stockQty: true, stockAlert: true },
  })
  const lowStockCount = lowStockProducts.filter(p => Number(p.stockAlert) > 0 && Number(p.stockQty) <= Number(p.stockAlert)).length

  if (lowStockCount > 0) {
    const n = await createIfNotDuplicate({
      companyId,
      type: NotificationType.STOCK_ALERT,
      title: `${lowStockCount} produit${lowStockCount > 1 ? 's' : ''} en rupture de stock`,
      message: `${lowStockCount} produit${lowStockCount > 1 ? 's' : ''} ont atteint le seuil minimum de stock.`,
      priority: 'HIGH',
      actionUrl: '/dashboard/stock',
    })
    if (n) generated.push(n.id)
  }

  // 4. Cash flow warning: unpaid invoices > 30 days old
  const threshold = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const oldUnpaid = await prisma.invoice.aggregate({
    where: {
      companyId,
      status: { notIn: ['PAID', 'CANCELLED'] },
      issueDate: { lt: threshold },
    },
    _sum: { total: true },
    _count: true,
  })
  if (oldUnpaid._count > 0 && Number(oldUnpaid._sum.total ?? 0) > 0) {
    const n = await createIfNotDuplicate({
      companyId,
      type: NotificationType.CASHFLOW_WARNING,
      title: 'Alerte trésorerie',
      message: `${oldUnpaid._count} facture${oldUnpaid._count > 1 ? 's' : ''} impayée${oldUnpaid._count > 1 ? 's' : ''} depuis plus de 30 jours.`,
      priority: 'HIGH',
      actionUrl: '/dashboard/invoices',
    })
    if (n) generated.push(n.id)
  }

  return generated
}
