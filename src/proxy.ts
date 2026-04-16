import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  // Skip auth check if no password is configured (local dev)
  if (!process.env.SITE_PASSWORD) {
    return NextResponse.next();
  }

  const token = request.cookies.get("site-auth")?.value;
  if (token === process.env.SITE_PASSWORD) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/login", request.url);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - /login (the login page itself)
     * - /api/auth (the auth endpoint)
     * - /_next (Next.js internals)
     * - /favicon.ico, /icons, etc.
     */
    "/((?!login|api/auth|_next|favicon\\.ico|icons).*)",
  ],
};
