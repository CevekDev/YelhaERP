import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTenantContext } from '@/lib/security/tenant'
import { AI_QUOTAS } from '@/lib/security/tenant'
import { apiError, rateLimitResponse } from '@/lib/security/api-response'
import { rateLimit, AI_RATE_LIMIT } from '@/lib/security/ratelimit'
import { z } from 'zod'

const schema = z.object({
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string().max(4000),
  })).min(1).max(50),
})

export async function POST(req: NextRequest) {
  const { success, reset } = await rateLimit(req, AI_RATE_LIMIT)
  if (!success) return rateLimitResponse(reset)

  try {
    const ctx = await getTenantContext()

    // Vérifier le quota IA
    const company = await prisma.company.findUnique({
      where: { id: ctx.companyId },
      select: { aiQuotaUsed: true, aiQuotaReset: true, plan: true },
    })
    if (!company) return apiError('Entreprise introuvable', 404)

    // Reset mensuel
    const now = new Date()
    const resetDate = new Date(company.aiQuotaReset)
    const needsReset = now.getMonth() !== resetDate.getMonth() || now.getFullYear() !== resetDate.getFullYear()

    const quota = AI_QUOTAS[company.plan] ?? 30
    const currentUsage = needsReset ? 0 : company.aiQuotaUsed

    if (currentUsage >= quota) {
      return apiError('Quota IA mensuel atteint. Passez à un plan supérieur.', 429)
    }

    let body: unknown
    try { body = await req.json() } catch { return apiError('Corps invalide', 400) }

    const parsed = schema.safeParse(body)
    if (!parsed.success) return apiError('Données invalides', 422)

    // Contexte entreprise pour l'IA
    const [monthRevenue, unpaidCount] = await Promise.all([
      prisma.invoice.aggregate({
        where: {
          companyId: ctx.companyId,
          status: 'PAID',
          issueDate: { gte: new Date(now.getFullYear(), now.getMonth(), 1) },
        },
        _sum: { total: true },
      }),
      prisma.invoice.count({
        where: { companyId: ctx.companyId, status: { in: ['SENT', 'OVERDUE'] } },
      }),
    ])

    const systemPrompt = `Tu es l'assistant IA de YelhaERP, un logiciel de gestion pour entreprises algériennes.
Tu as accès en lecture seule aux données de cette entreprise.

Contexte actuel :
- CA du mois : ${Number(monthRevenue._sum.total ?? 0).toLocaleString('fr-DZ')} DA
- Factures impayées : ${unpaidCount}
- Date : ${now.toLocaleDateString('fr-DZ')}

Tu réponds en français ou en arabe selon la langue du message de l'utilisateur.
Tu es précis, professionnel et tu maîtrises la fiscalité et la comptabilité algériennes (SCF, TVA 19%, CNAS, IRG, G50).
Ne donne jamais d'informations personnelles sensibles ou de données d'autres entreprises.`

    if (!process.env.DEEPSEEK_API_KEY) {
      return apiError('Service IA non configuré', 503)
    }

    // Incrémenter le quota
    await prisma.company.update({
      where: { id: ctx.companyId },
      data: {
        aiQuotaUsed: needsReset ? 1 : { increment: 1 },
        ...(needsReset && { aiQuotaReset: now }),
      },
    })

    // Streaming avec DeepSeek
    const response = await fetch(`${process.env.DEEPSEEK_BASE_URL ?? 'https://api.deepseek.com'}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          ...parsed.data.messages,
        ],
        stream: true,
        max_tokens: 2048,
      }),
    })

    if (!response.ok) {
      return apiError('Erreur du service IA', 502)
    }

    // Passer le stream directement
    return new Response(response.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'UNAUTHORIZED') return apiError('Non authentifié', 401)
    return apiError('Erreur serveur', 500)
  }
}
