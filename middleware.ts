import NextAuth from 'next-auth';
import { NextResponse } from 'next/server';
import { authConfig } from '@/lib/auth/edge-config';
import {
  DEFAULT_LANGUAGE,
  LANGUAGE_COOKIE_KEY,
  detectLanguageFromAcceptLanguage,
  getLanguageFromPathname,
  isLanguage,
  localizePathname,
} from '@/lib/i18n';

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;

  const pathname = nextUrl.pathname;
  const { language: pathLanguage, pathnameWithoutLanguage } = getLanguageFromPathname(pathname);
  const isApiPath = pathname.startsWith('/api') || pathnameWithoutLanguage.startsWith('/api');
  const cookieLanguage = req.cookies.get(LANGUAGE_COOKIE_KEY)?.value;

  if (!pathLanguage && !isApiPath) {
    const preferredLanguage =
      (isLanguage(cookieLanguage) ? cookieLanguage : null) ??
      detectLanguageFromAcceptLanguage(req.headers.get('accept-language'));

    const redirectLanguage = preferredLanguage || DEFAULT_LANGUAGE;
    const redirectUrl = new URL(localizePathname(pathname, redirectLanguage), nextUrl);
    redirectUrl.search = nextUrl.search;

    const redirectResponse = NextResponse.redirect(redirectUrl);
    redirectResponse.cookies.set(LANGUAGE_COOKIE_KEY, redirectLanguage, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });
    return redirectResponse;
  }

  const rewriteUrl = new URL(pathnameWithoutLanguage, nextUrl);
  rewriteUrl.search = nextUrl.search;
  const responseWithLocale = pathnameWithoutLanguage !== pathname
    ? NextResponse.rewrite(rewriteUrl)
    : NextResponse.next();

  if (pathLanguage) {
    responseWithLocale.cookies.set(LANGUAGE_COOKIE_KEY, pathLanguage, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });
  }

  const isAuthRoute = pathnameWithoutLanguage.startsWith('/login') || pathnameWithoutLanguage.startsWith('/register');
  const isApiAuthRoute = pathnameWithoutLanguage.startsWith('/api/auth');
  const isApiRoute = pathnameWithoutLanguage.startsWith('/api');
  const isPublicApiRoute = pathnameWithoutLanguage.startsWith('/api/register');

  // Always allow auth routes and public API routes
  if (isApiAuthRoute || isPublicApiRoute) return responseWithLocale;

  // Redirect logged-in users away from login page
  if (isAuthRoute) {
    if (isLoggedIn) {
      return Response.redirect(new URL(localizePathname('/', pathLanguage ?? DEFAULT_LANGUAGE), nextUrl));
    }
    return responseWithLocale;
  }

  // Protect everything else
  if (!isLoggedIn) {
    if (isApiRoute) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    return Response.redirect(new URL(localizePathname('/login', pathLanguage ?? DEFAULT_LANGUAGE), nextUrl));
  }

  return responseWithLocale;
});

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|.*\\..*).*)',
  ],
};
