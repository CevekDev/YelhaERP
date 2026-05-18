import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/sonner'
import { ThemeProvider } from '@/components/providers/theme-provider'
import { SessionProvider } from '@/components/providers/session-provider'
import { I18nProvider } from '@/lib/i18n'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://erp.yelha.net'

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: { default: 'YelhaERP — ERP SaaS algérien', template: '%s | YelhaERP' },
  description: 'Logiciel de gestion pour entreprises algériennes — Facturation, Comptabilité PCN, Paie IRG/CNAS, Stock, CRM, Restaurant, POS.',
  applicationName: 'YelhaERP',
  icons: { icon: '/favicon.svg' },
  openGraph: {
    title: 'YelhaERP — ERP SaaS algérien',
    description: 'Tout votre ERP en un seul outil : facturation, comptabilité, paie, stock, CRM. Conforme à la législation algérienne.',
    type: 'website',
    locale: 'fr_DZ',
    url: APP_URL,
    siteName: 'YelhaERP',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'YelhaERP — ERP SaaS algérien',
    description: 'Facturation, comptabilité PCN, paie IRG/CNAS, stock — pour PME algériennes.',
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
