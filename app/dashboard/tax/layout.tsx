import { AppGateLayout } from '@/lib/billing/app-gate-layout'

export default function TaxLayout({ children }: { children: React.ReactNode }) {
  return <AppGateLayout appId="tax" appName="G50 automatique">{children}</AppGateLayout>
}
