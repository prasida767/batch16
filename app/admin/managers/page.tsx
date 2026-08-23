import { ManagersAdmin } from "@/components/admin/managers-admin";
import { PageHeader, SetupState } from "@/components/league/shared";
import {
  getPrizeAdminData,
  listAdminManagers,
} from "@/app/admin/actions";
import { isDatabaseConfigured } from "@/lib/db";
import { DEFAULT_CURRENCY } from "@/lib/prizes";

export const dynamic = "force-dynamic";

export default async function AdminManagersPage() {
  if (!isDatabaseConfigured()) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Managers"
          description="Add, remove, and sync league managers."
        />
        <SetupState
          title="Connect the database"
          body="Set DATABASE_URL in .env.local to manage managers."
        />
      </div>
    );
  }

  const managers = await listAdminManagers();
  const prize = await getPrizeAdminData().catch(() => null);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Managers"
        description="Keep the roster aligned with your FPL classic league."
      />
      <ManagersAdmin
        managers={managers}
        currency={prize?.config.currency ?? DEFAULT_CURRENCY}
      />
    </div>
  );
}
