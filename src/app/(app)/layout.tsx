import { Suspense } from "react";

import { CurrentUser } from "@/features/auth/current-user";
import { SignOutButton } from "@/features/auth/sign-out-button";
import { UserErrorBoundary } from "@/features/auth/user-error-boundary";
import { AppShell } from "@/features/shell/app-shell";

// The layout shows the user but is not the gate: layouts do not re-render on client navigation.
// The data access layer checks the session on every call.
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <AppShell
      userSlot={
        <div className="flex items-center gap-3">
          <UserErrorBoundary>
            <Suspense>
              <CurrentUser />
            </Suspense>
          </UserErrorBoundary>
          <SignOutButton />
        </div>
      }
    >
      {children}
    </AppShell>
  );
}
