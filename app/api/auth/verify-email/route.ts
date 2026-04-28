import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { apiError, apiSuccess } from '@/lib/security/api-response'
import { sendWelcomeEmail } from '@/lib/email/resend'

export async function POST(req: NextRequest) {
  let body: unknown
  try { body = await req.json() } catch { return apiError('Corps de requête invalide', 400) }

  const { email, code } = body as { email?: string; code?: string }
  if (!email || !code) return apiError('Email et code requis', 400)

  const user = await prisma.user.findUnique({ where: { email } })

  if (!user || !user.verificationToken || !user.verificationExpiry) {
    return apiError('Code invalide', 400)
  }

  if (user.emailVerified) {
    return apiError('Email déjà vérifié', 400)
  }

  if (user.verificationExpiry < new Date()) {
    return apiError('Code expiré', 400)
  }

  if (user.verificationToken !== code) {
    return apiError('Code incorrect', 400)
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { emailVerified: new Date(), verificationToken: null, verificationExpiry: null },
  })

  const lang = req.headers.get('accept-language')?.startsWith('ar') ? 'ar'
    : req.headers.get('accept-language')?.startsWith('en') ? 'en' : 'fr'

  try {
    await sendWelcomeEmail(email, user.name, lang)
  } catch {
    // non-blocking
  }

  return apiSuccess({ message: 'Email vérifié avec succès' })
}

// Resend code
export async function PUT(req: NextRequest) {
  let body: unknown
  try { body = await req.json() } catch { return apiError('Corps de requête invalide', 400) }

  const { email } = body as { email?: string }
  if (!email) return apiError('Email requis', 400)

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user || user.emailVerified) return apiError('Impossible de renvoyer le code', 400)

  const code = Math.floor(100000 + Math.random() * 900000).toString()
  const expiry = new Date(Date.now() + 15 * 60 * 1000)

  await prisma.user.update({
    where: { id: user.id },
    data: { verificationToken: code, verificationExpiry: expiry },
  })

  const lang = req.headers.get('accept-language')?.startsWith('ar') ? 'ar'
    : req.headers.get('accept-language')?.startsWith('en') ? 'en' : 'fr'

  try {
    const { sendVerificationCode } = await import('@/lib/email/resend')
    await sendVerificationCode(email, code, user.name, lang)
  } catch {
    return apiError('Erreur envoi email', 500)
  }

  return apiSuccess({ message: 'Code renvoyé' })
}
