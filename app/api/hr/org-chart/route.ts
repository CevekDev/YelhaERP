import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTenantContext } from '@/lib/security/tenant'
import { apiError, apiSuccess, rateLimitResponse } from '@/lib/security/api-response'
import { rateLimit, AUTHENTICATED_RATE_LIMIT } from '@/lib/security/ratelimit'

function buildTree(employees: { id: string; firstName: string; lastName: string; position?: string | null; department?: string | null; managerId?: string | null }[]) {
  const map = new Map<string, { id: string; firstName: string; lastName: string; position?: string | null; department?: string | null; managerId?: string | null; reports: unknown[] }>()
  employees.forEach(e => map.set(e.id, { ...e, reports: [] }))
  const roots: unknown[] = []
  map.forEach(emp => {
    if (emp.managerId && map.has(emp.managerId)) {
      map.get(emp.managerId)!.reports.push(emp)
    } else {
      roots.push(emp)
    }
  })
  return roots
}

export async function GET(req: NextRequest) {
  const { success, reset } = await rateLimit(req, AUTHENTICATED_RATE_LIMIT)
  if (!success) return rateLimitResponse(reset)
  try {
    const ctx = await getTenantContext()
    const employees = await prisma.employee.findMany({
      where: { companyId: ctx.companyId, isActive: true },
      select: { id: true, firstName: true, lastName: true, position: true, department: true, managerId: true },
      orderBy: { lastName: 'asc' },
    })
    const tree = buildTree(employees)
    return apiSuccess(tree)
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'UNAUTHORIZED') return apiError('Non autorisé', 401)
    return apiError('Erreur serveur', 500, e)
  }
}
