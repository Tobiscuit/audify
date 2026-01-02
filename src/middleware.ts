import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    // Only run middleware on dashboard and protected API routes
    '/dashboard/:path*',
    '/api/synthesize/:path*',
    '/api/batch/:path*',
  ],
};
