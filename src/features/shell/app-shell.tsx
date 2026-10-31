import { Popover } from "@nicolassancho/storybook-core";
import type { ReactNode } from "react";

import { SkipLink } from "@/shared/skip-link";

import { AppNav } from "./app-nav";

const MAIN_ID = "main";

/**
 * The signed-in layout: the navigation in a side column from the `md` breakpoint (940px) up, and in
 * a drawer opened from the top bar below it. Full width, so no `Container`.
 *
 * The navigation renders twice, once per placement. Only one is displayed at a time: the side
 * column is hidden below `md`, and the drawer is a closed popover until the menu button opens it.
 */
export const AppShell = ({ children }: { children: ReactNode }) => (
  <>
    <SkipLink targetId={MAIN_ID} />
    <div className="flex flex-1 flex-col md:grid md:grid-cols-[15rem_1fr]">
      <div className="hidden border-r border-neutral-200 bg-surface px-2 py-4 md:block">
        <AppNav />
      </div>
      <div className="flex min-w-0 flex-1 flex-col bg-neutral-50">
        <header className="flex h-14 items-center gap-2 border-b border-neutral-200 bg-surface px-4">
          <div className="md:hidden">
            <Popover placement="drawer" trigger="Menu">
              <div className="px-2 pb-4">
                <AppNav />
              </div>
            </Popover>
          </div>
        </header>
        <main id={MAIN_ID} tabIndex={-1} className="flex-1 p-4 focus:outline-hidden sm:p-6">
          {children}
        </main>
      </div>
    </div>
  </>
);
