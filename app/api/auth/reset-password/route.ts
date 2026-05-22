import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { apiSuccess, apiError, rateLimitResponse } from '@/lib/security/api-response'
import { rateLimit, rateLimitByKey, AUTH_RATE_LIMIT } from '@/lib/security/ratelimit'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { z } from 'zod'

const schema = z.object({
  token: z.string().min(1),
  password: z.string()
    .min(8, 'Min. 8 caractères')
    .regex(/[A-Z]/, '1 majuscule requise')
    .regex(/[0-9]/, '1 chiffre requis'),
})

export async function POST(req: NextRequest) {
  const rl = await rateLimit(req, AUTH_RATE_LIMIT)
  if (!rl.success) return rateLimitResponse(rl.reset)

  let body: unknown
  try { body = await req.json() } catch { return apiError('Corps invalide', 400) }
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? 'Données invalides'
    return apiError(msg, 422)
  }

  const { token, password } = parsed.data

  // Anti-bruteforce : 5 tentatives / 15 min par IP
  const ipRl = await rateLimitByKey(`pwd_reset_use:${req.headers.get('x-forwarded-for') ?? 'unknown'}`, { limit: 5, windowMs: 15 * 60_000 })
  if (!ipRl.success) return apiError('Trop de tentatives — réessayez dans 15 minutes', 429)

  try {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex')

    const user = await prisma.user.findFirst({
      where: {
        passwordResetToken: tokenHash,
        passwordResetExpiry: { gt: new Date() },
      },
      select: { id: true },
    })

    if (!user) return apiError('Lien invalide ou expiré', 400)

    const hashed = await bcrypt.hash(password, 12)
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashed,
        passwordResetToken: null,
        passwordResetExpiry: null,
      },
    })

    return apiSuccess({ message: 'Mot de passe réinitialisé avec succès.' })
  } catch {
    return apiError('Erreur serveur', 500)
  }
}
