import { type NextRequest } from "next/server";

import { signOut } from "@/server/auth";

/**
 * Sign-out, posted by a plain form so the browser loads `/login` as a new document. A Server
 * Action redirect is a client navigation, and Next.js keeps the previous screen in the page,
 * hidden, so the signed-out user's data would stay in the DOM.
 *
 * Route Handlers do not get the Server Action origin check, so this repeats it: a request whose
 * `Origin` names another host is refused. As in Next.js, a request without `Origin` passes; it
 * cannot carry the `SameSite=Lax` cookies from another site.
 */
export async function POST(request: NextRequest) {
  if (!isSameOrigin(request.headers)) return new Response(null, { status: 403 });

  await signOut();
  // 303, so the browser follows with a GET.
  return new Response(null, { status: 303, headers: { Location: "/login" } });
}

function isSameOrigin(headers: Headers): boolean {
  const origin = headers.get("origin");
  if (origin === null) return true;
  const host = headers.get("x-forwarded-host")?.split(",")[0]?.trim() || headers.get("host");
  return URL.parse(origin)?.host === host;
}
