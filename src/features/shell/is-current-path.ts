/**
 * Whether a nav item's href is the current page or a page below it. `/products/42` is under
 * `/products`, while `/products-archive` is not.
 */
export const isCurrentPath = (pathname: string, href: string) =>
  pathname === href || pathname.startsWith(`${href}/`);
