import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getTenantContext, requireRole } from '@/lib/security/tenant'
import { apiError, apiSuccess } from '@/lib/security/api-response'

const profileSchema = z.object({
  name: z.string().min(2).max(200).trim().optional(),
  nif: z.string().max(20).optional().nullable(),
  nis: z.string().max(20).optional().nullable(),
  rc: z.string().max(30).optional().nullable(),
  legalForm: z.string().max(50).optional().nullable(),
  aeCardNumber: z.string().max(30).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  wilaya: z.string().max(50).optional().nullable(),
  phone: z.string().max(20).optional().nullable(),
  email: z.string().email().optional().nullable(),
})

export async function GET() {
  try {
    const ctx = await getTenantContext()
    const company = await prisma.company.findUnique({
      where: { id: ctx.companyId },
      select: { id: true, name: true, nif: true, nis: true, rc: true, legalForm: true, aeCardNumber: true, address: true, wilaya: true, phone: true, email: true, plan: true, businessType: true },
    })
    return apiSuccess(company)
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'UNAUTHORIZED') return apiError('Non authentifié', 401)
    return apiError('Erreur serveur', 500)
  }
}

export async function PUT(req: NextRequest) {
  try {
    const ctx = await getTenantContext()
    requireRole(ctx.role, 'ADMIN')
    const body = await req.json().catch(() => null)
    const parsed = profileSchema.safeParse(body)
    if (!parsed.success) return apiError('Données invalides', 422)

    // Derive businessType from legalForm when legalForm changes
    const updateData: Record<string, unknown> = { ...parsed.data }
    if (parsed.data.legalForm !== undefined && parsed.data.legalForm !== null) {
      updateData.businessType =
        parsed.data.legalForm === 'AE'   ? 'AE'  :
        parsed.data.legalForm === 'NONE' ? 'NONE' : 'RC'
    }

    const updated = await prisma.company.update({ where: { id: ctx.companyId }, data: updateData })
    return apiSuccess(updated)
  } catch (e: unknown) {
    if (e instanceof Error) {
      if (e.message === 'UNAUTHORIZED') return apiError('Non authentifié', 401)
      if (e.message === 'FORBIDDEN') return apiError('Accès refusé', 403)
    }
    return apiError('Erreur serveur', 500)
  }
}
