import { NextResponse } from 'next/server';
import {
  DEFAULT_LANGUAGE,
  LANGUAGE_COOKIE_KEY,
  detectLanguageFromAcceptLanguage,
  getLanguageFromPathname,
  isLanguage,
  localizePathname,
} from '@/lib/i18n';

export function middleware(req: Request) {
  const request = req as Request & {
    nextUrl: URL;
    cookies: {
      get: (name: string) => { value: string } | undefined;
    };
  };
  const { nextUrl } = request;

  const pathname = nextUrl.pathname;
  const { language: pathLanguage, pathnameWithoutLanguage } = getLanguageFromPathname(pathname);
  const isApiPath = pathname.startsWith('/api') || pathnameWithoutLanguage.startsWith('/api');
  const cookieLanguage = request.cookies.get(LANGUAGE_COOKIE_KEY)?.value;

  if (!pathLanguage && !isApiPath) {
    const preferredLanguage =
      (isLanguage(cookieLanguage) ? cookieLanguage : null) ??
      detectLanguageFromAcceptLanguage(request.headers.get('accept-language'));

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

  const isApiAuthRoute = pathnameWithoutLanguage.startsWith('/api/auth');
  const isApiRoute = pathnameWithoutLanguage.startsWith('/api');
  const isPublicApiRoute = pathnameWithoutLanguage.startsWith('/api/register');

  // API route handlers and dashboard layouts own auth checks so fetch() callers
  // get JSON errors and middleware stays Edge-light.
  if (isApiRoute || isApiAuthRoute || isPublicApiRoute) return responseWithLocale;

  return responseWithLocale;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|.*\\..*).*)',
  ],
};
