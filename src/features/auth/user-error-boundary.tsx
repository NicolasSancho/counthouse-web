"use client";

import { Button, Text } from "@nicolassancho/storybook-core";
import { catchError, type ErrorInfo } from "next/error";

function UserError(_props: object, { retry }: ErrorInfo) {
  return (
    <div className="flex items-center gap-3">
      <Text size="small" color="darker">
        Could not load your account.
      </Text>
      <Button type="button" variant="outline" size="small" onClick={() => retry()}>
        Retry
      </Button>
    </div>
  );
}

/**
 * Catches a failure to load the user, so the top bar shows a retry and the page around it stays
 * usable. `catchError` rethrows Next.js router errors, so a `redirect()` still passes through.
 */
export const UserErrorBoundary = catchError(UserError);
