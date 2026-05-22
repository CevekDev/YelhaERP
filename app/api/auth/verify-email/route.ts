import { NextRequest } from 'next/server'
import crypto from 'crypto'
import { prisma } from '@/lib/prisma'
import { apiError, apiSuccess, rateLimitResponse } from '@/lib/security/api-response'
import { rateLimit, rateLimitByKey, AUTH_RATE_LIMIT } from '@/lib/security/ratelimit'
import { sendTrialWelcome } from '@/lib/email/resend'

function pickLang(req: NextRequest): 'fr' | 'en' | 'ar' {
  const al = req.headers.get('accept-language') ?? ''
  if (al.startsWith('ar')) return 'ar'
  if (al.startsWith('en')) return 'en'
  return 'fr'
}

export async function POST(req: NextRequest) {
  const rl = await rateLimit(req, AUTH_RATE_LIMIT)
  if (!rl.success) return rateLimitResponse(rl.reset)

  let body: unknown
  try { body = await req.json() } catch { return apiError('Corps de requête invalide', 400) }

  const { email, code } = body as { email?: string; code?: string }
  if (!email || !code) return apiError('Email et code requis', 400)

  // Per-email attempt limit: 5 tentatives / 15 min — bloque le brute-force du code à 6 chiffres
  const emailNorm = email.toLowerCase().trim()
  const attempts = await rateLimitByKey(`verify_email:${emailNorm}`, { limit: 5, windowMs: 15 * 60_000 })
  if (!attempts.success) return apiError('Trop de tentatives — réessayez dans 15 minutes', 429)

  const user = await prisma.user.findUnique({ where: { email: emailNorm } })

  if (!user || !user.verificationToken || !user.verificationExpiry) {
    return apiError('Code invalide', 400)
  }

  if (user.emailVerified) {
    return apiError('Email déjà vérifié', 400)
  }

  if (user.verificationExpiry < new Date()) {
    return apiError('Code expiré', 400)
  }

  // Comparaison constant-time pour éviter une oracle de timing sur le code
  const tokenBuf = Buffer.from(user.verificationToken)
  const codeBuf = Buffer.from(code)
  const match = tokenBuf.length === codeBuf.length && crypto.timingSafeEqual(tokenBuf, codeBuf)
  if (!match) return apiError('Code incorrect', 400)

  await prisma.user.update({
    where: { id: user.id },
    data: { emailVerified: new Date(), verificationToken: null, verificationExpiry: null },
  })

  try {
    const trialEndsAt = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000)
    await prisma.yelhaSubscription.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        planId: 'trial',
        status: 'TRIAL',
        billingCycle: 'MONTHLY',
        trialEndsAt,
        currentPeriodStart: new Date(),
        currentPeriodEnd: trialEndsAt,
        monthlyAmount: 0,
        limitEmails: 50,
        limitApiReq: 500,
      },
      update: {},
    })
    await sendTrialWelcome({ to: emailNorm, name: user.name, trialEndsAt })
  } catch {
    // non-blocking
  }

  return apiSuccess({ message: 'Email vérifié avec succès' })
}

// Resend code
export async function PUT(req: NextRequest) {
  const rl = await rateLimit(req, AUTH_RATE_LIMIT)
  if (!rl.success) return rateLimitResponse(rl.reset)

  let body: unknown
  try { body = await req.json() } catch { return apiError('Corps de requête invalide', 400) }

  const { email } = body as { email?: string }
  if (!email) return apiError('Email requis', 400)

  // Per-email resend limit: 3 par heure — évite l'email bombing via le renvoi
  const emailNorm = email.toLowerCase().trim()
  const resend = await rateLimitByKey(`verify_resend:${emailNorm}`, { limit: 3, windowMs: 60 * 60_000 })
  if (!resend.success) return apiError('Trop de demandes — réessayez dans 1 heure', 429)

  const user = await prisma.user.findUnique({ where: { email: emailNorm } })
  if (!user || user.emailVerified) return apiError('Impossible de renvoyer le code', 400)

  // crypto.randomInt (CSPRNG) au lieu de Math.random
  const code = String(crypto.randomInt(100000, 1000000))
  const expiry = new Date(Date.now() + 15 * 60 * 1000)

  await prisma.user.update({
    where: { id: user.id },
    data: { verificationToken: code, verificationExpiry: expiry },
  })

  try {
    const { sendVerificationCode } = await import('@/lib/email/resend')
    await sendVerificationCode(emailNorm, code, user.name, pickLang(req))
  } catch {
    return apiError('Erreur envoi email', 500)
  }

  return apiSuccess({ message: 'Code renvoyé' })
}
