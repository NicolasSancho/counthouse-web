import { Button } from "@nicolassancho/storybook-core";

/**
 * A plain form `POST` to `/logout`, so signing out loads a new document (see
 * src/app/(auth)/logout/route.ts). It needs no user data, so it renders outside the streamed parts
 * of the user menu: it is there without JavaScript and when the user fails to load.
 */
export function SignOutButton() {
  return (
    <form method="post" action="/logout">
      <Button type="submit" variant="outline" size="small">
        Sign out
      </Button>
    </form>
  );
}
