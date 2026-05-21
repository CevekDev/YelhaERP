import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { createAdminToken, ADMIN_COOKIE, DEFAULT_ADMIN_PASSWORD } from '@/lib/admin-auth'

const schema = z.object({ password: z.string().min(1) })

export async function POST(req: NextRequest) {
  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Corps invalide' }, { status: 400 }) }
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Mot de passe requis' }, { status: 400 })

  const { password } = parsed.data

  const config = await prisma.systemConfig.findUnique({ where: { key: 'adminAuth' } })
  const stored = config?.value as { passwordHash?: string } | null

  let valid = false
  if (stored?.passwordHash) {
    valid = await bcrypt.compare(password, stored.passwordHash)
  } else {
    valid = password === DEFAULT_ADMIN_PASSWORD
  }

  if (!valid) return NextResponse.json({ error: 'Mot de passe incorrect' }, { status: 401 })

  const token = createAdminToken()
  const isProd = process.env.NODE_ENV === 'production'

  const res = NextResponse.json({ ok: true })
  res.cookies.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60,
    path: '/',
  })
  return res
}
