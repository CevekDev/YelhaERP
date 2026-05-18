import { AppGateLayout } from '@/lib/billing/app-gate-layout'

export default function EcommerceLayout({ children }: { children: React.ReactNode }) {
  return <AppGateLayout appId="ecommerce" appName="E-commerce">{children}</AppGateLayout>
}
