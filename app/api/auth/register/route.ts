import { NextRequest } from 'next/server'
import bcrypt from 'bcryptjs'
import { randomBytes } from 'crypto'
import { prisma } from '@/lib/prisma'
import { registerSchema } from '@/lib/validations/auth'
import { rateLimit, AUTH_RATE_LIMIT } from '@/lib/security/ratelimit'
import { apiError, apiSuccess, rateLimitResponse } from '@/lib/security/api-response'
import { sendVerificationEmail } from '@/lib/email/resend'

export async function POST(req: NextRequest) {
  const { success, reset } = await rateLimit(req, AUTH_RATE_LIMIT)
  if (!success) return rateLimitResponse(reset)

  let body: unknown
  try { body = await req.json() } catch { return apiError('Corps de requête invalide', 400) }

  const parsed = registerSchema.safeParse(body)
  if (!parsed.success) return apiError('Données invalides', 422, parsed.error.flatten())

  const { name, email, password, companyName, phone, birthDate } = parsed.data

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) return apiError('Un compte avec cet email existe déjà', 409)

  const hash = await bcrypt.hash(password, 12)
  const token = randomBytes(32).toString('hex')
  const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24h

  const trialEndsAt = new Date()
  trialEndsAt.setDate(trialEndsAt.getDate() + 10)

  await prisma.$transaction(async (tx) => {
    const company = await tx.company.create({
      data: { name: companyName, plan: 'TRIAL', trialEndsAt },
    })
    await tx.user.create({
      data: {
        name, email, password: hash, role: 'OWNER',
        phone, birthDate: new Date(birthDate),
        companyId: company.id,
        verificationToken: token, verificationExpiry: expiry,
      },
    })
  })

  // Detect locale from Accept-Language header
  const lang = req.headers.get('accept-language')?.startsWith('ar') ? 'ar'
    : req.headers.get('accept-language')?.startsWith('en') ? 'en' : 'fr'

  try {
    await sendVerificationEmail(email, token, name, lang)
  } catch {
    // Email failure doesn't block registration
  }

  return apiSuccess({ message: 'Compte créé. Vérifiez votre email.' }, 201)
}
