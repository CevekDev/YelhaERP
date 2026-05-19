import { NextRequest } from 'next/server'
import { sendEmail } from '@/lib/email/resend'
import { apiError, apiSuccess, rateLimitResponse } from '@/lib/security/api-response'
import { rateLimit, PUBLIC_RATE_LIMIT } from '@/lib/security/ratelimit'
import { z } from 'zod'

const bodySchema = z.object({
  name:     z.string().min(2).max(100),
  email:    z.string().email(),
  company:  z.string().min(1).max(100),
  plan:     z.enum(['STARTER', 'PRO', 'AGENCY']),
  duration: z.enum(['monthly', 'annual']),
  amount:   z.number().positive(),
})

const PLAN_LABELS: Record<string, string> = {
  STARTER: 'Starter',
  PRO:     'Pro',
  AGENCY:  'Agency',
}

export async function POST(req: NextRequest) {
  const { success, reset } = await rateLimit(req, PUBLIC_RATE_LIMIT)
  if (!success) return rateLimitResponse(reset)

  try {
    const body = await req.json()
    const parsed = bodySchema.safeParse(body)
    if (!parsed.success) return apiError('Données invalides', 400)

    const { name, email, company, plan, duration, amount } = parsed.data
    const planLabel = PLAN_LABELS[plan] ?? plan
    const durationLabel = duration === 'annual' ? 'Annuel' : 'Mensuel'

    await sendEmail({
      to: 'cvkdev@outlook.fr',
      subject: `[YelhaSubs] Nouvelle demande d'abonnement CCP — ${company}`,
      html: `
        <div style="font-family:Inter,sans-serif;max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
          <div style="background:linear-gradient(135deg,#1D9E75,#3ec79c);padding:28px 36px;">
            <h1 style="margin:0;color:#fff;font-size:20px;font-weight:700;">📋 Nouvelle demande d'abonnement</h1>
            <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">Paiement par virement CCP — à traiter manuellement</p>
          </div>
          <div style="padding:32px 36px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
              <tr><td style="padding:10px 0;border-bottom:1px solid #f1f5f9;color:#64748b;font-size:14px;width:40%;">Nom</td><td style="padding:10px 0;border-bottom:1px solid #f1f5f9;font-size:14px;font-weight:600;">${name}</td></tr>
              <tr><td style="padding:10px 0;border-bottom:1px solid #f1f5f9;color:#64748b;font-size:14px;">Email</td><td style="padding:10px 0;border-bottom:1px solid #f1f5f9;font-size:14px;"><a href="mailto:${email}" style="color:#1D9E75;">${email}</a></td></tr>
              <tr><td style="padding:10px 0;border-bottom:1px solid #f1f5f9;color:#64748b;font-size:14px;">Entreprise</td><td style="padding:10px 0;border-bottom:1px solid #f1f5f9;font-size:14px;font-weight:600;">${company}</td></tr>
              <tr><td style="padding:10px 0;border-bottom:1px solid #f1f5f9;color:#64748b;font-size:14px;">Plan</td><td style="padding:10px 0;border-bottom:1px solid #f1f5f9;font-size:14px;font-weight:600;">${planLabel}</td></tr>
              <tr><td style="padding:10px 0;border-bottom:1px solid #f1f5f9;color:#64748b;font-size:14px;">Durée</td><td style="padding:10px 0;border-bottom:1px solid #f1f5f9;font-size:14px;">${durationLabel}</td></tr>
              <tr><td style="padding:10px 0;color:#64748b;font-size:14px;">Montant</td><td style="padding:10px 0;font-size:16px;font-weight:700;color:#1D9E75;">${amount.toLocaleString('fr-DZ')} DA</td></tr>
            </table>
            <div style="margin-top:24px;background:#fefce8;border:1px solid #fde68a;border-radius:10px;padding:16px 20px;">
              <p style="margin:0;font-size:13px;color:#92400e;font-weight:600;">⚠️ Action requise</p>
              <p style="margin:8px 0 0;font-size:13px;color:#78350f;">Vérifier le reçu de virement CCP et activer manuellement le compte de <strong>${company}</strong>.</p>
            </div>
          </div>
        </div>
      `,
    })

    return apiSuccess({ message: 'Demande envoyée' })
  } catch {
    return apiError('Erreur serveur', 500)
  }
}
