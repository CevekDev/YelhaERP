import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getTenantContext } from '@/lib/security/tenant'
import { apiError, apiSuccess, rateLimitResponse } from '@/lib/security/api-response'
import { rateLimit, AUTHENTICATED_RATE_LIMIT } from '@/lib/security/ratelimit'
import { sendEmail } from '@/lib/email/resend'

const schema = z.object({
  reason: z.string().min(1, 'La raison est requise').max(1000),
})

export async function POST(req: NextRequest) {
  try {
    const rl = await rateLimit(req, AUTHENTICATED_RATE_LIMIT)
    if (!rl.success) return rateLimitResponse(rl.reset)

    const { companyId, userId } = await getTenantContext()

    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) return apiError('Données invalides', 422, parsed.error.flatten())

    const { reason } = parsed.data

    const sub = await prisma.yelhaSubscription.findUnique({ where: { companyId } })
    if (!sub) return apiError('Abonnement introuvable', 404)

    if (sub.status === 'CANCELLED') {
      return apiError('L\'abonnement est déjà annulé', 409)
    }

    const now = new Date()
    await prisma.yelhaSubscription.update({
      where: { companyId },
      data: { status: 'CANCELLED', cancelledAt: now },
    })

    // Get company info for email
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { name: true },
    })

    // Send notification email to Yelha team
    await sendEmail({
      to: 'cvkdev@outlook.fr',
      subject: `[YelhaSubs] Annulation abonnement — ${company?.name ?? companyId}`,
      html: `
        <h2>Annulation d'abonnement</h2>
        <p><strong>Entreprise :</strong> ${company?.name ?? 'Inconnue'} (${companyId})</p>
        <p><strong>Plan :</strong> ${sub.planId}</p>
        <p><strong>Statut précédent :</strong> ${sub.status}</p>
        <p><strong>Date d'annulation :</strong> ${now.toISOString()}</p>
        <p><strong>Raison :</strong></p>
        <blockquote style="border-left:4px solid #e2e8f0;padding-left:16px;color:#475569;">${reason}</blockquote>
        <p style="color:#94a3b8;font-size:12px;">UserID : ${userId}</p>
      `,
    }).catch(() => {}) // Non-blocking

    return apiSuccess({ cancelled: true, cancelledAt: now })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erreur'
    if (msg === 'UNAUTHORIZED') return apiError('Non authentifié', 401)
    return apiError('Erreur serveur', 500, err)
  }
}
