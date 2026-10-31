import Link from "next/link";
import type { ComponentProps } from "react";

type Href = ComponentProps<typeof Link>["href"];

/**
 * `next/link` for library components (`LinkComponent`). With typed routes, Next.js types `href` as
 * a known route, and the library passes a plain string. The hrefs come from this app's own typed
 * props, so the cast hides nothing the compiler could have checked.
 */
export const NavLink = ({
  href,
  ...props
}: Omit<ComponentProps<typeof Link>, "href"> & { href: string }) => (
  <Link href={href as Href} {...props} />
);
