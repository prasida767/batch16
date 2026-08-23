import Link from "next/link";
import { redirect, unstable_rethrow } from "next/navigation";
import { ProfileAvatarForm } from "@/components/profile/profile-avatar-form";
import { PageHeader, SetupState, ErrorState } from "@/components/league/shared";
import { getProfilePageData } from "@/app/profile/actions";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  let data: Awaited<ReturnType<typeof getProfilePageData>>;
  try {
    data = await getProfilePageData();
  } catch (error) {
    unstable_rethrow(error);
    return (
      <div className="space-y-6">
        <PageHeader title="Profile" />
        <ErrorState
          message={
            error instanceof Error ? error.message : "Couldn't load profile."
          }
        />
      </div>
    );
  }

  if (data.kind === "no_db") {
    return (
      <div className="space-y-6">
        <PageHeader title="Profile" />
        <SetupState
          title="Connect the database"
          body="Set DATABASE_URL to manage your avatar."
        />
      </div>
    );
  }

  if (data.kind === "unverified") {
    redirect("/auth/claim?next=/profile");
  }

  const teamId =
    data.manager.supportedTeamId ?? data.clubs[0]?.id ?? 1;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Account"
        title="Your profile"
        description="Update the Premier League crest avatar shown across Batch 16."
        actions={
          <Link
            href="/league"
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            Back to league
          </Link>
        }
      />
      <ProfileAvatarForm
        clubs={data.clubs}
        initialTeamId={teamId}
        initialVariant={data.manager.avatarVariant ?? 0}
        displayName={data.manager.displayName}
      />
    </div>
  );
}
