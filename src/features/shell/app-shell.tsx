import { Icon, Popover } from "@nicolassancho/storybook-core";
import type { ReactNode } from "react";

import { SkipLink } from "@/shared/skip-link";
import { UserSlot } from "@/shared/user-slot";

import { AppNav } from "./app-nav";
import { RouteFocus } from "./route-focus";
import { TenantTile } from "./tenant-tile";

const MAIN_ID = "main";

const navHeader = (
  <div>
    <p className="px-3 text-sm font-semibold text-neutral-900">Counthouse</p>
    <UserSlot>
      <TenantTile />
    </UserSlot>
  </div>
);

/**
 * The signed-in layout: the navigation in a side column from the `md` breakpoint (940px) up, and in
 * a drawer opened from the top bar below it. Full width, so no `Container`.
 *
 * The navigation renders twice, once per placement. Only one is displayed at a time: the side
 * column is hidden below `md`, and the drawer is a closed popover until the menu button opens it.
 *
 * `userSlot` fills the right of the top bar. The route's layout passes it, because a feature does
 * not import another feature.
 */
export const AppShell = ({ children, userSlot }: { children: ReactNode; userSlot: ReactNode }) => (
  <>
    <SkipLink targetId={MAIN_ID} />
    <div className="flex flex-1 flex-col md:grid md:grid-cols-[15rem_1fr]">
      <div className="hidden border-r border-neutral-200 bg-surface px-2 py-4 md:block">
        <AppNav header={navHeader} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col bg-neutral-50">
        <header className="flex h-14 items-center gap-2 border-b border-neutral-200 bg-surface px-4">
          <div className="md:hidden">
            <Popover
              placement="drawer"
              trigger={
                <>
                  <Icon name="Menu" size="small" />
                  Menu
                </>
              }
            >
              <div className="px-2 pb-4">
                <AppNav header={navHeader} />
              </div>
            </Popover>
          </div>
          <div className="ml-auto">{userSlot}</div>
        </header>
        <RouteFocus targetId={MAIN_ID} />
        <main id={MAIN_ID} tabIndex={-1} className="flex-1 p-4 focus:outline-hidden sm:p-6">
          {children}
        </main>
      </div>
    </div>
  </>
);
