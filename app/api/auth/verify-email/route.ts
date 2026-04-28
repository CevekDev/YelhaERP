import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) return NextResponse.redirect(new URL('/verify-email?error=missing', req.url))

  const user = await prisma.user.findUnique({ where: { verificationToken: token } })

  if (!user || !user.verificationExpiry || user.verificationExpiry < new Date()) {
    return NextResponse.redirect(new URL('/verify-email?error=invalid', req.url))
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerified: new Date(),
      verificationToken:  null,
      verificationExpiry: null,
    },
  })

  return NextResponse.redirect(new URL('/verify-email?success=1', req.url))
}
