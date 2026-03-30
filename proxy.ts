import { NextResponse, type NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

const authenticatedPages = ['/dashboard', '/discover', '/submit', '/profile', '/proof', '/network']
const publicAuthPages = ['/', '/login', '/signup']
const protectedApiPrefixes = ['/api/discovery', '/api/jobs', '/api/profile', '/api/proofs', '/api/reputation', '/api/network']
const authApiPrefixes = ['/api/auth']

function isMatch(pathname: string, prefixes: string[]) {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET ?? process.env.SESSION_SECRET ?? 'proofmesh-dev-secret',
  })
  const isAuthenticated = Boolean(token?.sub)

  if (isMatch(pathname, authApiPrefixes)) {
    return NextResponse.next()
  }

  if (isMatch(pathname, authenticatedPages)) {
    if (!isAuthenticated) {
      return NextResponse.redirect(new URL('/', request.url))
    }
    return NextResponse.next()
  }

  if (isMatch(pathname, publicAuthPages)) {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    return NextResponse.next()
  }

  if (isMatch(pathname, protectedApiPrefixes)) {
    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/',
    '/login/:path*',
    '/signup/:path*',
    '/dashboard/:path*',
    '/discover/:path*',
    '/network/:path*',
    '/submit/:path*',
    '/profile/:path*',
    '/proof/:path*',
    '/api/discovery/:path*',
    '/api/jobs/:path*',
    '/api/network/:path*',
    '/api/profile/:path*',
    '/api/proofs/:path*',
    '/api/reputation/:path*',
  ],
}
