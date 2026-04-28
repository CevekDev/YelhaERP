import { NextRequest } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { registerSchema } from '@/lib/validations/auth'
import { rateLimit, AUTH_RATE_LIMIT } from '@/lib/security/ratelimit'
import { apiError, apiSuccess, rateLimitResponse } from '@/lib/security/api-response'
import { sendVerificationCode } from '@/lib/email/resend'

function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

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
  const code = generateCode()
  const expiry = new Date(Date.now() + 15 * 60 * 1000) // 15 min

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
        verificationToken: code, verificationExpiry: expiry,
      },
    })
  })

  const lang = req.headers.get('accept-language')?.startsWith('ar') ? 'ar'
    : req.headers.get('accept-language')?.startsWith('en') ? 'en' : 'fr'

  try {
    await sendVerificationCode(email, code, name, lang)
  } catch {
    // Email failure doesn't block registration
  }

  return apiSuccess({ message: 'Compte créé. Vérifiez votre email.' }, 201)
}
