import { AppGateLayout } from '@/lib/billing/app-gate-layout'

export default function AccountingLayout({ children }: { children: React.ReactNode }) {
  return <AppGateLayout appId="accounting" appName="Comptabilité PCN">{children}</AppGateLayout>
}
