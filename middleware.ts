import { NextRequest, NextResponse } from 'next/server'
import { updateSession } from './src/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  // Refresh the Supabase session so server and client stay in sync
  const response = await updateSession(request)
  return response
}

// Run on all routes except Next.js internals and static assets
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}

