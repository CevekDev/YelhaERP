import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { Sidebar } from '@/components/layout/sidebar'
import { ChatWidget } from '@/components/ai/chat-widget'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (!session.user.businessType) redirect('/onboarding')

  return (
    <div className="min-h-screen bg-background">
      <Sidebar companyName={session.user.companyName} plan={session.user.plan} businessType={session.user.businessType} />
      <main className="ml-[240px] min-h-screen">
        {children}
      </main>
      <ChatWidget />
    </div>
  )
}
