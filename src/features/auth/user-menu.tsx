import { Icon, Popover, Text } from "@nicolassancho/storybook-core";
import { Suspense } from "react";

import { getCurrentUser } from "@/server/auth";
import { UserSlot } from "@/shared/user-slot";

import { ROLE_NAMES } from "./role-names";
import { SignOutButton } from "./sign-out-button";
import { UserErrorBoundary } from "./user-error-boundary";

async function TriggerName() {
  const { user } = await getCurrentUser();

  return (
    <span className="flex min-w-0 items-center gap-1">
      <span className="max-w-28 truncate sm:max-w-40">{user.name}</span>
      {/* The role is in the panel too, so it gives way on a narrow screen. */}
      <span className="hidden sm:inline">· {ROLE_NAMES[user.role]}</span>
    </span>
  );
}

async function UserDetails() {
  const { user, tenant } = await getCurrentUser();

  return (
    <div className="wrap-break-word">
      <Text size="small" color="darker" weight="semibold">
        {user.name}
      </Text>
      <Text size="small">{user.email}</Text>
      <Text size="small">
        {ROLE_NAMES[user.role]} · {tenant.name}
      </Text>
    </div>
  );
}

/**
 * The signed-in user's menu in the top bar. A disclosure, not an ARIA menu: the panel holds text and
 * one form.
 *
 * Only what reads the user streams. The button and Sign out render without it, so Sign out
 * works while the user loads, when loading fails and without JavaScript, where the native
 * `popovertarget` opens the panel.
 */
export function UserMenu() {
  return (
    <Popover
      placement="bottom-end"
      className="w-72 p-3"
      trigger={
        <>
          <UserSlot fallback="Account">
            <TriggerName />
          </UserSlot>
          <Icon name="ChevronDown" size="small" />
        </>
      }
    >
      <UserErrorBoundary>
        <Suspense>
          <UserDetails />
        </Suspense>
      </UserErrorBoundary>
      <hr className="my-3 border-neutral-200" />
      <SignOutButton />
    </Popover>
  );
}
