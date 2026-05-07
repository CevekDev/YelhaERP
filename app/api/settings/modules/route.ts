import { NextRequest, NextResponse } from 'next/server'

// Modules have been replaced by the billing subscription system.
// App visibility is now driven by YelhaSubscription.activeApps.
export async function GET(_req: NextRequest) {
  return NextResponse.redirect(new URL('/api/billing/subscription', _req.url))
}

export async function PATCH() {
  return NextResponse.json({ error: 'Utilisez /api/billing/subscription pour gérer les apps' }, { status: 410 })
}
