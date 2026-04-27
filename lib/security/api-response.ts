import { NextResponse } from 'next/server'

export function apiError(
  message: string,
  status: number,
  details?: unknown
): NextResponse {
  const body: Record<string, unknown> = { error: message }
  if (process.env.NODE_ENV === 'development' && details) {
    body.details = details
  }
  return NextResponse.json(body, { status })
}

export function apiSuccess<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(data, { status })
}

export function rateLimitResponse(reset: number): NextResponse {
  return NextResponse.json(
    { error: 'Trop de requêtes. Réessayez dans un moment.' },
    {
      status: 429,
      headers: {
        'Retry-After': String(Math.ceil((reset - Date.now()) / 1000)),
        'X-RateLimit-Reset': String(reset),
      },
    }
  )
}
