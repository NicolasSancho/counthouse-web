"use client";

import { Alert, Button } from "@nicolassancho/storybook-core";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * For unexpected failures on a signed-in page. It sits under the `(app)` layout, so the shell stays.
 * Next.js resets this boundary only when the pathname changes, so a move to another list URL, which
 * keeps `/products`, has to retry here.
 */
export default function AppError({
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  const search = useSearchParams().toString();
  const [failedSearch] = useState(search);

  useEffect(() => {
    if (search !== failedSearch) retry();
  }, [search, failedSearch, retry]);

  return (
    <Alert
      title="Something went wrong."
      action={
        <Button type="button" variant="outline" size="small" onClick={() => retry()}>
          Retry
        </Button>
      }
    >
      Try again. If it keeps happening, come back later.
    </Alert>
  );
}
