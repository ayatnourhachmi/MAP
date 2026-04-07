import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { routing } from "./intl/routing";

const intlMiddleware = createMiddleware(routing);

export default function middleware(request: NextRequest) {
  try {
    return intlMiddleware(request);
  } catch {
    const fallbackUrl = new URL(`/${routing.defaultLocale}`, request.url);
    return NextResponse.redirect(fallbackUrl);
  }
}

export const config = {
  matcher: ["/((?!api|trpc|_next|_vercel|.*\\..*).*)"],
};
