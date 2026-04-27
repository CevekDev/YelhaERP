import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getTenantContext, requireRole } from '@/lib/security/tenant'
import { apiError, apiSuccess, rateLimitResponse } from '@/lib/security/api-response'
import { rateLimit, AUTHENTICATED_RATE_LIMIT } from '@/lib/security/ratelimit'
import { calculatePayroll } from '@/lib/algerian/payroll'

const employeeSchema = z.object({
  firstName: z.string().min(1).max(100).trim(),
  lastName: z.string().min(1).max(100).trim(),
  nin: z.string().max(18).optional().nullable(),
  socialNumber: z.string().max(20).optional().nullable(),
  position: z.string().max(100).optional().nullable(),
  baseSalary: z.number().min(0),
  hireDate: z.string().datetime(),
})

const generatePayrollSchema = z.object({
  month: z.number().min(1).max(12),
  year: z.number().min(2020).max(2100),
  employeeIds: z.array(z.string().cuid()).optional(),
})

export async function GET(req: NextRequest) {
  const { success, reset } = await rateLimit(req, AUTHENTICATED_RATE_LIMIT)
  if (!success) return rateLimitResponse(reset)
  try {
    const ctx = await getTenantContext()
    const { searchParams } = req.nextUrl
    const type = searchParams.get('type') ?? 'employees'

    if (type === 'employees') {
      const employees = await prisma.employee.findMany({
        where: { companyId: ctx.companyId, isActive: true },
        orderBy: { lastName: 'asc' },
      })
      return apiSuccess(employees)
    }

    // type === 'entries' — fiches de paie
    const month = Number(searchParams.get('month') ?? new Date().getMonth() + 1)
    const year = Number(searchParams.get('year') ?? new Date().getFullYear())
    const entries = await prisma.payrollEntry.findMany({
      where: { companyId: ctx.companyId, month, year },
      include: { employee: { select: { firstName: true, lastName: true, position: true } } },
      orderBy: { employee: { lastName: 'asc' } },
    })
    return apiSuccess(entries)
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
    const { searchParams } = req.nextUrl
    const action = searchParams.get('action')

    if (action === 'employee') {
      requireRole(ctx.role, 'ADMIN')
      const body = await req.json().catch(() => null)
      const parsed = employeeSchema.safeParse(body)
      if (!parsed.success) return apiError('Données invalides', 422)
      const employee = await prisma.employee.create({
        data: { ...parsed.data, hireDate: new Date(parsed.data.hireDate), companyId: ctx.companyId },
      })
      return apiSuccess(employee, 201)
    }

    // action === 'generate' — Calculer les fiches de paie du mois
    requireRole(ctx.role, 'ACCOUNTANT')
    const body = await req.json().catch(() => null)
    const parsed = generatePayrollSchema.safeParse(body)
    if (!parsed.success) return apiError('Données invalides', 422)

    const { month, year, employeeIds } = parsed.data
    const employees = await prisma.employee.findMany({
      where: {
        companyId: ctx.companyId,
        isActive: true,
        ...(employeeIds && { id: { in: employeeIds } }),
      },
    })

    const entries = employees.map(emp => {
      const calc = calculatePayroll(Number(emp.baseSalary))
      return {
        companyId: ctx.companyId,
        employeeId: emp.id,
        month,
        year,
        baseSalary: calc.baseSalary,
        grossSalary: calc.grossSalary,
        cnasEmployee: calc.cnasEmployee,
        cnasEmployer: calc.cnasEmployer,
        irg: calc.irg,
        netSalary: calc.netSalary,
      }
    })

    // Upsert pour éviter les doublons
    const created = await prisma.$transaction(
      entries.map(e =>
        prisma.payrollEntry.upsert({
          where: { companyId_employeeId_month_year: { companyId: e.companyId, employeeId: e.employeeId, month, year } },
          update: e,
          create: e,
        })
      )
    )
    return apiSuccess(created, 201)
  } catch (e: unknown) {
    if (e instanceof Error) {
      if (e.message === 'UNAUTHORIZED') return apiError('Non authentifié', 401)
      if (e.message === 'FORBIDDEN') return apiError('Accès refusé', 403)
    }
    return apiError('Erreur serveur', 500)
  }
}
