import { UserMenu } from "@/features/auth/user-menu";
import { AppShell } from "@/features/shell/app-shell";

// The layout shows the user but is not the gate: layouts do not re-render on client navigation.
// The data access layer checks the session on every call.
export default function AppLayout({ children }: LayoutProps<"/">) {
  return <AppShell userSlot={<UserMenu />}>{children}</AppShell>;
}
