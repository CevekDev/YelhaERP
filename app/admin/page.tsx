import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifyAdminToken, ADMIN_COOKIE } from '@/lib/admin-auth'
import { AdminClientPage } from './_admin-client'

export default async function AdminPage() {
  const token = cookies().get(ADMIN_COOKIE)?.value
  if (!token || !verifyAdminToken(token)) {
    redirect('/admin/login')
  }
  return <AdminClientPage />
}
