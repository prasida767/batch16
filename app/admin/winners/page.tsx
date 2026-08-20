import { WinnersAdmin } from "@/components/admin/winners-admin";
import { ErrorState, PageHeader, SetupState } from "@/components/league/shared";
import { getWinnersAdminData } from "@/app/admin/actions";
import { isDatabaseConfigured } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AdminWinnersPage({
  searchParams,
}: {
  searchParams: Promise<{ gw?: string }>;
}) {
  if (!isDatabaseConfigured()) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Weekly winners"
          description="Manually mark gameweek winners."
        />
        <SetupState
          title="Connect the database"
          body="Set DATABASE_URL in .env.local to store weekly results."
        />
      </div>
    );
  }

  const params = await searchParams;
  const gw = params.gw ? Number(params.gw) : undefined;
  const data = await getWinnersAdminData(
    Number.isInteger(gw) && (gw as number) > 0 ? gw : undefined,
  );

  if (data.kind === "no_league") {
    return (
      <div className="space-y-6">
        <PageHeader title="Weekly winners" />
        <SetupState
          title="Add your FPL league ID"
          body="Set FPL_LEAGUE_ID in .env.local so we can load gameweek scores."
        />
      </div>
    );
  }

  if (data.kind === "no_db") {
    return (
      <div className="space-y-6">
        <PageHeader title="Weekly winners" />
        <SetupState
          title="Connect the database"
          body="Set DATABASE_URL to save winner overrides."
        />
      </div>
    );
  }

  if (data.kind === "error") {
    return (
      <div className="space-y-6">
        <PageHeader title="Weekly winners" />
        <ErrorState message={data.message} />
      </div>
    );
  }

  if (data.managers.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Weekly winners"
          description="Sync managers before marking winners."
        />
        <SetupState
          title="No managers in the database"
          body="Go to Admin → Managers and sync from your FPL league first."
          href="/admin/managers"
          cta="Manage roster"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Weekly winners"
        description="Override auto winners for ties or delayed FPL data."
      />
      <WinnersAdmin
        key={data.selected}
        events={data.events}
        selected={data.selected}
        week={data.week}
        syncedEntryIds={data.managers
          .map((m) => m.fplEntryId)
          .filter((id): id is number => id != null)}
      />
    </div>
  );
}
