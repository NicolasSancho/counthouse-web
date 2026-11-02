import { Text } from "@nicolassancho/storybook-core";

import { getCurrentUser } from "@/server/auth";

import { ROLE_NAMES } from "./role-names";

/**
 * The signed-in user's name and role in the top bar. Render it behind `Suspense`: it reads the
 * session, and a refused token redirects to `/login/expired` while the page streams.
 */
export async function CurrentUser() {
  const { user } = await getCurrentUser();

  return (
    <Text size="small" color="darker">
      <span className="font-medium">{user.name}</span>
      <span className="text-neutral-700"> · {ROLE_NAMES[user.role]}</span>
    </Text>
  );
}
