// Next.js 16: proxy.ts replaces middleware.ts
// Node.js runtime (NOT Edge) — Prisma can be imported safely here
import { auth } from '@/auth'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Public routes — no auth required
const PUBLIC_ROUTES = ['/login', '/register', '/api/auth']

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow public routes and static assets
  if (
    PUBLIC_ROUTES.some((r) => pathname.startsWith(r)) ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon')
  ) {
    return NextResponse.next()
  }

  // Allow cron endpoint (authenticated by CRON_SECRET header, not session)
  if (pathname === '/api/cron/boletos') {
    return NextResponse.next()
  }

  const session = await auth()

  if (!session) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Role-based route protection
  const role = session.user.role

  // Financial routes — DIRETOR and FINANCEIRA only
  if (pathname.startsWith('/financeiro')) {
    if (role !== 'DIRETOR' && role !== 'FINANCEIRA') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  // Academic admin routes — DIRETOR and COORDENADOR only
  if (pathname.startsWith('/cadastros') || pathname.startsWith('/cursos')) {
    if (role !== 'DIRETOR' && role !== 'COORDENADOR') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  // Turmas — PROFESSOR also needs access for chamada and notas (IDOR enforced at page level)
  if (pathname.startsWith('/turmas')) {
    if (role !== 'DIRETOR' && role !== 'COORDENADOR' && role !== 'PROFESSOR') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
