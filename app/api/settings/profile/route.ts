import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { getTenantContext } from '@/lib/security/tenant'
import { apiSuccess, apiError } from '@/lib/security/api-response'
import { auth } from '@/lib/auth'

const schema = z.object({
  name:  z.string().min(1).max(100).optional(),
  phone: z.string().max(30).optional(),
})

export async function GET() {
  try {
    await getTenantContext()
    const session = await auth()
    const userId = session?.user?.id
    if (!userId) return apiError('Non autorisé', 401)

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, phone: true, role: true, createdAt: true, password: true },
    })
    if (!user) return apiError('Utilisateur introuvable', 404)
    const { password, ...rest } = user
    return apiSuccess({ ...rest, hasPassword: !!password })
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'UNAUTHORIZED') return apiError('Non autorisé', 401)
    return apiError('Erreur serveur', 500)
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await getTenantContext()
    const session = await auth()
    const userId = session?.user?.id
    if (!userId) return apiError('Non autorisé', 401)

    let body: unknown
    try { body = await req.json() } catch { return apiError('Corps invalide', 400) }
    const parsed = schema.safeParse(body)
    if (!parsed.success) return apiError('Données invalides', 400)

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(parsed.data.name  ? { name: parsed.data.name } : {}),
        ...(parsed.data.phone !== undefined ? { phone: parsed.data.phone } : {}),
      },
      select: { id: true, name: true, email: true, phone: true },
    })

    return apiSuccess(user)
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'UNAUTHORIZED') return apiError('Non autorisé', 401)
    return apiError('Erreur serveur', 500)
  }
}
