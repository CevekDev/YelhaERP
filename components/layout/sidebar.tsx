'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import { cn } from '@/lib/utils'
import { RefreshCw, Bell, LogOut, Menu, LayoutDashboard, User, CreditCard } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { useT } from '@/lib/i18n'

const NAV = [
  { href: '/dashboard/subscriptions/overview', labelKey: 'sidebar.overview',       icon: LayoutDashboard },
  { href: '/dashboard/subscriptions',          labelKey: 'sidebar.subscriptions',   icon: RefreshCw },
  { href: '/dashboard/notifications',          labelKey: 'sidebar.notifications',   icon: Bell },
  { href: '/dashboard/settings/profile',       labelKey: 'sidebar.profile',         icon: User },
  { href: '/dashboard/settings/billing',       labelKey: 'sidebar.payment',         icon: CreditCard },
] as const

export function SidebarContent({ collapsed, onNavigate }: { collapsed?: boolean; onNavigate?: () => void }) {
  const pathname = usePathname()
  const { t } = useT()
  const { data: session } = useSession()

  return (
    <div className="flex flex-col h-full bg-[#111114]">
      {/* Logo */}
      <div className={cn(
        'flex items-center gap-2.5 h-14 border-b border-white/[0.07] shrink-0',
        collapsed ? 'justify-center px-0' : 'px-5',
      )}>
        <div className="w-7 h-7 rounded-md bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center font-black text-[#0d0d0f] text-sm shrink-0">
          Y
        </div>
        {!collapsed && <span className="font-semibold tracking-tight text-sm text-white">YelhaSubs</span>}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-2 space-y-0.5">
        {NAV.map(item => {
          const active = item.href === '/dashboard/subscriptions'
            ? pathname === item.href || (pathname.startsWith(item.href + '/') && !pathname.startsWith('/dashboard/subscriptions/overview') && !pathname.startsWith('/dashboard/subscriptions/settings'))
            : pathname === item.href || pathname.startsWith(item.href + '/')
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              title={collapsed ? t(item.labelKey) : undefined}
              className={cn(
                'flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors',
                collapsed && 'justify-center',
                active
                  ? 'bg-white/[0.08] text-white'
                  : 'text-white/40 hover:text-white/70 hover:bg-white/[0.04]',
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {!collapsed && <span className="truncate">{t(item.labelKey)}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Bottom */}
      <div className="p-3 border-t border-white/[0.07]">
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          title={collapsed ? t('sidebar.logout') : undefined}
          className={cn(
            'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] text-white/30 hover:text-white/60 hover:bg-white/[0.04] transition-colors',
            collapsed && 'justify-center',
          )}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!collapsed && <span>{t('sidebar.logout')}</span>}
        </button>
        {!collapsed && session?.user?.email && (
          <p className="px-3 pt-2 text-[11px] text-white/20 truncate">{session.user.email}</p>
        )}
      </div>
    </div>
  )
}


export function MobileSidebarTrigger() {
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden text-white/70 hover:text-white hover:bg-white/[0.06]">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="p-0 w-56 bg-[#111114] border-r border-white/[0.07]">
        <SidebarContent onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  )
}
