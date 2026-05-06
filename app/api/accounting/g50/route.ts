import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTenantContext } from '@/lib/security/tenant'
import { apiError, apiSuccess, rateLimitResponse } from '@/lib/security/api-response'
import { rateLimit, AUTHENTICATED_RATE_LIMIT } from '@/lib/security/ratelimit'
import { z } from 'zod'

const querySchema = z.object({
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2020).max(2100),
})

export async function GET(req: NextRequest) {
  const { success, reset } = await rateLimit(req, AUTHENTICATED_RATE_LIMIT)
  if (!success) return rateLimitResponse(reset)

  try {
    const ctx = await getTenantContext()
    const { searchParams } = req.nextUrl
    const now = new Date()
    const query = querySchema.safeParse({
      month: searchParams.get('month') ?? now.getMonth() + 1,
      year: searchParams.get('year') ?? now.getFullYear(),
    })
    if (!query.success) return apiError('Paramètres invalides', 400)

    const { month, year } = query.data
    const from = new Date(year, month - 1, 1)
    const to   = new Date(year, month, 1)

    // ── TVA collectée (sur factures émises) ──────────────────
    const invoiceLines = await prisma.invoiceLine.findMany({
      where: {
        invoice: {
          companyId: ctx.companyId,
          issueDate: { gte: from, lt: to },
          status: { not: 'CANCELLED' },
        },
      },
      select: { quantity: true, unitPrice: true, taxRate: true, total: true },
    })

    let htCollecte = 0
    let tvaCollecte = 0
    const tvaByRate: Record<number, { base: number; tva: number }> = {}

    for (const line of invoiceLines) {
      const ht  = Number(line.quantity) * Number(line.unitPrice)
      const tva = ht * (Number(line.taxRate) / 100)
      htCollecte  += ht
      tvaCollecte += tva
      const rate = Number(line.taxRate)
      if (!tvaByRate[rate]) tvaByRate[rate] = { base: 0, tva: 0 }
      tvaByRate[rate].base += ht
      tvaByRate[rate].tva  += tva
    }

    // ── TVA déductible (à compléter manuellement ou via module Achats) ──
    // Pour l'instant, calculée depuis les mouvements de stock
    const tvaDeductible = 0

    const tvaAPayer = Math.max(0, tvaCollecte - tvaDeductible)

    // ── CNAS + IRG (sur bulletins de paie) ───────────────────
    const payrollEntries = await prisma.payrollEntry.findMany({
      where: { companyId: ctx.companyId, month, year },
      select: {
        grossSalary: true, netSalary: true,
        cnasEmployee: true, cnasEmployer: true, irg: true,
      },
    })

    let totalGross       = 0
    let totalCnasEmployee = 0
    let totalCnasEmployer = 0
    let totalCnasTotal    = 0
    let totalIrg          = 0
    let headcount         = 0

    for (const entry of payrollEntries) {
      totalGross        += Number(entry.grossSalary)
      totalCnasEmployee += Number(entry.cnasEmployee)
      totalCnasEmployer += Number(entry.cnasEmployer)
      totalCnasTotal    += Number(entry.cnasEmployee) + Number(entry.cnasEmployer)
      totalIrg          += Number(entry.irg)
      headcount++
    }

    return apiSuccess({
      period: { month, year },
      tva: {
        collectee: { ht: htCollecte, tva: tvaCollecte },
        deductible: tvaDeductible,
        aPayerNet: tvaAPayer,
        detail: tvaByRate,
      },
      cnas: {
        headcount,
        massSalaireBrut: totalGross,
        partSalarie: totalCnasEmployee,
        partPatronale: totalCnasEmployer,
        totalCnas: totalCnasTotal,
      },
      irg: {
        totalRetenu: totalIrg,
      },
      totalAPayer: tvaAPayer + totalCnasTotal + totalIrg,
    })
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'UNAUTHORIZED') return apiError('Non authentifié', 401)
    return apiError('Erreur serveur', 500)
  }
}
