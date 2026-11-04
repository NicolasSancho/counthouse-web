"use client";

import { catchError } from "next/error";
import { type ReactNode, Suspense } from "react";

type UserSlotProps = { fallback?: ReactNode; children: ReactNode };

const Boundary = catchError(({ fallback }: UserSlotProps) => fallback);

/**
 * Holds content that reads the user, so it streams in without blocking the shell. `fallback` shows
 * while it loads and if it fails, and the page around it stays usable. `catchError` rethrows
 * Next.js router errors, so a `redirect()` still passes through.
 */
export function UserSlot({ fallback, children }: UserSlotProps) {
  return (
    <Boundary fallback={fallback}>
      <Suspense fallback={fallback}>{children}</Suspense>
    </Boundary>
  );
}
