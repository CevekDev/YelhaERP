import { CreditCard, FileCheck, Package, Receipt } from 'lucide-react'
import { formatDA } from '@/lib/algerian/format'
import Link from 'next/link'



interface KPIsProps {
  unpaidTotal: number
  unpaidCount: number
  lowStockCount: number
  pendingQuotes?: number
  pendingExpenses?: number
}

export function DashboardKPIs({
  unpaidTotal,
  unpaidCount,
  lowStockCount,
  pendingQuotes = 0,
  pendingExpenses = 0,
}: KPIsProps) {
  const alertTiles = [
    {
      show: unpaidTotal > 0,
      title: 'Impayés',
      value: formatDA(unpaidTotal),
      sub: `${unpaidCount} facture${unpaidCount > 1 ? 's' : ''}`,
      icon: CreditCard,
      color: 'text-amber-600',
      bg: 'bg-amber-50 dark:bg-amber-950/30',
      href: '/dashboard/invoices',
    },
    {
      show: pendingQuotes > 0,
      title: 'Devis en attente',
      value: String(pendingQuotes),
      sub: 'Réponse client attendue',
      icon: FileCheck,
      color: 'text-violet-600',
      bg: 'bg-violet-50 dark:bg-violet-950/30',
      href: '/dashboard/quotes',
    },
    {
      show: lowStockCount > 0,
      title: 'Stock en alerte',
      value: String(lowStockCount),
      sub: 'Produit(s) sous le seuil',
      icon: Package,
      color: 'text-red-600',
      bg: 'bg-red-50 dark:bg-red-950/30',
      href: '/dashboard/stock',
    },
    {
      show: pendingExpenses > 0,
      title: 'Dépenses à valider',
      value: String(pendingExpenses),
      sub: "En attente d'approbation",
      icon: Receipt,
      color: 'text-orange-600',
      bg: 'bg-orange-50 dark:bg-orange-950/30',
      href: '/dashboard/expenses',
    },
  ].filter(t => t.show)

  if (alertTiles.length === 0) return null

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {alertTiles.map(t => (
        <Link key={t.title} href={t.href} className="block">
          <div className="border rounded-lg p-3 bg-card hover:shadow-sm transition-shadow flex flex-col gap-2">
            <div className={`w-8 h-8 rounded-md flex items-center justify-center ${t.bg}`}>
              <t.icon className={`w-4 h-4 ${t.color}`} />
            </div>
            <p className="text-2xl font-bold tabular-nums">{t.value}</p>
            <div>
              <p className="text-xs font-medium">{t.title}</p>
              {'sub' in t && <p className="text-[11px] text-muted-foreground leading-tight">{t.sub}</p>}
            </div>
          </div>
        </Link>
      ))}
    </div>
  )
}
