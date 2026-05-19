'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import { cn } from '@/lib/utils'
import { RefreshCw, Settings, LogOut, User, LayoutDashboard } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { NotificationBell } from '@/components/layout/notification-bell'
import { MobileSidebarTrigger } from '@/components/layout/sidebar'
import { LanguageSwitcher } from '@/components/ui/language-switcher'
import { useT } from '@/lib/i18n'

interface TopNavProps {
  /** Display a top banner with a margin shift. */
  hasBanner?: boolean
}

const NAV = [
  { href: '/dashboard/subscriptions/overview', labelKey: 'sidebar.overview' },
  { href: '/dashboard/subscriptions',          labelKey: 'sidebar.subscriptions' },
] as const

export function TopNav({ hasBanner = false }: TopNavProps) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const { t } = useT()
  const user = session?.user

  const isOverview = pathname === '/dashboard/subscriptions/overview'

  return (
    <header className={cn(
      'fixed left-0 right-0 z-30 border-b',
      isOverview
        ? 'bg-[#0a0a0b]/80 backdrop-blur-xl border-white/[0.06]'
        : 'bg-background border-border',
      hasBanner ? 'top-10' : 'top-0',
    )}>
      <div className="px-4 md:px-6 h-14 flex items-center justify-between gap-3">
        {/* Left — logo + mobile menu */}
        <div className="flex items-center gap-2">
          <MobileSidebarTrigger />
          <Link href="/dashboard/subscriptions/overview" className="flex items-center gap-2">
            <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', isOverview ? 'bg-gradient-to-br from-emerald-400 to-emerald-600' : 'bg-primary')}>
              <RefreshCw className="w-4 h-4 text-white" />
            </div>
            <span className={cn('hidden sm:inline font-bold', isOverview ? 'text-white' : 'text-foreground')}>YelhaSubs</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1 ml-4">
            {NAV.map(item => {
              const active = pathname === item.href || pathname.startsWith(item.href + '/')
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                    isOverview
                      ? active ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white hover:bg-white/[0.06]'
                      : active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                  )}
                >
                  {t(item.labelKey)}
                </Link>
              )
            })}
          </nav>
        </div>

        {/* Right — actions */}
        <div className="flex items-center gap-1.5">
          <LanguageSwitcher />
          <NotificationBell />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <User className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <p className="text-sm font-semibold">{user?.name ?? 'Compte'}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/dashboard/settings/profile" className="cursor-pointer">
                  <User className="mr-2 h-4 w-4" /> {t('topnav.profile')}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/dashboard/settings/billing" className="cursor-pointer">
                  <Settings className="mr-2 h-4 w-4" /> {t('topnav.billing')}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="cursor-pointer text-destructive focus:text-destructive"
              >
                <LogOut className="mr-2 h-4 w-4" /> {t('sidebar.logout')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
