'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, FileText, Users, Truck, Package, BarChart3,
  Calculator, Receipt, Bot, Settings, LogOut, TrendingUp, ShoppingBag,
  FileCheck, Bell, Menu,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { useT } from '@/lib/i18n'

interface SidebarProps { companyName: string; plan: string; businessType: string }

const HIDDEN_ITEMS: Record<string, string[]> = {
  AE:   ['/dashboard/payroll', '/dashboard/accounting', '/dashboard/tax'],
  NONE: ['/dashboard/payroll', '/dashboard/accounting', '/dashboard/tax', '/dashboard/suppliers', '/dashboard/integrations'],
}

const SHORTCUT_HINTS: Record<string, string> = {
  '/dashboard': 'gd',
  '/dashboard/invoices': 'gf',
  '/dashboard/clients': 'gc',
  '/dashboard/products': 'gp',
  '/dashboard/stock': 'gs',
  '/dashboard/accounting': 'ga',
  '/dashboard/ai': 'gi',
}

const ALL_NAV_ITEMS = [
  { href: '/dashboard',               key: 'sidebar.dashboard',     icon: LayoutDashboard },
  { href: '/dashboard/invoices',      key: 'sidebar.invoices',      icon: FileText },
  { href: '/dashboard/quotes',        key: 'sidebar.quotes',        icon: FileCheck },
  { href: '/dashboard/clients',       key: 'sidebar.clients',       icon: Users },
  { href: '/dashboard/suppliers',     key: 'sidebar.suppliers',     icon: Truck },
  { href: '/dashboard/products',      key: 'sidebar.products',      icon: Package },
  { href: '/dashboard/stock',         key: 'sidebar.stock',         icon: BarChart3 },
  { href: '/dashboard/expenses',      key: 'sidebar.expenses',      icon: Receipt },
  { href: '/dashboard/payroll',       key: 'sidebar.payroll',       icon: Calculator },
  { href: '/dashboard/accounting',    key: 'sidebar.accounting',    icon: Receipt },
  { href: '/dashboard/tax',           key: 'sidebar.tax',           icon: TrendingUp },
  { href: '/dashboard/integrations',  key: 'sidebar.integrations',  icon: ShoppingBag },
  { href: '/dashboard/notifications', key: 'sidebar.notifications', icon: Bell },
  { href: '/dashboard/ai',            key: 'sidebar.ai',            icon: Bot, badge: 'IA' },
  { href: '/dashboard/settings',      key: 'sidebar.settings',      icon: Settings },
]

const PLAN_COLORS: Record<string, string> = {
  TRIAL:   'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  STARTER: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  PRO:     'bg-yelha-100 text-yelha-800 dark:bg-yelha-900/30 dark:text-yelha-400',
  AGENCY:  'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
}

const BT_LABEL: Record<string, { label: string; color: string }> = {
  RC:   { label: 'Société (RC)', color: 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800' },
  AE:   { label: 'Auto-entrepreneur', color: 'bg-orange-50 text-orange-700 border border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800' },
  NONE: { label: 'Non enregistré', color: 'bg-muted text-muted-foreground border border-border' },
}

function SidebarContent({ companyName, plan, businessType, onNavigate }: SidebarProps & { onNavigate?: () => void }) {
  const pathname = usePathname()
  const { t } = useT()
  const { data: session } = useSession()

  const bt = session?.user?.businessType ?? businessType
  const cn_ = session?.user?.companyName ?? companyName
  const pl = session?.user?.plan ?? plan

  const hidden = HIDDEN_ITEMS[bt] ?? []
  const navItems = ALL_NAV_ITEMS.filter(item => !hidden.includes(item.href))
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

      {/* Plan + business type */}
      <div className="px-3 py-2 border-b border-border space-y-1">
        <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold', PLAN_COLORS[pl] ?? PLAN_COLORS.TRIAL)}>
          {pl}
        </span>
        <div className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ml-1.5', btInfo.color)}>
          {btInfo.label}
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2 px-2">
        {navItems.map(item => {
          const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href + '/'))
          const hint = SHORTCUT_HINTS[item.href]
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all mb-0.5',
                active
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
              )}
            >
              <item.icon className={cn('h-4 w-4 shrink-0', active ? 'text-primary-foreground' : 'text-muted-foreground')} />
              <span className="flex-1 truncate">{t(item.key)}</span>
              {item.badge && (
                <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-bold', active ? 'bg-white/25 text-white' : 'bg-yelha-100 text-yelha-700 dark:bg-yelha-900/30 dark:text-yelha-400')}>
                  {item.badge}
                </span>
              )}
              {hint && !active && (
                <span className="hidden group-hover:inline-flex text-[10px] text-muted-foreground/50 font-mono">
                  {hint}
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
          onClick={() => signOut({ callbackUrl: '/login' })}>
          <LogOut className="h-4 w-4 shrink-0" />
          {t('sidebar.logout')}
        </button>
      </div>
    </div>
  )
}

// Desktop sidebar (hidden on mobile)
export function Sidebar(props: SidebarProps) {
  return (
    <aside className="hidden md:flex fixed top-0 h-screen w-[240px] flex-col bg-background border-r border-border z-40 left-0">
      <SidebarContent {...props} />
    </aside>
  )
}

// Mobile hamburger trigger — reads session internally
export function MobileSidebarTrigger() {
  const [open, setOpen] = useState(false)
  const { data: session } = useSession()

  const companyName = session?.user?.companyName ?? ''
  const plan = session?.user?.plan ?? 'TRIAL'
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
          plan={plan}
          businessType={businessType}
          onNavigate={() => setOpen(false)}
        />
      </SheetContent>
    </Sheet>
  )
}
