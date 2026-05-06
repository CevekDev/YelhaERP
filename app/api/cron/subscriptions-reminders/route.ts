import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { apiError, apiSuccess } from '@/lib/security/api-response'
import { sendEmail } from '@/lib/email/resend'

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) return apiError('Non autorisé', 401)

  try {
    const now = new Date()
    const in3days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)

    // Active subscriptions with nextBilling in the next 3 days
    const expiringSoon = await prisma.subscription.findMany({
      where: {
        status: 'ACTIVE',
        nextBilling: {
          gte: now,
          lte: in3days,
        },
      },
      include: {
        client: { select: { name: true, email: true } },
        plan: { select: { name: true } },
        company: { select: { name: true } },
      },
    })

    let sent = 0

    for (const sub of expiringSoon) {
      if (!sub.client.email || !sub.nextBilling) continue

      const daysUntil = Math.round(
        (sub.nextBilling.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      )

      const isUrgent = daysUntil <= 1
      const dayLabel = isUrgent ? 'demain' : `dans ${daysUntil} jour${daysUntil > 1 ? 's' : ''}`

      try {
        await sendEmail({
          to: sub.client.email,
          subject: `Rappel : abonnement ${sub.plan.name} expire ${dayLabel}`,
          html: `
            <div style="font-family:Inter,sans-serif;max-width:560px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.06);">
              <div style="background:linear-gradient(135deg,#1D9E75,#3ec79c);padding:32px 40px;text-align:center;">
                <span style="color:#fff;font-size:22px;font-weight:800;">📊 YelhaERP</span>
              </div>
              <div style="padding:40px;">
                <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0f172a;">
                  ${isUrgent ? '⚠️' : '⏰'} Renouvellement ${dayLabel}
                </h1>
                <p style="margin:0 0 24px;color:#64748b;font-size:15px;line-height:1.6;">
                  Bonjour ${sub.client.name},<br/>
                  Votre abonnement <strong>${sub.plan.name}</strong> chez <strong>${sub.company.name}</strong> expire ${dayLabel}.
                </p>
                <div style="background:${isUrgent ? '#fef2f2' : '#fefce8'};border:1px solid ${isUrgent ? '#fecaca' : '#fde68a'};border-radius:12px;padding:16px 20px;margin-bottom:24px;">
                  <p style="margin:0;font-size:14px;font-weight:600;color:${isUrgent ? '#991b1b' : '#92400e'};">
                    📅 Date d'échéance : <strong>${sub.nextBilling.toLocaleDateString('fr-DZ', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>
                  </p>
                </div>
                <p style="margin:0;color:#64748b;font-size:14px;">
                  Pour renouveler votre abonnement, contactez-nous ou consultez votre espace client.
                </p>
              </div>
              <div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 40px;text-align:center;">
                <p style="margin:0;color:#94a3b8;font-size:12px;">© ${now.getFullYear()} YelhaERP — Alger, Algérie</p>
              </div>
            </div>
          `,
        })
        sent++
      } catch { /* email non critique */ }
    }

    // Mark overdue subscriptions as EXPIRED (nextBilling passed by more than 7 days)
    const overdueLimit = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const expired = await prisma.subscription.updateMany({
      where: {
        status: 'ACTIVE',
        nextBilling: { lt: overdueLimit },
      },
      data: { status: 'EXPIRED' },
    })

    return apiSuccess({ remindersSent: sent, markedExpired: expired.count })
  } catch (e) {
    console.error('subscriptions-reminders cron error:', e)
    return apiError('Erreur serveur', 500)
  }
}
