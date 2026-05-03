import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { getTenantContext } from '@/lib/security/tenant'
import { apiSuccess, apiError } from '@/lib/security/api-response'

const VALID_MODULES = ['dashboard', 'ventes', 'achats', 'stocks', 'compta', 'rh', 'projets', 'production', 'crm', 'pos']
const REQUIRED_MODULES = ['dashboard', 'ventes', 'achats', 'stocks']

const schema = z.object({
  modules: z.array(z.string()).min(1),
})

export async function GET() {
  const ctx = await getTenantContext()
  if (!ctx) return apiError('Non autorisé', 401)

  const company = await prisma.company.findUnique({
    where: { id: ctx.companyId },
    select: { activeModules: true },
  })
  return apiSuccess({ activeModules: company?.activeModules ?? REQUIRED_MODULES })
}

export async function PATCH(req: NextRequest) {
  const ctx = await getTenantContext()
  if (!ctx) return apiError('Non autorisé', 401)

  let body: unknown
  try { body = await req.json() } catch { return apiError('Corps invalide', 400) }
  const parsed = schema.safeParse(body)
  if (!parsed.success) return apiError('Données invalides', 400)

  // Merge required + requested, deduplicate, filter valid
  const merged = Array.from(
    new Set([...REQUIRED_MODULES, ...parsed.data.modules.filter((m: string) => VALID_MODULES.includes(m))])
  )

  const company = await prisma.company.update({
    where: { id: ctx.companyId },
    data:  { activeModules: merged },
    select: { activeModules: true },
  })
  return apiSuccess({ activeModules: company.activeModules })
}
