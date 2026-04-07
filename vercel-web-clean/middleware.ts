import { NextRequest, NextResponse } from "next/server";

const locales = ["en", "fr", "es", "ar", "ja", "zh", "ko", "ar-MA"] as const;
const defaultLocale = "en";

function detectLocale(request: NextRequest): string {
  const acceptLang = request.headers.get("accept-language") ?? "";
  for (const locale of locales) {
    if (acceptLang.toLowerCase().includes(locale.toLowerCase())) {
      return locale;
    }
  }
  return defaultLocale;
}

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const hasLocale = locales.some(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`)
  );

  if (hasLocale) return NextResponse.next();

  const locale = detectLocale(request);
  const url = request.nextUrl.clone();
  url.pathname = `/${locale}${pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!api|trpc|_next|_vercel|.*\\..*).*)"],
};
