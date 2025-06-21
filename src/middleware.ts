import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth';

export function middleware(request: NextRequest) {
  // Only protect /calendar routes
  if (request.nextUrl.pathname.startsWith('/calendar')) {
    const token = request.cookies.get('auth-token')?.value;
    
    if (!token || !verifyToken(token)) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/calendar/:path*']
};