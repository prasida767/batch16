import { PrizeConfigForm } from "@/components/admin/prize-config-form";
import { PageHeader, SetupState } from "@/components/league/shared";
import { getPrizeAdminData } from "@/app/admin/actions";
import { isDatabaseConfigured } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  if (!isDatabaseConfigured()) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Prize settings"
          description="Entry fees and payout structure for the league."
        />
        <SetupState
          title="Connect the database"
          body="Set DATABASE_URL in .env.local and run npm run db:migrate."
        />
      </div>
    );
  }

  const { config, managerCount } = await getPrizeAdminData();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Prize settings"
        description="Allocate the pot across weekly, season, and custom prizes — remaining updates live."
      />
      <PrizeConfigForm initial={config} managerCount={managerCount} />
    </div>
  );
}
