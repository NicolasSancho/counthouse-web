"use client";

import { Button, Text } from "@nicolassancho/storybook-core";
import { catchError } from "next/error";

function UserError() {
  return (
    <div className="flex items-center gap-3">
      <Text size="small" color="darker">
        Could not load your account.
      </Text>
      <Button type="button" variant="outline" size="small" onClick={() => window.location.reload()}>
        Retry
      </Button>
    </div>
  );
}

/**
 * Catches a failure to load the user, so the user menu shows a retry and the page around it stays
 * usable. `catchError` rethrows Next.js router errors, so a `redirect()` still passes through.
 *
 * Retry reloads the document. One failed `/auth/me` shows in several boundaries, and `retry()` from
 * `catchError` resets only its own: the others wait for the pathname to change.
 */
export const UserErrorBoundary = catchError(UserError);
