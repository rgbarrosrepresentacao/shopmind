import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

// Routes that don't require authentication
const publicRoutes = ['/login', '/cadastro', '/auth/callback']

export async function middleware(request: NextRequest) {
  const { supabaseResponse, user } = await updateSession(request)
  const { pathname } = request.nextUrl

  console.log(`[Middleware] Path: ${pathname} | User: ${user?.id || 'null'}`)
  console.log(`[Middleware] COOKIES RECEIVED:`, request.cookies.getAll().map(c => c.name).join(', '))

  // Allow public routes without authentication
  const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route))
  if (isPublicRoute) {
    // If user is already logged in and visits login/cadastro, redirect to dashboard
    if (user && (pathname === '/login' || pathname === '/cadastro')) {
      console.log(`[Middleware] Redirecting logged-in user from ${pathname} to /dashboard`)
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }
    return supabaseResponse
  }

  // If user is not authenticated, redirect to login
  if (!user) {
    console.log(`[Middleware] Redirecting unauthenticated user from ${pathname} to /login`)
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirect', pathname)
    return NextResponse.redirect(url)
  }

  // If accessing root, redirect to dashboard
  if (pathname === '/') {
    console.log(`[Middleware] Redirecting root to /dashboard`)
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
