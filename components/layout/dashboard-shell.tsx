'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { SidebarContent, MobileSidebarTrigger } from './sidebar'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className={cn(
        'hidden md:flex fixed top-0 left-0 h-screen z-40 flex-col border-r border-white/[0.07] transition-all duration-200',
        collapsed ? 'w-14' : 'w-56',
      )}>
        <SidebarContent collapsed={collapsed} />
        <button
          onClick={() => setCollapsed(c => !c)}
          className="absolute -right-3 top-[4.5rem] w-6 h-6 rounded-full bg-[#1a1a1d] border border-white/[0.12] flex items-center justify-center text-white/40 hover:text-white hover:border-white/25 transition-colors z-50"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
        </button>
      </aside>

      {/* Mobile top bar */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-30 h-14 flex items-center gap-2 px-4 border-b bg-[#0d0d0f]/90 backdrop-blur-xl border-white/[0.07]">
        <MobileSidebarTrigger />
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center font-black text-[#0d0d0f] text-xs">
            Y
          </div>
          <span className="font-semibold text-sm text-white">YelhaSubs</span>
        </div>
      </header>

      {/* Main content */}
      <main className={cn(
        'flex-1 min-h-screen pt-14 md:pt-0 transition-all duration-200',
        collapsed ? 'md:ml-14' : 'md:ml-56',
      )}>
        {children}
      </main>
    </div>
  )
}
