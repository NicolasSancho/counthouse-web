/**
 * The first focusable element of a layout. It stays hidden until focused, then jumps past the
 * navigation to the element with the given id, which needs `tabIndex={-1}` to receive focus.
 */
export const SkipLink = ({ targetId }: { targetId: string }) => (
  <a
    href={`#${targetId}`}
    className="sr-only rounded-sm bg-surface text-sm text-neutral-900 focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-3 focus:py-2 focus:shadow-md focus:outline-hidden focus-visible:ring-2 focus-visible:ring-primary"
  >
    Skip to content
  </a>
);
