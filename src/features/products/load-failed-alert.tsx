import { Alert, ButtonLink } from "@nicolassancho/storybook-core";
import type { ComponentProps } from "react";

type LinkComponent = ComponentProps<typeof ButtonLink>["LinkComponent"];

/** A read that failed: what failed, Retry, and the trace id to quote when the server sent one. */
export function LoadFailedAlert({
  title,
  retryHref,
  LinkComponent,
  traceId,
  className,
}: {
  title: string;
  retryHref: string;
  LinkComponent?: LinkComponent;
  traceId?: string;
  className?: string;
}) {
  return (
    <Alert
      title={title}
      className={className}
      action={
        <ButtonLink href={retryHref} variant="outline" size="small" LinkComponent={LinkComponent}>
          Retry
        </ButtonLink>
      }
    >
      Try again. {traceId ? `If it keeps happening, quote trace id ${traceId}.` : null}
    </Alert>
  );
}
