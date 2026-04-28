import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { apiError, apiSuccess } from '@/lib/security/api-response'
import { generateNotificationsForCompany } from '@/lib/notifications/generate'

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) return apiError('Non autorisé', 401)

  try {
    const companies = await prisma.company.findMany({ select: { id: true } })

    let total = 0
    for (const company of companies) {
      const generated = await generateNotificationsForCompany(company.id)
      total += generated.length
    }

    return apiSuccess({ processed: companies.length, generated: total })
  } catch (e) {
    console.error('notifications cron error:', e)
    return apiError('Erreur serveur', 500)
  }
}
