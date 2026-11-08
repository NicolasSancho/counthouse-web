"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * After a client navigation to another page, the link that was used has gone and focus is left on
 * `<body>`. This moves it to the main content, as the skip link does, so the next Tab reaches the
 * page's first control. A first load keeps the browser's own focus, and focus that is somewhere
 * else on purpose is left alone.
 */
export function RouteFocus({ targetId }: { targetId: string }) {
  const pathname = usePathname();
  const firstRender = useRef(true);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const active = document.activeElement;
    if (active && active !== document.body) return;
    document.getElementById(targetId)?.focus({ preventScroll: true });
  }, [pathname, targetId]);

  return null;
}
