'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, FileText, ShoppingCart, Package, Calculator,
  UserCheck, Briefcase, Factory, Users, CreditCard, ShoppingBag,
  RefreshCw, UtensilsCrossed, Bot, Settings, Bell, LogOut,
  TrendingUp, Menu,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { useT } from '@/lib/i18n'

interface SidebarProps { companyName: string; businessType: string }

// Module-level navigation — mirrors the desktop top-nav tabs
const MODULE_NAV = [
  { id: 'dashboard',   href: '/dashboard',                   icon: LayoutDashboard, prefixes: [] as string[] },
  { id: 'ventes',      href: '/dashboard/invoices',          icon: FileText,        prefixes: ['/dashboard/invoices', '/dashboard/quotes', '/dashboard/clients'] },
  { id: 'achats',      href: '/dashboard/purchases/orders',  icon: ShoppingCart,    prefixes: ['/dashboard/purchases', '/dashboard/suppliers'] },
  { id: 'stocks',      href: '/dashboard/products',          icon: Package,         prefixes: ['/dashboard/products', '/dashboard/stock'] },
  { id: 'compta',      href: '/dashboard/accounting',        icon: Calculator,      prefixes: ['/dashboard/accounting', '/dashboard/tax', '/dashboard/expenses'] },
  { id: 'rh',          href: '/dashboard/payroll',           icon: UserCheck,       prefixes: ['/dashboard/payroll', '/dashboard/hr'] },
  { id: 'projets',     href: '/dashboard/projects',          icon: Briefcase,       prefixes: ['/dashboard/projects'] },
  { id: 'production',  href: '/dashboard/production/orders', icon: Factory,         prefixes: ['/dashboard/production'] },
  { id: 'crm',         href: '/dashboard/crm/pipeline',      icon: Users,           prefixes: ['/dashboard/crm'] },
  { id: 'pos',         href: '/dashboard/pos',               icon: CreditCard,      prefixes: ['/dashboard/pos'] },
  { id: 'ecommerce',   href: '/dashboard/ecommerce',         icon: ShoppingBag,     prefixes: ['/dashboard/ecommerce'] },
  { id: 'abonnements', href: '/dashboard/subscriptions',     icon: RefreshCw,       prefixes: ['/dashboard/subscriptions'] },
  { id: 'restaurant',  href: '/dashboard/restaurant',        icon: UtensilsCrossed, prefixes: ['/dashboard/restaurant'] },
] as const

// Modules to hide per business type
const MODULE_HIDE: Record<string, string[]> = {
  AE:   ['compta', 'rh'],
  NONE: ['compta', 'rh', 'achats'],
}

// Utility items (always visible)
const UTILITY_NAV = [
  { href: '/dashboard/notifications', key: 'sidebar.notifications', icon: Bell },
  { href: '/dashboard/ai',            key: 'sidebar.ai',            icon: Bot,  badge: 'IA' as const },
  { href: '/dashboard/settings',      key: 'sidebar.settings',      icon: Settings },
] as const

const BT_LABEL: Record<string, { label: string; color: string }> = {
  RC:   { label: 'Société (RC)',      color: 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800' },
  AE:   { label: 'Auto-entrepreneur', color: 'bg-orange-50 text-orange-700 border border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800' },
  NONE: { label: 'Non enregistré',    color: 'bg-muted text-muted-foreground border border-border' },
}

function isModuleActive(m: typeof MODULE_NAV[number], pathname: string): boolean {
  if (m.id === 'dashboard') return pathname === '/dashboard'
  return m.prefixes.some(p => pathname === p || pathname.startsWith(p + '/'))
}

function SidebarContent({ companyName, businessType, onNavigate }: SidebarProps & { onNavigate?: () => void }) {
  const pathname = usePathname()
  const { t } = useT()
  const { data: session } = useSession()

  const bt = session?.user?.businessType ?? businessType
  const cn_ = session?.user?.companyName ?? companyName

  const hiddenModules = MODULE_HIDE[bt] ?? []
  const visibleModules = MODULE_NAV.filter(m => !hiddenModules.includes(m.id))
  const btInfo = BT_LABEL[bt] ?? BT_LABEL.NONE

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Logo header */}
      <div className="px-4 h-16 flex items-center gap-3 shrink-0 bg-primary">
        <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center shrink-0 border border-white/30">
          <TrendingUp className="w-4 h-4 text-white" />
        </div>
        <div className="overflow-hidden">
          <p className="font-bold text-sm text-white leading-none truncate">YelhaERP</p>
          <p className="text-xs text-white/70 truncate mt-0.5">{cn_}</p>
        </div>
      </div>

      {/* Business type badge */}
      <div className="px-3 py-2 border-b border-border">
        <div className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', btInfo.color)}>
          {btInfo.label}
        </div>
      </div>

      {/* Module nav */}
      <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
        {visibleModules.map(m => {
          const active = isModuleActive(m, pathname)
          return (
            <Link
              key={m.href}
              href={m.href}
              onClick={onNavigate}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all',
                active
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
              )}
            >
              <m.icon className={cn('h-4 w-4 shrink-0', active ? 'text-primary-foreground' : 'text-muted-foreground')} />
              <span className="flex-1 truncate">{t('modules.' + m.id)}</span>
            </Link>
          )
        })}

        {/* Divider before utility items */}
        <div className="my-2 border-t border-border" />

        {UTILITY_NAV.map(item => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all',
                active
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
              )}
            >
              <item.icon className={cn('h-4 w-4 shrink-0', active ? 'text-primary-foreground' : 'text-muted-foreground')} />
              <span className="flex-1 truncate">{t(item.key)}</span>
              {'badge' in item && item.badge && (
                <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-bold', active ? 'bg-white/25 text-white' : 'bg-yelha-100 text-yelha-700 dark:bg-yelha-900/30 dark:text-yelha-400')}>
                  {item.badge}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-border">
        <button
          className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all"
          onClick={() => signOut({ callbackUrl: '/login' })}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {t('sidebar.logout')}
        </button>
      </div>
    </div>
  )
}

// Desktop sidebar — not rendered in layout, kept for potential future use
export function Sidebar(props: SidebarProps) {
  return (
    <aside className="hidden md:flex fixed top-0 h-screen w-[240px] flex-col bg-background border-r border-border z-40 left-0">
      <SidebarContent {...props} />
    </aside>
  )
}

// Mobile hamburger trigger
export function MobileSidebarTrigger() {
  const [open, setOpen] = useState(false)
  const { data: session } = useSession()

  const companyName = session?.user?.companyName ?? ''
  const businessType = session?.user?.businessType ?? 'RC'

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="p-0 w-[240px]">
        <SidebarContent
          companyName={companyName}
          businessType={businessType}
          onNavigate={() => setOpen(false)}
        />
      </SheetContent>
    </Sheet>
  )
}
