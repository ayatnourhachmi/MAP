import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { routing } from "./intl/routing";

let intlMiddleware: ReturnType<typeof createMiddleware> | null = null;

function getIntlMiddleware() {
  if (!intlMiddleware) {
    intlMiddleware = createMiddleware(routing);
  }
  return intlMiddleware;
}

export default function middleware(request: NextRequest) {
  try {
    return getIntlMiddleware()(request);
  } catch {
    const fallbackUrl = new URL(`/${routing.defaultLocale}`, request.url);
    return NextResponse.redirect(fallbackUrl);
  }
}

export const config = {
  matcher: ["/((?!api|trpc|_next|_vercel|.*\\..*).*)"],
};
