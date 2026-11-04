import { getCurrentUser } from "@/server/auth";

/** The tenant's initial on the brand color, and its name. Render it behind `UserSlot`. */
export async function TenantTile() {
  const { tenant } = await getCurrentUser();

  return (
    <div className="mt-2 flex items-center gap-2 px-3">
      <span
        aria-hidden="true"
        className="flex size-8 shrink-0 items-center justify-center rounded-sm bg-primary font-semibold text-on-primary"
      >
        {tenant.name.charAt(0)}
      </span>
      <span className="min-w-0 truncate text-sm text-neutral-900">{tenant.name}</span>
    </div>
  );
}
