"use client";

import { Alert, Button } from "@nicolassancho/storybook-core";

export default function RootError({
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <main className="flex flex-1 flex-col items-center bg-neutral-50 px-4 py-12">
      <Alert
        title="Something went wrong."
        className="w-full max-w-md"
        action={
          <Button type="button" variant="outline" size="small" onClick={() => retry()}>
            Retry
          </Button>
        }
      >
        Try again. If it keeps happening, come back later.
      </Alert>
    </main>
  );
}
