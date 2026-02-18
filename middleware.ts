import { NextRequest, NextResponse } from 'next/server';

const protectedRoutes = [
  '/dashboard',
  '/modules',
  '/api/modules',
];

const authRoutes = ['/api/auth'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if it's a protected route
  const isProtectedRoute = protectedRoutes.some((route) => pathname.startsWith(route));

  if (isProtectedRoute) {
    const sessionCookie = request.cookies.get('datasync_session');

    if (!sessionCookie) {
      // Redirect to login for protected routes
      const loginUrl = new URL('/', request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};
