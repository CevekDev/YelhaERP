import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { rateLimit, PUBLIC_RATE_LIMIT, AUTHENTICATED_RATE_LIMIT, AUTH_RATE_LIMIT } from '@/lib/security/ratelimit'
import { rateLimitResponse } from '@/lib/security/api-response'

// Routes publiques (pas d'auth requise)
const PUBLIC_PATHS = [
  '/',
  '/login',
  '/register',
  '/verify-email',
  '/conditions',
  '/confidentialite',
  '/mentions-legales',
  '/api/auth',
  '/portal',
  '/_next',
  '/favicon.ico',
]

// Routes d'auth (rate limit strict)
const AUTH_PATHS = ['/login', '/register', '/api/auth']

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(p => pathname.startsWith(p))
}

function isAuthPath(pathname: string): boolean {
  return AUTH_PATHS.some(p => pathname.startsWith(p))
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Rate limiting
  const isAuth = isAuthPath(pathname)
  const isApi = pathname.startsWith('/api/')
  const isPublic = isPublicPath(pathname)

  let rateLimitConfig = PUBLIC_RATE_LIMIT
  if (isAuth) rateLimitConfig = AUTH_RATE_LIMIT
  else if (isApi) rateLimitConfig = AUTHENTICATED_RATE_LIMIT

  const { success, reset } = await rateLimit(req, rateLimitConfig)
  if (!success) {
    return rateLimitResponse(reset)
  }

  // Vérification auth pour les routes protégées
  if (!isPublic) {
    const session = await auth()
    if (!session?.user?.id) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
      }
      const url = new URL('/login', req.url)
      url.searchParams.set('callbackUrl', pathname)
      return NextResponse.redirect(url)
    }

    // Rediriger vers l'onboarding si l'entreprise n'a pas de businessType
    // (géré côté client pour éviter les boucles)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
