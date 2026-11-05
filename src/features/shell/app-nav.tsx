"use client";

import { SidebarNav, type SidebarNavItem } from "@nicolassancho/storybook-core";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { NavLink } from "@/shared/nav-link";

import { isCurrentPath } from "./is-current-path";

type NavItem = Omit<SidebarNavItem, "href" | "current"> & { href: Route };

// Only screens that exist. A typo in an href fails `typecheck`.
const navItems: NavItem[] = [{ href: "/products", label: "Products", icon: "Package" }];

/**
 * The main navigation. The client part is only `usePathname`, which marks the current item: the
 * library's `SidebarNav` cannot know the URL.
 *
 * With Cache Components, `usePathname` suspends on a route with a dynamic param that
 * `generateStaticParams` does not cover, and the build fails unless a `Suspense` boundary wraps
 * this component. No route has a dynamic param today, so there is none yet.
 *
 * `header` comes from the shell, because it reads the tenant on the server.
 */
export const AppNav = ({ header }: { header: ReactNode }) => {
  const pathname = usePathname();

  return (
    <SidebarNav
      LinkComponent={NavLink}
      header={header}
      items={navItems.map((item) => ({
        ...item,
        current: isCurrentPath(pathname, item.href),
      }))}
    />
  );
};
