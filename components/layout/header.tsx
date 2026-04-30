'use client'

import { MobileSidebarTrigger } from '@/components/layout/sidebar'

interface HeaderProps { title: string }

export function Header({ title }: HeaderProps) {
  return (
    <div className="flex items-center gap-3 px-4 md:px-6 py-4 border-b bg-background">
      <MobileSidebarTrigger />
      <h1 className="text-lg font-semibold text-foreground truncate">{title}</h1>
    </div>
  )
}
