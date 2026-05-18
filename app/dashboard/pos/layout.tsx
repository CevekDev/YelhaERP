import { AppGateLayout } from '@/lib/billing/app-gate-layout'

export default function PosLayout({ children }: { children: React.ReactNode }) {
  return <AppGateLayout appId="pos" appName="POS caisse">{children}</AppGateLayout>
}
