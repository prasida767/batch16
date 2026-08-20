import nextDynamic from "next/dynamic";
import { PageHeader, SetupState } from "@/components/league/shared";
import { FadeIn } from "@/components/motion/page-transition";
import { getActingManagerId } from "@/lib/challenges/identity";
import { getAuthUser } from "@/lib/auth/session";
import { isDatabaseConfigured, getDb, managers } from "@/lib/db";
import { eq } from "drizzle-orm";

const PenaltiesLobby = nextDynamic(
  () =>
    import("@/components/penalties/penalties-lobby").then(
      (m) => m.PenaltiesLobby,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="h-80 animate-pulse rounded-2xl bg-muted/40" aria-hidden />
    ),
  },
);

export const dynamic = "force-dynamic";

/**
 * Keep SSR tiny: auth + acting manager only.
 * Heavy board queries run in the browser via server actions so a slow
 * Penalties load cannot pin DB connections and freeze every other tab.
 */
export default async function PenaltiesPage() {
  if (!isDatabaseConfigured()) {
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

  const [user, actingManagerId] = await Promise.all([
    getAuthUser(),
    getActingManagerId().catch(() => null),
  ]);

  let acting: {
    id: number;
    displayName: string;
    avatarUrl: string | null;
    supportedTeamId: number | null;
    supportedTeamCode: number | null;
    avatarVariant: number;
    fplEntryId: number | null;
  } | null = null;

  if (actingManagerId != null) {
    try {
      const db = getDb();
      const [row] = await db
        .select({
          id: managers.id,
          displayName: managers.displayName,
          avatarUrl: managers.avatarUrl,
          supportedTeamId: managers.supportedTeamId,
          supportedTeamCode: managers.supportedTeamCode,
          avatarVariant: managers.avatarVariant,
          fplEntryId: managers.fplEntryId,
        })
        .from(managers)
        .where(eq(managers.id, actingManagerId))
        .limit(1);
      acting = row ?? null;
    } catch {
      acting = null;
    }
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
        actingManagerId={actingManagerId}
        acting={acting}
        signedIn={Boolean(user)}
      />
    </div>
  );
}
