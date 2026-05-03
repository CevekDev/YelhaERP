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

    const [monthRevenue, unpaidCount, employeeCount, clientCount, stockAlerts, lastPayroll] = await Promise.all([
      prisma.invoice.aggregate({
        where: { companyId: ctx.companyId, status: 'PAID', issueDate: { gte: new Date(now.getFullYear(), now.getMonth(), 1) } },
        _sum: { total: true },
      }),
      prisma.invoice.count({ where: { companyId: ctx.companyId, status: { in: ['SENT', 'OVERDUE'] } } }),
      prisma.employee.count({ where: { companyId: ctx.companyId, isActive: true } }),
      prisma.client.count({ where: { companyId: ctx.companyId } }),
      prisma.product.count({ where: { companyId: ctx.companyId, isActive: true } }),
      prisma.payrollEntry.findMany({
        where: { companyId: ctx.companyId, month: now.getMonth() + 1, year: now.getFullYear() },
        select: { netSalary: true, grossSalary: true, cnasEmployee: true, cnasEmployer: true, irg: true },
        take: 5,
      }),
    ])

    const totalNetPayroll = lastPayroll.reduce((s, e) => s + Number(e.netSalary), 0)
    const totalCnas = lastPayroll.reduce((s, e) => s + Number(e.cnasEmployer), 0)

    const systemPrompt = `Tu es l'assistant IA de YelhaERP, un logiciel ERP SaaS pour entreprises algériennes.

DATE ACTUELLE : ${now.toLocaleDateString('fr-DZ')} (${now.toISOString().split('T')[0]})

DONNÉES RÉELLES DE L'ENTREPRISE (mois en cours) :
- Chiffre d'affaires du mois : ${Number(monthRevenue._sum.total ?? 0).toLocaleString('fr-DZ')} DA
- Factures impayées : ${unpaidCount}
- Employés actifs : ${employeeCount}
- Clients enregistrés : ${clientCount}
- Produits en catalogue : ${stockAlerts}
- Masse salariale nette du mois : ${totalNetPayroll.toLocaleString('fr-DZ')} DA
- Charges patronales CNAS du mois : ${totalCnas.toLocaleString('fr-DZ')} DA

MODULES DISPONIBLES DANS YELHAERP :
- Tableau de bord (KPIs, graphiques, alertes)
- Ventes (devis, factures, clients, portail client)
- Achats (bons de commande, réceptions, factures fournisseurs)
- Stocks (produits, mouvements, transferts, entrepôts, alertes)
- Comptabilité (journal PCN, grand livre, bilan, G50, déclarations fiscales)
- Ressources humaines (employés, paie, congés, recrutement, évaluations)
- Projets (gestion de projets, feuilles de temps)
- Production (ordres de fabrication, nomenclatures BOM)
- CRM (pipeline commercial, leads, statistiques)
- Point de Vente / POS (caisse physique, sessions, dettes clients, paiement espèces)

EXPERTISE FISCALE ET COMPTABLE ALGÉRIENNE :
- TVA : taux normal 19%, taux réduit 9% sur certains biens/services
- CNAS : cotisation salarié 9% sur salaire brut, cotisation patronale 26% sur salaire brut
- IRG 2026 (barème progressif mensuel) :
  * 0 DA : 0%
  * 20 001 à 40 000 DA : 23%
  * 40 001 à 80 000 DA : 27%
  * 80 001 à 160 000 DA : 30%
  * 160 001 à 320 000 DA : 33%
  * Au-delà de 320 000 DA : 35%
  * Abattement de 40% pour salaire unique (min 1 000 DA / max 1 500 DA)
- IBS : 19% taux normal, 26% activités hydrocarbures, 23% import/export
- TAP (Taxe sur l'Activité Professionnelle) : 2% HT pour services, 1% production
- CASNOS : 15% pour travailleurs indépendants et auto-entrepreneurs
- G50 : déclaration mensuelle TVA et CNAS (délai le 20 de chaque mois)
- Exercice fiscal : janvier–décembre
- SCF (Système Comptable Financier) : plan comptable algérien, obligatoire pour toutes les sociétés
- Bilan doit être déposé avant le 30 avril de l'année suivante

Tu peux analyser les données de l'entreprise et donner des conseils personnalisés.
Tu réponds en français ou en arabe selon la langue de l'utilisateur. Tu peux aussi répondre en anglais si l'utilisateur écrit en anglais.
Sois précis, professionnel et concis. Utilise des chiffres quand c'est pertinent.
Ne jamais inventer de données non fournies — indique clairement ce que tu ne peux pas calculer sans plus d'informations.`

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
