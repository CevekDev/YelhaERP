import { AppGateLayout } from '@/lib/billing/app-gate-layout'

export default function HrLayout({ children }: { children: React.ReactNode }) {
  return <AppGateLayout appId="hr" appName="RH">{children}</AppGateLayout>
}
