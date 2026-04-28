import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PUBLIC_PATHS = [
  '/',
  '/login',
  '/register',
  '/verify-email',
  '/onboarding',
  '/conditions',
  '/confidentialite',
  '/mentions-legales',
  '/api/auth',
  '/portal',
  '/_next',
  '/favicon.ico',
]

const AUTH_PAGES = ['/login', '/register']

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p + '/') || (p !== '/' && pathname.startsWith(p)))
}

function hasSession(req: NextRequest): boolean {
  // NextAuth v5 stores session in these cookies
  return !!(
    req.cookies.get('authjs.session-token') ||
    req.cookies.get('__Secure-authjs.session-token') ||
    req.cookies.get('next-auth.session-token') ||
    req.cookies.get('__Secure-next-auth.session-token')
  )
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const loggedIn = hasSession(req)

  // Redirect logged-in users away from auth pages
  if (loggedIn && AUTH_PAGES.some(p => pathname === p)) {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  // Protect non-public routes
  if (!isPublicPath(pathname)) {
    if (!loggedIn) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
      }
      const url = new URL('/login', req.url)
      url.searchParams.set('callbackUrl', pathname)
      return NextResponse.redirect(url)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
