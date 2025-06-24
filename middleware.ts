import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  console.log('🛡️ Middleware checking path:', pathname);
  
  // Public routes that don't need authentication
  const publicRoutes = [
    '/login',
    '/', // Home page
  ];
  
  // API routes that don't need middleware checks
  const publicApiRoutes = [
    '/api/auth/login',
    '/api/auth/logout', 
    '/api/debug-users',
    '/api/debug-auth',
    '/api/generate-hash'
  ];
  
  // Static files and Next.js internal routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.endsWith('.ico') ||
    pathname.endsWith('.png') ||
    pathname.endsWith('.jpg') ||
    pathname.endsWith('.svg')
  ) {
    return NextResponse.next();
  }
  
  // Allow public API routes
  if (publicApiRoutes.some(route => pathname.startsWith(route))) {
    console.log('✅ Public API route, allowing access');
    return NextResponse.next();
  }
  
  // Allow public routes
  if (publicRoutes.includes(pathname)) {
    console.log('✅ Public route, allowing access');
    return NextResponse.next();
  }
  
  // All other routes require authentication (including /admin and /calendar)
  console.log('🔒 Protected route, checking authentication...');
  
  // Check for auth token
  const token = request.cookies.get('auth-token')?.value;
  
  if (!token) {
    console.log('❌ No auth token found, redirecting to login');
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Verify token
  const user = verifyToken(token);
  if (!user) {
    console.log('❌ Invalid token, redirecting to login');
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete('auth-token');
    return response;
  }

  console.log('✅ Valid token found, allowing access');
  
  // For admin routes, we'll let the page handle admin permission checks
  // since we need to query the database for the user's role
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes that we handle above)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (public assets)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|public).*)',
  ],
};