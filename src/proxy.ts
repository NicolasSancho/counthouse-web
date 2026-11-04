import { NextResponse, type NextRequest } from "next/server";

import { ACCESS_COOKIE, REFRESH_COOKIE } from "@/server/session";

/**
 * An optimistic check from the cookies alone, so a visitor reaches the right side of sign-in
 * before a page renders. It is not the gate: the data access layer (src/server/auth.ts) checks the token
 * on every call, and a client navigation served from the prefetch cache does not reach the proxy.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  // Signed in means both cookies: with either one missing, `/products` would send the visitor away
  // again. Only `GET` is redirected, because the form posts to this path and a tab opened before
  // signing in must still be able to submit it.
  if (
    pathname === "/login" &&
    request.method === "GET" &&
    request.cookies.has(ACCESS_COOKIE) &&
    request.cookies.has(REFRESH_COOKIE)
  ) {
    return NextResponse.redirect(new URL("/products", request.url));
  }
  // Otherwise let the sign-in pages through. `/login/expired` always passes, so a refused token
  // cannot loop. Server Actions on other pages are redirected too; each action that needs the user
  // checks the session itself.
  if (pathname === "/login" || pathname === "/login/expired") return;
  // Sign-out deletes whatever cookies are left, even after the access cookie expired.
  if (pathname === "/logout") return;

  if (!request.cookies.has(REFRESH_COOKIE)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if (!request.cookies.has(ACCESS_COOKIE)) {
    return NextResponse.redirect(new URL("/login/expired", request.url));
  }
}

export const config = {
  // Everything except build assets and files with a static file extension. A route whose path
  // contains a dot, such as a product slug, still goes through the proxy.
  matcher: [
    "/((?!_next/static|_next/image|.*\\.(?:ico|png|svg|jpg|jpeg|gif|webp|avif|txt|xml|webmanifest)$).*)",
  ],
};
