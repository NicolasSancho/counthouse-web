import { Card, Text } from "@nicolassancho/storybook-core";

import { getDemoAccounts } from "@/server/demo";
import { readApiMode } from "@/server/env";

import { DemoBlock } from "./demo-block";
import { LoginForm } from "./login-form";

/**
 * The sign-in page. Like every page, it renders per request for the script policy (ADR 0010), so
 * the demo block follows the server's `API_MODE`.
 */
export function LoginScreen({ expired = false }: { expired?: boolean }) {
  const demo = readApiMode() === "mock";

  return (
    <main className="flex flex-1 flex-col items-center bg-neutral-50 px-4 py-12">
      <Text as="p" size="large" weight="bold" color="darker" className="mb-6">
        Counthouse
      </Text>
      <Card className="flex w-full max-w-sm flex-col gap-6 p-6">
        <Text as="h1" size="large" weight="semibold" color="darker">
          Sign in
        </Text>
        {expired && (
          <p className="rounded-sm border border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-900">
            Your session expired. Sign in again.
          </p>
        )}
        {demo && (
          <>
            <DemoBlock accounts={getDemoAccounts()} />
            <p className="flex items-center gap-3 text-sm text-neutral-700 before:h-px before:flex-1 before:bg-neutral-200 after:h-px after:flex-1 after:bg-neutral-200">
              or sign in with your account
            </p>
          </>
        )}
        <LoginForm primary={!demo} />
      </Card>
    </main>
  );
}
