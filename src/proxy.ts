import { NextResponse, type NextRequest } from "next/server";

import { refreshAccessToken } from "@/server/refresh";
import {
  ACCESS_COOKIE,
  accessCookie,
  unwrapAccessToken,
  REFRESH_COOKIE,
  SESSION_COOKIES,
} from "@/server/session";

function redirectTo(path: string, request: NextRequest) {
  return NextResponse.redirect(new URL(path, request.url));
}

/** Sends the request on with its headers, which `request.cookies` keeps up to date. */
function forward(request: NextRequest) {
  return NextResponse.next({ request: { headers: request.headers } });
}

/**
 * Sends a visitor to the right side of sign-in before a page renders, and renews an expired access
 * token, the one thing that has to happen here: a Server Component cannot set cookies. It is not
 * the gate: the data access layer (src/server/auth.ts) checks the token on every call, and a client
 * navigation served from the prefetch cache does not reach the proxy.
 *
 * Only `GET` and `HEAD` are redirected. A redirected Server Action `POST` is replayed on the
 * sign-in page, which has no such action, so it fails there. It passes instead, and the action
 * redirects when it reads the session.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  // `/login/expired` always passes, so a token the API refuses cannot loop. Sign-out deletes
  // whatever cookies are left, even after the access cookie expired.
  if (pathname === "/login/expired" || pathname === "/logout") return;

  const isRead = request.method === "GET" || request.method === "HEAD";
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;

  if (pathname === "/login") {
    // A refresh cookie means a session, and `/products` deals with whatever state it is in. The
    // form posts to this path, and a tab opened before signing in must still be able to submit it.
    return isRead && refreshToken ? redirectTo("/products", request) : undefined;
  }
  if (!refreshToken) return isRead ? redirectTo("/login", request) : undefined;
  if (unwrapAccessToken(request.cookies.get(ACCESS_COOKIE)?.value, refreshToken)) return;

  const result = await refreshAccessToken(refreshToken);
  switch (result.outcome) {
    case "refreshed": {
      const cookie = accessCookie(result.accessToken, result.expiresIn, refreshToken);
      // On the request too, so this render reads the new token.
      request.cookies.set(ACCESS_COOKIE, cookie.value);
      const response = forward(request);
      response.cookies.set(cookie);
      // A static route would otherwise send the token on a response marked as cacheable.
      response.headers.set("Cache-Control", "private, no-store");
      return response;
    }
    case "refused": {
      if (!isRead) {
        // The action finds no session and redirects. No deletion here: Next.js merges it into the
        // cookies of the action, which leaves them empty instead of gone. The next load clears them.
        request.cookies.delete(REFRESH_COOKIE);
        return forward(request);
      }
      const response = redirectTo("/login/expired", request);
      for (const cookie of SESSION_COOKIES) response.cookies.delete(cookie);
      return response;
    }
    case "unavailable":
      // The token may be fine, so the session stays. The page shows what any API failure shows.
      return;
  }
}

export const config = {
  // Everything except build assets and files with a static file extension. A route whose path
  // contains a dot, such as a product slug, still goes through the proxy.
  matcher: [
    "/((?!_next/static|_next/image|.*\\.(?:ico|png|svg|jpg|jpeg|gif|webp|avif|txt|xml|webmanifest)$).*)",
  ],
};
