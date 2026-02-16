// middleware.ts
import { getToken } from 'next-auth/jwt';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  
  const sessionToken = await getToken({ req });

  const publicRoutes = ['/', '/login', '/signup', '/register', '/forgot-password', '/reset-password', '/inactive'];
  
  // Allow access to public routes
  if (publicRoutes.includes(pathname) || pathname.startsWith('/inactive')) {
    return NextResponse.next();
  }

  // If user is logged in but trying to access auth pages, redirect to calendar
  if (sessionToken && ['/login', '/signup', '/register'].includes(pathname)) {
    // Check if user is active
    if (sessionToken.isActive === false) {
      return NextResponse.redirect(new URL('/inactive', req.url));
    }
    return NextResponse.redirect(new URL('/posts/calendar', req.url));
  }

  // Protect private routes - require authentication
  const privateRoutes = ['/posts', '/dashboard', '/profile', '/admin', '/accounts', '/analytics', '/media', '/notifications', '/features', '/blogs'];
  if (privateRoutes.some(route => pathname.startsWith(route))) {
    if (!sessionToken) {
      console.log('Redirecting to /login - no session');
      return NextResponse.redirect(new URL('/login', req.url));
    }

    // Check if user is active
    if (sessionToken.isActive === false) {
      console.log('Redirecting to /inactive - user not active');
      return NextResponse.redirect(new URL('/inactive', req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/',
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};