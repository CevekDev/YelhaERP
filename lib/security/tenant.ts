import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type { Role } from '@prisma/client'

export interface TenantContext {
  userId: string
  role: Role
  plan: string
}

/**
 * Récupère le contexte tenant depuis la session.
 * userId est la clé d'isolation (chaque User est son propre tenant).
 */
export async function getTenantContext(): Promise<TenantContext> {
  const session = await auth()
  if (!session?.user?.id) throw new Error('UNAUTHORIZED')

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isBanned: true },
  })
  if (user?.isBanned) throw new Error('FORBIDDEN')

  return {
    userId: session.user.id,
    role: session.user.role,
    plan: session.user.plan,
  }
}

export async function requireSuperAdmin(): Promise<void> {
  const session = await auth()
  if (!session?.user?.id) throw new Error('UNAUTHORIZED')
  if (!session.user.isSuperAdmin) throw new Error('FORBIDDEN')
}

const roleHierarchy: Record<Role, number> = {
  OWNER: 5,
  ADMIN: 4,
  EMPLOYEE: 2,
  READONLY: 1,
}

export function hasRole(userRole: Role, requiredRole: Role): boolean {
  return roleHierarchy[userRole] >= roleHierarchy[requiredRole]
}

export function requireRole(userRole: Role, requiredRole: Role): void {
  if (!hasRole(userRole, requiredRole)) {
    throw new Error('FORBIDDEN')
  }
}

// Quotas IA par plan — IA disponible uniquement à partir du plan PRO
export const AI_QUOTAS: Record<string, number> = {
  TRIAL: 0,
  STARTER: 0,
  PRO: 300,
  AGENCY: Infinity,
}
