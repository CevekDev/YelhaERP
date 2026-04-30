import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { TopNav } from '@/components/layout/top-nav'
import { ChatWidget } from '@/components/ai/chat-widget'
import { KeyboardShortcuts } from '@/components/providers/keyboard-shortcuts'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (!session.user.businessType) redirect('/onboarding')

  return (
    <div className="min-h-screen bg-muted/30">
      {/* TopNav handles both desktop tabs and mobile hamburger */}
      <TopNav />
      <KeyboardShortcuts />
      {/*
        pt-14: offset for top bar (56px)
        Sub-nav adds 40px when present — pages with sub-nav use pt-24 class via layout wrapper
        md:pt-24 covers the most common case (most pages are under a module with sub-nav)
      */}
      <main className="pt-14 md:pt-24 min-h-screen">
        {children}
      </main>
      <ChatWidget />
    </div>
  )
}
