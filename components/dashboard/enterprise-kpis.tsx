import Link from 'next/link'
import { Users, ShoppingCart, Factory, Calendar, FolderKanban, FileCheck } from 'lucide-react'

interface Props {
  crmLeads: number
  purchaseOrders: number
  productionOrders: number
  leaveRequests: number
  activeProjects: number
  unmatchedInvoices: number
}

const tiles = (p: Props) => [
  { label: 'Leads CRM', value: p.crmLeads, href: '/dashboard/crm/pipeline', icon: Users, color: 'text-violet-500', bg: 'bg-violet-50 dark:bg-violet-950/30' },
  { label: 'Commandes fournisseurs', value: p.purchaseOrders, href: '/dashboard/purchases/orders', icon: ShoppingCart, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-950/30' },
  { label: 'OF en production', value: p.productionOrders, href: '/dashboard/production/orders', icon: Factory, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-950/30' },
  { label: 'Congés à valider', value: p.leaveRequests, href: '/dashboard/hr/leaves', icon: Calendar, color: 'text-rose-500', bg: 'bg-rose-50 dark:bg-rose-950/30' },
  { label: 'Projets actifs', value: p.activeProjects, href: '/dashboard/projects', icon: FolderKanban, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
  { label: 'Factures non matchées', value: p.unmatchedInvoices, href: '/dashboard/purchases/invoices', icon: FileCheck, color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-950/30' },
]

export function EnterpriseKPIs(props: Props) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {tiles(props).map(t => (
        <Link key={t.label} href={t.href}
          className="border rounded-lg p-3 flex flex-col gap-2 hover:shadow-sm transition-shadow bg-card group">
          <div className={`w-8 h-8 rounded-md flex items-center justify-center ${t.bg}`}>
            <t.icon className={`w-4 h-4 ${t.color}`} />
          </div>
          <div className="text-2xl font-bold tabular-nums">{t.value}</div>
          <div className="text-xs text-muted-foreground leading-tight">{t.label}</div>
        </Link>
      ))}
    </div>
  )
}
