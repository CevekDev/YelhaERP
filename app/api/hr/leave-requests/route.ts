import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTenantContext } from '@/lib/security/tenant'
import { apiError, apiSuccess, rateLimitResponse } from '@/lib/security/api-response'
import { rateLimit, AUTHENTICATED_RATE_LIMIT } from '@/lib/security/ratelimit'
import { leaveRequestSchema } from '@/lib/validations/hr'

export async function GET(req: NextRequest) {
  const { success, reset } = await rateLimit(req, AUTHENTICATED_RATE_LIMIT)
  if (!success) return rateLimitResponse(reset)
  try {
    const ctx = await getTenantContext()
    const { searchParams } = req.nextUrl
    const status = searchParams.get('status')
    const employeeId = searchParams.get('employeeId')
    const month = searchParams.get('month')
    const year = searchParams.get('year')

    const where: Record<string, unknown> = { companyId: ctx.companyId }
    if (status) where.status = status
    if (employeeId) where.employeeId = employeeId
    if (month && year) {
      const m = parseInt(month)
      const y = parseInt(year)
      const start = new Date(y, m - 1, 1)
      const end = new Date(y, m, 0, 23, 59, 59)
      where.startDate = { lte: end }
      where.endDate = { gte: start }
    }

    const requests = await prisma.leaveRequest.findMany({
      where,
      include: {
        employee: { select: { firstName: true, lastName: true, department: true } },
        leaveType: { select: { name: true, isPaid: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
    return apiSuccess(requests)
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'UNAUTHORIZED') return apiError('Non authentifié', 401)
    return apiError('Erreur serveur', 500)
  }
}

export async function POST(req: NextRequest) {
  const { success, reset } = await rateLimit(req, AUTHENTICATED_RATE_LIMIT)
  if (!success) return rateLimitResponse(reset)
  try {
    const ctx = await getTenantContext()
    const body = await req.json().catch(() => null)
    const parsed = leaveRequestSchema.safeParse(body)
    if (!parsed.success) return apiError('Données invalides', 422, parsed.error.flatten())

    const { employeeId, leaveTypeId, startDate, endDate, days, reason } = parsed.data

    // Validate date order
    if (new Date(startDate) >= new Date(endDate)) {
      return apiError('La date de début doit être antérieure à la date de fin', 422)
    }

    // Verify employee belongs to company
    const employee = await prisma.employee.findFirst({
      where: { id: employeeId, companyId: ctx.companyId },
    })
    if (!employee) return apiError('Employé introuvable', 404)

    // Verify leave type belongs to company
    const leaveType = await prisma.leaveType.findFirst({
      where: { id: leaveTypeId, companyId: ctx.companyId },
    })
    if (!leaveType) return apiError('Type de congé introuvable', 404)

    const request = await prisma.leaveRequest.create({
      data: {
        companyId: ctx.companyId,
        employeeId,
        leaveTypeId,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        days,
        reason,
        status: 'PENDING',
      },
      include: {
        employee: { select: { firstName: true, lastName: true } },
        leaveType: { select: { name: true } },
      },
    })
    return apiSuccess(request, 201)
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'UNAUTHORIZED') return apiError('Non authentifié', 401)
    return apiError('Erreur serveur', 500)
  }
}
