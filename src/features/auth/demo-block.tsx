import { Button, Text } from "@nicolassancho/storybook-core";

import type { DemoAccount } from "@/server/demo";

import { signInAsDemo } from "./actions";
import { ROLE_NAMES } from "./role-names";

/**
 * The demo entry on the sign-in page, shown in mock mode only. Each button posts the account's
 * email to a Server Action, so it works without JavaScript; the other accounts sit in a native
 * `<details>` for the same reason.
 */
export function DemoBlock({ accounts }: { accounts: DemoAccount[] }) {
  const [main, ...others] = accounts;
  if (!main) return null;

  return (
    <section aria-labelledby="demo-title" className="flex flex-col gap-3">
      <Text as="h2" size="small" weight="semibold" color="darker">
        <span id="demo-title">Demo mode.</span>{" "}
        <span className="font-normal">Data is simulated. No account needed.</span>
      </Text>
      <form action={signInAsDemo} className="flex flex-col gap-2">
        <input type="hidden" name="email" value={main.email} />
        <Button type="submit" variant="primary" className="w-full justify-center">
          Enter the demo
        </Button>
        <Text size="small">
          You will be signed in as an {ROLE_NAMES[main.role]} of {main.tenantName}.
        </Text>
      </form>
      {others.length > 0 && (
        <details className="text-sm text-neutral-900">
          <summary className="cursor-pointer font-medium text-primary-darker">
            Other demo accounts
          </summary>
          <ul className="mt-2 flex flex-col divide-y divide-neutral-200">
            {others.map((account) => (
              <li key={account.email} className="flex items-center gap-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">
                    {account.name}, {ROLE_NAMES[account.role]} · {account.tenantName}
                  </p>
                  <p className="break-words text-neutral-700">{account.email}</p>
                  <p className="text-neutral-700">Password: {account.password}</p>
                </div>
                <form action={signInAsDemo}>
                  <input type="hidden" name="email" value={account.email} />
                  <Button type="submit" variant="outline" size="small">
                    Use<span className="sr-only"> {account.name}</span>
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
