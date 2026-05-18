import { AppGateLayout } from '@/lib/billing/app-gate-layout'

export default function ProductionLayout({ children }: { children: React.ReactNode }) {
  return <AppGateLayout appId="production" appName="Production (BOM/OF)">{children}</AppGateLayout>
}
