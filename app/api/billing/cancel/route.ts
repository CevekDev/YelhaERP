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

    const { userId } = await getTenantContext()

    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) return apiError('Données invalides', 422, parsed.error.flatten())

    const { reason } = parsed.data

    const sub = await prisma.yelhaSubscription.findUnique({ where: { userId } })
    if (!sub) return apiError('Abonnement introuvable', 404)

    if (sub.status === 'CANCELLED') {
      return apiError('L\'abonnement est déjà annulé', 409)
    }

    const now = new Date()
    await prisma.yelhaSubscription.update({
      where: { userId },
      data: { status: 'CANCELLED', cancelledAt: now },
    })

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    })

    await sendEmail({
      to: 'cvkdev@outlook.fr',
      subject: `[YelhaSubs] Annulation abonnement — ${user?.name ?? userId}`,
      html: `
        <h2>Annulation d'abonnement</h2>
        <p><strong>Utilisateur :</strong> ${user?.name ?? 'Inconnu'} (${userId})</p>
        <p><strong>Email :</strong> ${user?.email ?? ''}</p>
        <p><strong>Plan :</strong> ${sub.planId}</p>
        <p><strong>Statut précédent :</strong> ${sub.status}</p>
        <p><strong>Date d'annulation :</strong> ${now.toISOString()}</p>
        <p><strong>Raison :</strong></p>
        <blockquote style="border-left:4px solid #e2e8f0;padding-left:16px;color:#475569;">${reason}</blockquote>
      `,
    }).catch(() => {})

    return apiSuccess({ cancelled: true, cancelledAt: now })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erreur'
    if (msg === 'UNAUTHORIZED') return apiError('Non authentifié', 401)
    return apiError('Erreur serveur', 500, err)
  }
}
