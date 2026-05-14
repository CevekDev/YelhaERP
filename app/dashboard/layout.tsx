import { redirect } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { TopNav } from '@/components/layout/top-nav'
import { ChatWidget } from '@/components/ai/chat-widget'
import { KeyboardShortcuts } from '@/components/providers/keyboard-shortcuts'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (!session.user.businessType) redirect('/onboarding')

  const sub = session.user.companyId
    ? await prisma.yelhaSubscription.findUnique({
        where: { companyId: session.user.companyId },
        select: { status: true, trialEndsAt: true },
      })
    : null

  const isExpired = sub?.status === 'EXPIRED' ||
    (sub?.status === 'TRIAL' && sub?.trialEndsAt && sub.trialEndsAt < new Date())

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Trial expired — blocking modal */}
      {isExpired && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: '2.5rem', maxWidth: 460, textAlign: 'center', boxShadow: '0 25px 50px rgba(0,0,0,.25)' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>⏰</div>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>Votre essai gratuit est terminé</h2>
            <p style={{ color: '#64748b', fontSize: 15, marginBottom: 24 }}>Choisissez un plan pour continuer à utiliser YelhaERP.</p>
            <Link href="/pricing" style={{ display: 'inline-block', background: '#1D9E75', color: '#fff', fontWeight: 600, padding: '12px 32px', borderRadius: 10, textDecoration: 'none', fontSize: 15 }}>
              Voir les plans →
            </Link>
            <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 16 }}>Vos données sont conservées 30 jours supplémentaires.</p>
          </div>
        </div>
      )}

      <TopNav hasBanner={false} />
      <KeyboardShortcuts />
      <main className="pt-14 md:pt-24 min-h-screen">
        {children}
      </main>
      <ChatWidget />
    </div>
  )
}
