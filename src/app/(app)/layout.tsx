import { UserMenu } from "@/features/auth/user-menu";
import { AppShell } from "@/features/shell/app-shell";
import { readBrand } from "@/server/brand";

// The brand has to be right on the first frame, so this layout reads its cookie outside `Suspense`,
// which makes every signed-in route render per request (ADR 0007).
export const instant = false;

// The layout shows the user but is not the gate: layouts do not re-render on client navigation.
// The data access layer checks the session on every call.
export default async function AppLayout({ children }: LayoutProps<"/">) {
  const brand = await readBrand();

  return (
    <div data-brand={brand} className="contents">
      <AppShell userSlot={<UserMenu />}>{children}</AppShell>
    </div>
  );
}
