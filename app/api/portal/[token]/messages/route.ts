import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(_req: NextRequest, { params }: { params: { token: string } }) {
  try {
    // Verify token is valid (either invoice or quote portal token)
    const quote = await prisma.quote.findFirst({ where: { portalToken: params.token } })
    const invoice = !quote ? await prisma.invoice.findFirst({ where: { portalToken: params.token } }) : null

    if (!quote && !invoice) return NextResponse.json({ error: 'Token invalide' }, { status: 404 })

    const messages = await prisma.clientMessage.findMany({
      where: { token: params.token },
      orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json(messages)
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: { params: { token: string } }) {
  try {
    const { content } = await req.json() as { content: string }
    if (!content?.trim()) return NextResponse.json({ error: 'Message vide' }, { status: 400 })
    if (content.length > 2000) return NextResponse.json({ error: 'Message trop long' }, { status: 400 })

    // Resolve clientId and companyId from token
    const quote = await prisma.quote.findFirst({
      where: { portalToken: params.token },
      select: { clientId: true, companyId: true },
    })
    const invoice = !quote ? await prisma.invoice.findFirst({
      where: { portalToken: params.token },
      select: { clientId: true, companyId: true },
    }) : null

    const record = quote ?? invoice
    if (!record) return NextResponse.json({ error: 'Token invalide' }, { status: 404 })

    const message = await prisma.clientMessage.create({
      data: {
        companyId: record.companyId,
        clientId: record.clientId,
        token: params.token,
        content: content.trim(),
        fromClient: true,
      },
    })

    return NextResponse.json(message, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
