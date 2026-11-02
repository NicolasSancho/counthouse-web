import type { Metadata } from "next";

import { LoginScreen } from "@/features/auth/login-screen";

export const metadata: Metadata = { title: "Session expired" };

// A route of its own rather than `/login?reason=expired`: reading `searchParams` needs a Suspense
// boundary, and with one on the page a sign-in posted without JavaScript comes back blank.
export default function ExpiredPage() {
  return <LoginScreen expired />;
}
