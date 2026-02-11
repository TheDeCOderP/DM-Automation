// middleware.ts
import { getToken } from 'next-auth/jwt';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  
  const sessionToken = await getToken({ req });

  const publicRoutes = ['/', '/login', '/signup'];
  
  if (sessionToken && publicRoutes.includes(pathname)) {
    return NextResponse.redirect(new URL('/posts/calendar', req.url));
  }

  // Protect private routes
  const privateRoutes = ['/posts', '/dashboard', '/profile'];
  if (!sessionToken && privateRoutes.some(route => pathname.startsWith(route))) {
    console.log('Redirecting to /login');
    return NextResponse.redirect(new URL('/login', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/',
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};