// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
    console.log('Middleware triggered');
  const { pathname } = request.nextUrl;
  
  // Get session token from cookies
  const sessionToken = request.cookies.get('next-auth.session-token')?.value || 
                       request.cookies.get('__Secure-next-auth.session-token')?.value;
  
  console.log('Session token exists:', !!sessionToken);
  console.log('Pathname:', pathname);

  // Public routes that should redirect to dashboard if authenticated
  const publicRoutes = ['/', '/login', '/signup'];
  
  if (sessionToken && publicRoutes.includes(pathname)) {
    console.log('Redirecting to /posts/calendar');
    return NextResponse.redirect(new URL('/posts/calendar', request.url));
  }

  // Protect private routes
  const privateRoutes = ['/posts', '/dashboard', '/profile'];
  if (!sessionToken && privateRoutes.some(route => pathname.startsWith(route))) {
    console.log('Redirecting to /login');
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/',
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};