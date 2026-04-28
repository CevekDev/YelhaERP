'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, FileText, Users, Truck, Package, BarChart3,
  Calculator, Receipt, Bot, Settings, LogOut, TrendingUp, ShoppingBag,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { useT } from '@/lib/i18n'

interface SidebarProps { companyName: string; plan: string }

export function Sidebar({ companyName, plan }: SidebarProps) {
  const pathname = usePathname()
  const { t, dir } = useT()

  const navItems = [
    { href: '/dashboard',              key: 'sidebar.dashboard',     icon: LayoutDashboard },
    { href: '/dashboard/invoices',     key: 'sidebar.invoices',      icon: FileText },
    { href: '/dashboard/clients',      key: 'sidebar.clients',       icon: Users },
    { href: '/dashboard/suppliers',    key: 'sidebar.suppliers',     icon: Truck },
    { href: '/dashboard/products',     key: 'sidebar.products',      icon: Package },
    { href: '/dashboard/stock',        key: 'sidebar.stock',         icon: BarChart3 },
    { href: '/dashboard/payroll',      key: 'sidebar.payroll',       icon: Calculator },
    { href: '/dashboard/accounting',   key: 'sidebar.accounting',    icon: Receipt },
    { href: '/dashboard/tax',          key: 'sidebar.tax',           icon: TrendingUp },
    { href: '/dashboard/integrations', key: 'sidebar.integrations',  icon: ShoppingBag },
    { href: '/dashboard/ai',           key: 'sidebar.ai',            icon: Bot, badge: 'IA' },
    { href: '/dashboard/settings',     key: 'sidebar.settings',      icon: Settings },
  ]

  const planColors: Record<string, string> = {
    TRIAL:   'bg-amber-100 text-amber-800',
    STARTER: 'bg-blue-100 text-blue-800',
    PRO:     'bg-yelha-100 text-yelha-800',
    AGENCY:  'bg-purple-100 text-purple-800',
  }

  const isRTL = dir === 'rtl'

  return (
    <aside className={cn(
      'fixed top-0 h-screen w-[240px] flex flex-col border-r bg-card z-40',
      isRTL ? 'right-0 border-r-0 border-l' : 'left-0',
    )}>
      <div className="flex items-center gap-2 px-4 h-16 border-b shrink-0">
        <div className="w-8 h-8 bg-yelha-500 rounded-lg flex items-center justify-center shrink-0">
          <TrendingUp className="w-4 h-4 text-white" />
        </div>
        <div className="overflow-hidden">
          <p className="font-bold text-sm text-yelha-700 leading-none truncate">YelhaERP</p>
          <p className="text-xs text-muted-foreground truncate mt-0.5">{companyName}</p>
        </div>
      </div>

      <div className="px-4 py-2">
        <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', planColors[plan] ?? planColors.TRIAL)}>
          {t('sidebar.plan')} {plan}
        </span>
      </div>

      <Separator />

      <nav className="flex-1 overflow-y-auto py-2 px-2">
        {navItems.map(item => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link key={item.href} href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors mb-0.5',
                isRTL && 'flex-row-reverse',
                active ? 'bg-yelha-500 text-white' : 'text-muted-foreground hover:bg-accent hover:text-foreground',
              )}>
              <item.icon className="h-4 w-4 shrink-0" />
              <span className="flex-1 truncate">{t(item.key)}</span>
              {item.badge && <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4">{item.badge}</Badge>}
            </Link>
          )
        })}
      </nav>

      <Separator />

      <div className="p-3">
        <Button variant="ghost" size="sm"
          className={cn('w-full text-muted-foreground hover:text-destructive', isRTL ? 'flex-row-reverse justify-end' : 'justify-start')}
          onClick={() => signOut({ callbackUrl: '/login' })}>
          <LogOut className={cn('h-4 w-4', isRTL ? 'ml-3' : 'mr-3')} />
          {t('sidebar.logout')}
        </Button>
      </div>
    </aside>
  )
}
