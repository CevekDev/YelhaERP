import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { apiError, apiSuccess } from '@/lib/security/api-response'

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) return apiError('Non autorisé', 401)

  try {
    const now = new Date()
    const quotes = await prisma.quote.findMany({
      where: {
        status: 'SENT',
        followUpAt: { lte: now },
        followUpCount: { lt: 3 },
      },
      include: { client: true, company: true },
    })

    let sent = 0
    for (const quote of quotes) {
      try {
        if (quote.client.email) {
          const { sendEmail } = await import('@/lib/email/resend')
          await sendEmail({
            to: quote.client.email,
            subject: `Rappel — Devis ${quote.number} en attente de votre réponse`,
            html: `
              <p>Bonjour ${quote.client.name},</p>
              <p>Nous vous rappelons que le devis <strong>${quote.number}</strong> d'un montant de est en attente de votre réponse.</p>
              <p>Merci de nous contacter pour toute question.</p>
              <p>Cordialement,<br/>${quote.company.name}</p>
            `,
          })
        }
      } catch { /* email non critique */ }

      await prisma.quote.update({
        where: { id: quote.id },
        data: {
          followUpAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
          followUpCount: quote.followUpCount + 1,
        },
      })
      sent++
    }

    return apiSuccess({ processed: sent })
  } catch (e) {
    console.error('quotes-followup cron error:', e)
    return apiError('Erreur serveur', 500)
  }
}
