import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { apiError, apiSuccess } from '@/lib/security/api-response'
import { verifyCronSecret } from '@/lib/security/cron-auth'
import { generateNotificationsForUser } from '@/lib/notifications/generate'

export async function GET(req: NextRequest) {
  if (!verifyCronSecret(req)) return apiError('Non autorisé', 401)

  try {
    const users = await prisma.user.findMany({ select: { id: true } })

    let total = 0
    for (const user of users) {
      const generated = await generateNotificationsForUser(user.id)
      total += generated.length
    }

    return apiSuccess({ processed: users.length, generated: total })
  } catch (e) {
    console.error('notifications cron error:', e)
    return apiError('Erreur serveur', 500)
  }
}
