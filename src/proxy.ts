import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { publicEnv } from '@/lib/env'

/**
 * Next.js 16 renamed Middleware to Proxy. This runs before every matched
 * request on the Node.js runtime.
 *
 * Its job is narrow on purpose:
 *   1. refresh the Supabase session cookie so Server Components see a live token
 *   2. an *optimistic* redirect for signed-out users hitting private routes
 *
 * It is not the authorization boundary. Proxy runs on prefetches too, so it
 * only reads the cookie and never touches the database. Real checks live in
 * src/lib/dal.ts, next to the data.
 */

const PUBLIC_PREFIXES = [
  '/login',
  '/signup',
  '/auth',
  '/discover',
  '/coaches',
  '/legal',
]

function isPublicPath(pathname: string) {
  if (pathname === '/') return true
  return PUBLIC_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  )
}

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })

  // Read through publicEnv so a missing variable fails with an actionable
  // message instead of Supabase's generic "URL and Key are required".
  const supabase = createServerClient(
    publicEnv.supabaseUrl,
    publicEnv.supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet, headers) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value)
          }
          response = NextResponse.next({ request })
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options)
          }
          // Responses that set auth cookies must never be cached by a CDN,
          // or one user's token can be served to another.
          for (const [key, value] of Object.entries(headers)) {
            response.headers.set(key, value)
          }
        },
      },
    },
  )

  // getClaims() validates the JWT locally and refreshes it when expired, which
  // is what keeps the cookie fresh for the request that follows.
  const { data } = await supabase.auth.getClaims()
  const pathname = request.nextUrl.pathname

  if (!data?.claims && !isPublicPath(pathname)) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  return response
}

export const config = {
  matcher: [
    // Everything except Next internals and static files. Auth benefits from
    // running on all routes so the session is refreshed wherever the user lands.
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|woff2?)$).*)',
  ],
}
