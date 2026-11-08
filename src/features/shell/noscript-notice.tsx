import { Alert } from "@nicolassancho/storybook-core";

/**
 * Signed-in screens stream their content behind `Suspense`, and only React's inline scripts reveal
 * it, so without JavaScript they stay on their loading state (ADR 0009). This says so instead.
 */
export function NoScriptNotice() {
  return (
    <noscript>
      <Alert title="Counthouse needs JavaScript." className="mb-4">
        Turn JavaScript on in your browser to see your products. You can still sign out from the
        account menu.
      </Alert>
    </noscript>
  );
}
