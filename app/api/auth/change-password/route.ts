import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { apiSuccess, apiError, rateLimitResponse } from '@/lib/security/api-response'
import { rateLimit, rateLimitByKey, AUTH_RATE_LIMIT } from '@/lib/security/ratelimit'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const schema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string()
    .min(8, 'Min. 8 caractères')
    .regex(/[A-Z]/, '1 majuscule requise')
    .regex(/[0-9]/, '1 chiffre requis'),
})

export async function POST(req: NextRequest) {
  const rl = await rateLimit(req, AUTH_RATE_LIMIT)
  if (!rl.success) return rateLimitResponse(rl.reset)
  try {
    const session = await auth()
    const userId = session?.user?.id
    if (!userId) return apiError('Non autorisé', 401)

    // Bruteforce par session volée : 10 tentatives / 15 min par user
    const attempts = await rateLimitByKey(`pwd_change:${userId}`, { limit: 10, windowMs: 15 * 60_000 })
    if (!attempts.success) return apiError('Trop de tentatives — réessayez dans 15 minutes', 429)

    let body: unknown
    try { body = await req.json() } catch { return apiError('Corps invalide', 400) }
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message ?? 'Mot de passe invalide (min. 8 car., 1 majuscule, 1 chiffre)'
      return apiError(msg, 422)
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, password: true },
    })
    if (!user) return apiError('Utilisateur introuvable', 404)
    if (!user.password) return apiError('Les comptes connectés via Google ne peuvent pas changer de mot de passe.', 400)

    const valid = await bcrypt.compare(parsed.data.currentPassword, user.password)
    if (!valid) return apiError('Mot de passe actuel incorrect', 400)

    const hashed = await bcrypt.hash(parsed.data.newPassword, 12)
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashed },
    })

    return apiSuccess({ message: 'Mot de passe modifié avec succès' })
  } catch {
    return apiError('Erreur serveur', 500)
  }
}
