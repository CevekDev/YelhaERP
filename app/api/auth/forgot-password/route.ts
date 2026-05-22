import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { apiSuccess, apiError, rateLimitResponse } from '@/lib/security/api-response'
import { rateLimit, rateLimitByKey, AUTH_RATE_LIMIT } from '@/lib/security/ratelimit'
import { sendPasswordReset } from '@/lib/email/resend'
import crypto from 'crypto'
import { z } from 'zod'

const schema = z.object({ email: z.string().email() })

export async function POST(req: NextRequest) {
  const rl = await rateLimit(req, AUTH_RATE_LIMIT)
  if (!rl.success) return rateLimitResponse(rl.reset)

  let body: unknown
  try { body = await req.json() } catch { return apiError('Corps invalide', 400) }
  const parsed = schema.safeParse(body)
  if (!parsed.success) return apiError('Email invalide', 422)

  const { email } = parsed.data

  // Anti-spam : 3 demandes / heure par email
  const emailRl = await rateLimitByKey(`pwd_reset_req:${email.toLowerCase()}`, { limit: 3, windowMs: 60 * 60_000 })
  if (!emailRl.success) return apiError('Trop de demandes — réessayez dans 1 heure', 429)

  try {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: { id: true, name: true, email: true, password: true },
    })

    // Toujours retourner succès pour éviter l'énumération d'emails
    if (!user || !user.password) {
      return apiSuccess({ message: 'Si ce compte existe, un email a été envoyé.' })
    }

    const rawToken = crypto.randomBytes(32).toString('hex')
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex')
    const expiry = new Date(Date.now() + 60 * 60_000) // 1 heure

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: tokenHash,
        passwordResetExpiry: expiry,
      },
    })

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://subs.yelha.net'
    const resetUrl = `${appUrl}/reset-password?token=${rawToken}`

    await sendPasswordReset({ to: user.email, name: user.name, resetUrl })

    return apiSuccess({ message: 'Si ce compte existe, un email a été envoyé.' })
  } catch {
    return apiError('Erreur serveur', 500)
  }
}
