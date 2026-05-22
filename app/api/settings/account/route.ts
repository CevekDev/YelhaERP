import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { apiSuccess, apiError, rateLimitResponse } from '@/lib/security/api-response'
import { rateLimit, rateLimitByKey, AUTH_RATE_LIMIT } from '@/lib/security/ratelimit'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const schema = z.object({
  password: z.string().optional(),
  confirm: z.literal('SUPPRIMER MON COMPTE'),
})

export async function DELETE(req: NextRequest) {
  const rl = await rateLimit(req, AUTH_RATE_LIMIT)
  if (!rl.success) return rateLimitResponse(rl.reset)

  try {
    const session = await auth()
    const userId = session?.user?.id
    if (!userId) return apiError('Non autorisé', 401)

    // Throttle: 3 tentatives / heure par user
    const userRl = await rateLimitByKey(`acct_delete:${userId}`, { limit: 3, windowMs: 60 * 60_000 })
    if (!userRl.success) return apiError('Trop de tentatives — réessayez dans 1 heure', 429)

    let body: unknown
    try { body = await req.json() } catch { return apiError('Corps invalide', 400) }
    const parsed = schema.safeParse(body)
    if (!parsed.success) return apiError('Vous devez taper exactement "SUPPRIMER MON COMPTE"', 422)

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, password: true, role: true },
    })
    if (!user) return apiError('Utilisateur introuvable', 404)

    // If user has a password, they must provide it
    if (user.password) {
      if (!parsed.data.password) return apiError('Mot de passe requis', 422)
      const valid = await bcrypt.compare(parsed.data.password, user.password)
      if (!valid) return apiError('Mot de passe incorrect', 400)
    }

    // Cascade delete via Prisma (onDelete: Cascade on User relations)
    await prisma.user.delete({ where: { id: userId } })

    return apiSuccess({ deleted: true })
  } catch {
    return apiError('Erreur serveur', 500)
  }
}
