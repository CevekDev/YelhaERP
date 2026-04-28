import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest, { params }: { params: { token: string; id: string } }) {
  try {
    const { action } = await req.json() as { action: 'accept' | 'reject' }
    if (!['accept', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Action invalide' }, { status: 400 })
    }

    const quote = await prisma.quote.findFirst({
      where: { id: params.id, portalToken: params.token },
    })

    if (!quote) return NextResponse.json({ error: 'Devis introuvable' }, { status: 404 })
    if (quote.status !== 'SENT') return NextResponse.json({ error: 'Ce devis ne peut plus être modifié' }, { status: 409 })

    const updated = await prisma.quote.update({
      where: { id: params.id },
      data: { status: action === 'accept' ? 'ACCEPTED' : 'REJECTED' },
    })

    return NextResponse.json(updated)
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
