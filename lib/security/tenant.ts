import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type { Role } from '@prisma/client'

export interface TenantContext {
  userId: string
  companyId: string
  role: Role
  plan: string
}

/**
 * Récupère le contexte tenant depuis la session.
 * NE JAMAIS faire confiance au companyId venant du client.
 */
export async function getTenantContext(): Promise<TenantContext> {
  const session = await auth()
  if (!session?.user?.id || !session?.user?.companyId) {
    throw new Error('UNAUTHORIZED')
  }
  return {
    userId: session.user.id,
    companyId: session.user.companyId,
    role: session.user.role,
    plan: session.user.plan,
  }
}

/**
 * Vérifie qu'une ressource appartient bien à l'entreprise de l'utilisateur.
 */
export async function assertOwnership(
  table: 'clients' | 'suppliers' | 'invoices' | 'products' | 'employees',
  resourceId: string,
  companyId: string
): Promise<boolean> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const record = await (prisma as any)[table].findFirst({
    where: { id: resourceId, companyId },
    select: { id: true },
  })
  return !!record
}

const roleHierarchy: Record<Role, number> = {
  OWNER: 5,
  ADMIN: 4,
  ACCOUNTANT: 3,
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

// Quotas IA par plan
export const AI_QUOTAS: Record<string, number> = {
  TRIAL: 30,
  STARTER: 50,
  PRO: 300,
  AGENCY: Infinity,
}
