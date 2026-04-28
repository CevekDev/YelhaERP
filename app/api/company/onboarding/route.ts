import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getTenantContext } from '@/lib/security/tenant'
import { apiError, apiSuccess } from '@/lib/security/api-response'

const schema = z.object({
  businessType: z.enum(['RC', 'AE', 'NONE']),
  name: z.string().min(1).max(200).trim().optional(),
  legalForm: z.string().max(50).optional(),
  nif: z.string().max(20).optional(),
  nis: z.string().max(20).optional(),
  rc: z.string().max(30).optional(),
  aeCardNumber: z.string().max(30).optional(),
  address: z.string().max(500).optional(),
  wilaya: z.string().max(50).optional(),
  phone: z.string().max(20).optional(),
  email: z.string().email().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const ctx = await getTenantContext()

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return apiError('Corps invalide', 400)
    }

    const parsed = schema.safeParse(body)
    if (!parsed.success) return apiError('Données invalides', 422)

    await prisma.company.update({
      where: { id: ctx.companyId },
      data: parsed.data,
    })

    return apiSuccess({ ok: true })
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'UNAUTHORIZED') return apiError('Non authentifié', 401)
    return apiError('Erreur serveur', 500)
  }
}
