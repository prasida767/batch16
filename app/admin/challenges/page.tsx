import { AdminChallenges } from "@/components/admin/admin-challenges";
import {
  ErrorState,
  PageHeader,
  SetupState,
} from "@/components/league/shared";
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

  let data: Awaited<ReturnType<typeof getAdminChallengesData>>;
  try {
    data = await getAdminChallengesData();
  } catch (error) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Baaji"
          description="Declare winners on accepted baaji."
        />
        <ErrorState
          message={
            error instanceof Error
              ? error.message
              : "Couldn't load Baaji admin."
          }
        />
      </div>
    );
  }

  if (data.kind === "no_db") {
    return (
      <div className="space-y-6">
        <PageHeader title="Baaji" description="Resolve accepted side bets." />
        <SetupState
          title="Connect the database"
          body="Set DATABASE_URL before managing Baaji."
        />
      </div>
    );
  }

  if (data.kind === "error") {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Baaji"
          description="Declare winners on accepted baaji."
        />
        <ErrorState message={data.message} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Baaji"
        description="Declare winners on accepted baaji. Finished gameweeks auto-resolve when scores are in."
      />
      <AdminChallenges accepted={data.accepted} season={data.season} />
    </div>
  );
}
