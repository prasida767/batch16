import { AdminChallenges } from "@/components/admin/admin-challenges";
import { ErrorState, PageHeader, SetupState } from "@/components/league/shared";
import { getAdminChallengesData } from "@/app/challenges/actions";
import { isDatabaseConfigured } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AdminChallengesPage() {
  if (!isDatabaseConfigured()) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Baaji"
          description="Resolve accepted side bets."
        />
        <SetupState
          title="Connect the database"
          body="Set DATABASE_URL before managing Baaji."
        />
      </div>
    );
  }

  const data = await getAdminChallengesData();
  if (data.kind === "error") {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Baaji"
          description="Resolve accepted side bets."
        />
        <ErrorState message={data.message} />
      </div>
    );
  }
  if (data.kind !== "ok") {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Baaji"
          description="Resolve accepted side bets."
        />
        <SetupState
          title="Couldn't load Baaji"
          body="Try refreshing, or check that the database is connected."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Baaji"
        description="Declare winners on accepted baaji. The full season list is visible to everyone on Baaji."
      />
      <AdminChallenges accepted={data.accepted} season={data.season} />
    </div>
  );
}
