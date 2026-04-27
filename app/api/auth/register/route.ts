import { NextRequest } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { registerSchema } from '@/lib/validations/auth'
import { rateLimit, AUTH_RATE_LIMIT } from '@/lib/security/ratelimit'
import { apiError, apiSuccess, rateLimitResponse } from '@/lib/security/api-response'

export async function POST(req: NextRequest) {
  const { success, reset } = await rateLimit(req, AUTH_RATE_LIMIT)
  if (!success) return rateLimitResponse(reset)

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return apiError('Corps de requête invalide', 400)
  }

  const parsed = registerSchema.safeParse(body)
  if (!parsed.success) {
    return apiError('Données invalides', 422, parsed.error.flatten())
  }

  const { name, email, password, companyName } = parsed.data

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    // Réponse identique pour éviter l'énumération d'emails
    return apiError('Un compte avec cet email existe déjà', 409)
  }

  const hash = await bcrypt.hash(password, 12)

  const trialEndsAt = new Date()
  trialEndsAt.setDate(trialEndsAt.getDate() + 10)

  await prisma.$transaction(async (tx) => {
    const company = await tx.company.create({
      data: {
        name: companyName,
        plan: 'TRIAL',
        trialEndsAt,
      },
    })

    await tx.user.create({
      data: {
        name,
        email,
        password: hash,
        role: 'OWNER',
        companyId: company.id,
      },
    })
  })

  return apiSuccess({ message: 'Compte créé avec succès' }, 201)
}
