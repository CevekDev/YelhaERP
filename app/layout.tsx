import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/sonner'
import { ThemeProvider } from '@/components/providers/theme-provider'
import { SessionProvider } from '@/components/providers/session-provider'
import { I18nProvider } from '@/lib/i18n'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: { default: 'YelhaERP', template: '%s | YelhaERP' },
  description: 'Logiciel de gestion pour entreprises algériennes — Facturation, Comptabilité, Paie, Stock',
  robots: { index: false, follow: false },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className={inter.variable}>
        <I18nProvider>
          <SessionProvider>
            <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
              {children}
              <Toaster richColors position="top-right" />
            </ThemeProvider>
          </SessionProvider>
        </I18nProvider>
      </body>
    </html>
  )
}
