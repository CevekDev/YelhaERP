import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { cookies } from 'next/headers'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { verifyAdminToken, ADMIN_COOKIE } from '@/lib/admin-auth'

const schema = z.object({ newPassword: z.string().min(8, 'Minimum 8 caractères') })

export async function POST(req: NextRequest) {
  const token = cookies().get(ADMIN_COOKIE)?.value
  if (!token || !verifyAdminToken(token)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Corps invalide' }, { status: 400 }) }
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })

  const hash = await bcrypt.hash(parsed.data.newPassword, 12)
  await prisma.systemConfig.upsert({
    where: { key: 'adminAuth' },
    update: { value: { passwordHash: hash } },
    create: { key: 'adminAuth', value: { passwordHash: hash } },
  })

  return NextResponse.json({ ok: true })
}
