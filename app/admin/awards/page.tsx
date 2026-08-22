import Link from "next/link";
import { AwardsAdmin } from "@/components/admin/awards-admin";
import { ErrorState, PageHeader, SetupState } from "@/components/league/shared";
import { getAdminAwardsData } from "@/app/social/actions";
import { isDatabaseConfigured } from "@/lib/db";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminAwardsPage({
  searchParams,
}: {
  searchParams: Promise<{ gw?: string }>;
}) {
  if (!isDatabaseConfigured()) {
    return (
      <div className="space-y-6">
        <PageHeader title="Weekly awards" />
        <SetupState
          title="Connect the database"
          body="Set DATABASE_URL first."
        />
      </div>
    );
  }

  const { gw } = await searchParams;
  const selected = gw ? Number(gw) : undefined;
  const data = await getAdminAwardsData(
    selected && Number.isInteger(selected) ? selected : undefined,
  );
  if (data.kind !== "ok") {
    return (
      <div className="space-y-6">
        <PageHeader title="Weekly awards" />
        {data.kind === "no_db" ? (
          <SetupState
            title="Connect the database"
            body="Set DATABASE_URL first."
          />
        ) : (
          <ErrorState
            message={
              "message" in data
                ? String(data.message)
                : "Couldn't load awards."
            }
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Weekly awards"
        description="Generate auto awards or add custom ones."
      />
      {data.gameweeks.length > 0 ? (
        <div className="-mx-1 flex gap-2 overflow-x-auto pb-1">
          {data.gameweeks.map((gameweek) => (
            <Link
              key={gameweek}
              href={`/admin/awards?gw=${gameweek}`}
              className={cn(
                "shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium",
                gameweek === data.gameweek
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground",
              )}
            >
              GW{gameweek}
            </Link>
          ))}
        </div>
      ) : null}
      <AwardsAdmin
        gameweek={data.gameweek}
        gameweeks={data.gameweeks}
        awards={data.awards}
        managers={data.managers}
      />
    </div>
  );
}
