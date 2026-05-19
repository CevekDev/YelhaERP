import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/sonner'
import { ThemeProvider } from '@/components/providers/theme-provider'
import { SessionProvider } from '@/components/providers/session-provider'
import { I18nProvider } from '@/lib/i18n'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://subs.yelha.net'

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: { default: 'YelhaSubs — Gestion d\'abonnements pour entreprises algériennes', template: '%s | YelhaSubs' },
  description: 'Gérez les abonnements récurrents de vos clients : facturation automatique, rappels email/WhatsApp, paiement Chargily Pay et CCP.',
  applicationName: 'YelhaSubs',
  icons: { icon: '/favicon.svg' },
  openGraph: {
    title: 'YelhaSubs — Gestion d\'abonnements clients',
    description: 'Automatisez vos abonnements récurrents en Algérie. Chargily Pay, virement CCP, rappels multilingues, API publique.',
    type: 'website',
    locale: 'fr_DZ',
    url: APP_URL,
    siteName: 'YelhaSubs',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'YelhaSubs — Gestion d\'abonnements clients',
    description: 'Facturation récurrente, rappels auto, Chargily Pay / CCP — pour PME algériennes.',
  },
  robots: { index: true, follow: true },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className={inter.variable}>
        <I18nProvider>
          <SessionProvider>
            <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
              {children}
              <Toaster richColors position="top-right" />
            </ThemeProvider>
          </SessionProvider>
        </I18nProvider>
      </body>
    </html>
  )
}
