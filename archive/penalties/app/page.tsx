import { PenaltiesLobby } from "@/components/penalties/penalties-lobby";
import { PageHeader, SetupState } from "@/components/league/shared";
import { FadeIn } from "@/components/motion/page-transition";
import { getPenaltiesPageData } from "@/app/penalties/actions";
import { getAuthUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function PenaltiesPage() {
  const [data, user] = await Promise.all([
    getPenaltiesPageData(),
    getAuthUser(),
  ]);

  if (data.kind === "no_db") {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Mini-game"
          title="Penalty Shootout"
          description="Solo or challenge online managers — best of five."
        />
        <SetupState
          title="Connect the database"
          body="Set DATABASE_URL and run migrations before playing penalties."
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <FadeIn>
        <PageHeader
          eyebrow="Mini-game"
          title="Penalty Shootout"
          description="Go online, challenge a mate, or take on the computer. Earn activity points for playing, challenging, and winning."
        />
      </FadeIn>
      <PenaltiesLobby
        actingManagerId={data.actingManagerId}
        acting={data.acting}
        managers={data.managers}
        pending={data.pending}
        active={data.active}
        history={data.history}
        leaderboard={data.leaderboard}
        signedIn={Boolean(user)}
      />
    </div>
  );
}
