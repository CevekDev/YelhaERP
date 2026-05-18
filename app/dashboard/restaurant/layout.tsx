import { AppGateLayout } from '@/lib/billing/app-gate-layout'

export default function RestaurantLayout({ children }: { children: React.ReactNode }) {
  return <AppGateLayout appId="restaurant" appName="Restaurant">{children}</AppGateLayout>
}
