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

interface SidebarProps { companyName: string; plan: string; businessType: string }

// Visibility rules by business type
// RC = formal company, AE = auto-entrepreneur, NONE = unregistered
const HIDDEN_ITEMS: Record<string, string[]> = {
  AE:   ['/dashboard/payroll', '/dashboard/accounting', '/dashboard/tax'],
  NONE: ['/dashboard/payroll', '/dashboard/accounting', '/dashboard/tax', '/dashboard/suppliers', '/dashboard/integrations'],
}

export function Sidebar({ companyName, plan, businessType }: SidebarProps) {
  const pathname = usePathname()
  const { t } = useT()

  const allNavItems = [
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

  const hidden = HIDDEN_ITEMS[businessType] ?? []
  const navItems = allNavItems.filter(item => !hidden.includes(item.href))

  const planColors: Record<string, string> = {
    TRIAL:   'bg-amber-100 text-amber-800',
    STARTER: 'bg-blue-100 text-blue-800',
    PRO:     'bg-yelha-100 text-yelha-800',
    AGENCY:  'bg-purple-100 text-purple-800',
  }

  // Business type badge
  const btLabel: Record<string, { label: string; color: string }> = {
    RC:   { label: 'Société (RC)', color: 'bg-blue-50 text-blue-700 border border-blue-200' },
    AE:   { label: 'Auto-entrepreneur', color: 'bg-orange-50 text-orange-700 border border-orange-200' },
    NONE: { label: 'Non enregistré', color: 'bg-slate-100 text-slate-600 border border-slate-200' },
  }
  const bt = btLabel[businessType] ?? btLabel.NONE

  return (
    <aside className="fixed top-0 h-screen w-[240px] flex flex-col bg-white border-r border-slate-100 z-40 shadow-sm left-0">
      {/* Logo header with gradient */}
      <div className="px-4 h-16 flex items-center gap-3 shrink-0 bg-gradient-to-r from-yelha-700 to-yelha-500">
        <div className="w-8 h-8 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center shrink-0 border border-white/30">
          <TrendingUp className="w-4 h-4 text-white" />
        </div>
        <div className="overflow-hidden">
          <p className="font-bold text-sm text-white leading-none truncate">YelhaERP</p>
          <p className="text-xs text-white/70 truncate mt-0.5">{companyName}</p>
        </div>
      </div>

      {/* Plan + business type */}
      <div className="px-3 py-2 border-b border-slate-100 space-y-1">
        <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold', planColors[plan] ?? planColors.TRIAL)}>
          {plan}
        </span>
        <div className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ml-1.5', bt.color)}>
          {bt.label}
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-2 px-2">
        {navItems.map(item => {
          const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href + '/'))
          return (
            <Link key={item.href} href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all mb-0.5',
                active
                  ? 'bg-gradient-to-r from-yelha-500 to-yelha-400 text-white shadow-sm shadow-yelha-500/20'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
              )}>
              <item.icon className={cn('h-4 w-4 shrink-0', active ? 'text-white' : 'text-slate-400')} />
              <span className="flex-1 truncate">{t(item.key)}</span>
              {item.badge && (
                <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-bold', active ? 'bg-white/25 text-white' : 'bg-yelha-100 text-yelha-700')}>
                  {item.badge}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      <div className="p-3 border-t border-slate-100">
        <button
          className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-500 hover:bg-red-50 hover:text-red-600 transition-all"
          onClick={() => signOut({ callbackUrl: '/login' })}>
          <LogOut className="h-4 w-4 shrink-0" />
          {t('sidebar.logout')}
        </button>
      </div>
    </aside>
  )
}
