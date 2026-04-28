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
  conversationId: z.string().optional(),
})

export async function POST(req: NextRequest) {
  const { success, reset } = await rateLimit(req, AI_RATE_LIMIT)
  if (!success) return rateLimitResponse(reset)

  try {
    const ctx = await getTenantContext()
    const company = await prisma.company.findUnique({
      where: { id: ctx.companyId },
      select: { aiQuotaUsed: true, aiQuotaReset: true, plan: true },
    })
    if (!company) return apiError('Entreprise introuvable', 404)

    const now = new Date()
    const resetDate = new Date(company.aiQuotaReset)
    const needsReset = now.getMonth() !== resetDate.getMonth() || now.getFullYear() !== resetDate.getFullYear()
    const quota = AI_QUOTAS[company.plan] ?? 30
    const currentUsage = needsReset ? 0 : company.aiQuotaUsed
    if (currentUsage >= quota) return apiError('Quota IA mensuel atteint. Passez à un plan supérieur.', 429)

    let body: unknown
    try { body = await req.json() } catch { return apiError('Corps invalide', 400) }
    const parsed = schema.safeParse(body)
    if (!parsed.success) return apiError('Données invalides', 422)

    const [monthRevenue, unpaidCount] = await Promise.all([
      prisma.invoice.aggregate({
        where: { companyId: ctx.companyId, status: 'PAID', issueDate: { gte: new Date(now.getFullYear(), now.getMonth(), 1) } },
        _sum: { total: true },
      }),
      prisma.invoice.count({ where: { companyId: ctx.companyId, status: { in: ['SENT', 'OVERDUE'] } } }),
    ])

    const systemPrompt = `Tu es l'assistant IA de YelhaERP, un logiciel de gestion pour entreprises algériennes.
Contexte : CA du mois = ${Number(monthRevenue._sum.total ?? 0).toLocaleString('fr-DZ')} DA | Factures impayées : ${unpaidCount} | Date : ${now.toLocaleDateString('fr-DZ')}
Tu réponds en français ou en arabe selon la langue de l'utilisateur.
Tu maîtrises la fiscalité et comptabilité algériennes (SCF, TVA 19%/9%, CNAS 9%+26%, IRG 2026, G50, IBS, CASNOS).
Sois précis, professionnel et concis.`

    if (!process.env.DEEPSEEK_API_KEY) return apiError('Service IA non configuré', 503)

    await prisma.company.update({
      where: { id: ctx.companyId },
      data: { aiQuotaUsed: needsReset ? 1 : { increment: 1 }, ...(needsReset && { aiQuotaReset: now }) },
    })

    const response = await fetch(`${process.env.DEEPSEEK_BASE_URL ?? 'https://api.deepseek.com'}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}` },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'system', content: systemPrompt }, ...parsed.data.messages],
        stream: true,
        max_tokens: 2048,
      }),
    })

    if (!response.ok) return apiError('Erreur du service IA', 502)

    // Parse SSE and stream only the text content
    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      async start(controller) {
        const reader = response.body!.getReader()
        const decoder = new TextDecoder()
        let buffer = ''
        let fullContent = ''

        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            buffer += decoder.decode(value, { stream: true })
            const lines = buffer.split('\n')
            buffer = lines.pop() ?? ''

            for (const line of lines) {
              const trimmed = line.trim()
              if (!trimmed.startsWith('data:')) continue
              const data = trimmed.slice(5).trim()
              if (data === '[DONE]') continue
              try {
                const json = JSON.parse(data)
                const content = json.choices?.[0]?.delta?.content
                if (content) {
                  fullContent += content
                  controller.enqueue(encoder.encode(content))
                }
              } catch { /* skip malformed chunks */ }
            }
          }
        } finally {
          controller.close()

          // Save conversation to DB after stream ends
          if (parsed.data.conversationId) {
            const allMessages = [...parsed.data.messages, { role: 'assistant', content: fullContent }]
            await prisma.aiConversation.update({
              where: { id: parsed.data.conversationId },
              data: { messages: allMessages },
            }).catch(() => {})
          }
        }
      },
    })

    return new Response(readable, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache', 'X-Accel-Buffering': 'no' },
    })
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'UNAUTHORIZED') return apiError('Non authentifié', 401)
    return apiError('Erreur serveur', 500)
  }
}
