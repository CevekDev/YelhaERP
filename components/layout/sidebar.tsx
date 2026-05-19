'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import { cn } from '@/lib/utils'
import { RefreshCw, Settings, Bell, LogOut, Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { useT } from '@/lib/i18n'

interface SidebarProps { companyName: string }

const NAV = [
  { href: '/dashboard/subscriptions', labelKey: 'sidebar.subscriptions', icon: RefreshCw },
  { href: '/dashboard/notifications', labelKey: 'sidebar.notifications', icon: Bell },
  { href: '/dashboard/settings',      labelKey: 'sidebar.settings',      icon: Settings },
] as const

function SidebarContent({ companyName, onNavigate }: SidebarProps & { onNavigate?: () => void }) {
  const pathname = usePathname()
  const { t } = useT()
  const { data: session } = useSession()
  const cn_ = session?.user?.name ?? companyName

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="px-4 h-16 flex items-center gap-3 shrink-0 bg-primary">
        <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center shrink-0 border border-white/30">
          <RefreshCw className="w-4 h-4 text-white" />
        </div>
        <div className="overflow-hidden">
          <p className="font-bold text-sm text-white leading-none truncate">YelhaSubs</p>
          <p className="text-xs text-white/70 truncate mt-0.5">{cn_}</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
        {NAV.map(item => {
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
              <span className="flex-1 truncate">{t(item.labelKey)}</span>
            </Link>
          )
        })}
      </nav>

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

export function Sidebar(props: SidebarProps) {
  return (
    <aside className="hidden md:flex fixed top-0 h-screen w-[240px] flex-col bg-background border-r border-border z-40 left-0">
      <SidebarContent {...props} />
    </aside>
  )
}

export function MobileSidebarTrigger() {
  const [open, setOpen] = useState(false)
  const { data: session } = useSession()
  const companyName = session?.user?.name ?? ''

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="p-0 w-[240px]">
        <SidebarContent companyName={companyName} onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  )
}
