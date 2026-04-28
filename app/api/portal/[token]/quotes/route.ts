import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(_req: NextRequest, { params }: { params: { token: string } }) {
  try {
    const quote = await prisma.quote.findFirst({
      where: { portalToken: params.token },
      include: {
        client: { select: { id: true, name: true, email: true } },
        lines: true,
        company: { select: { name: true, nif: true, address: true, phone: true, legalForm: true, rc: true } },
      },
    })

    if (!quote) return NextResponse.json({ error: 'Devis introuvable' }, { status: 404 })

    // Fetch messages by portal token
    const messages = await prisma.clientMessage.findMany({
      where: { token: params.token },
      orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json({ ...quote, messages })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
