import NextAuth from 'next-auth';
import { NextResponse } from 'next/server';
import { authConfig } from '@/lib/auth/edge-config';

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;

  const isAuthRoute = nextUrl.pathname.startsWith('/login') || nextUrl.pathname.startsWith('/register');
  const isApiAuthRoute = nextUrl.pathname.startsWith('/api/auth');
  const isApiRoute = nextUrl.pathname.startsWith('/api');
  const isPublicApiRoute = nextUrl.pathname.startsWith('/api/register');

  // Always allow auth routes and public API routes
  if (isApiAuthRoute || isPublicApiRoute) return;

  // Redirect logged-in users away from login page
  if (isAuthRoute) {
    if (isLoggedIn) {
      return Response.redirect(new URL('/', nextUrl));
    }
    return;
  }

  // Protect everything else
  if (!isLoggedIn) {
    if (isApiRoute) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    return Response.redirect(new URL('/login', nextUrl));
  }
});

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
