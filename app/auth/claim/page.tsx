import Link from "next/link";
import { redirect } from "next/navigation";
import { ClaimForm } from "@/components/auth/claim-form";
import { PageHeader } from "@/components/league/shared";
import { signOutAction } from "@/app/auth/actions";
import { getAuthStatus } from "@/lib/auth/session";
import { mergeClubsFromBootstrap } from "@/lib/avatars/clubs";
import { getBootstrapStatic } from "@/lib/fpl";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

function safeNext(raw: string | undefined): string | null {
  if (!raw?.startsWith("/") || raw.startsWith("//")) return null;
  if (raw.startsWith("/auth")) return null;
  return raw;
}

export default async function ClaimPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const auth = await getAuthStatus();
  const params = await searchParams;
  const nextPath = safeNext(params.next);

  if (!auth.signedIn) {
    redirect(
      nextPath
        ? `/auth/login?next=${encodeURIComponent(nextPath)}`
        : "/auth/login",
    );
  }

  if (auth.verified && auth.manager) {
    const destination = nextPath
      ? `/onboarding/recap?force=1&next=${encodeURIComponent(nextPath)}`
      : "/onboarding/recap?force=1";
    return (
      <div className="mx-auto max-w-md space-y-6 py-8 sm:py-10">
        <PageHeader
          eyebrow="Account"
          title="You're verified"
          description={`Linked as ${auth.manager.displayName}.`}
        />
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{auth.manager.displayName}</CardTitle>
            <CardDescription>{auth.email}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Link
              href={destination}
              className={cn(buttonVariants({ variant: "default" }))}
            >
              Watch season recap
            </Link>
            <Link
              href={nextPath ?? "/league"}
              className={cn(buttonVariants({ variant: "outline" }))}
            >
              Skip to league
            </Link>
            <Link
              href="/profile"
              className={cn(buttonVariants({ variant: "outline" }))}
            >
              Edit avatar
            </Link>
            <form action={signOutAction}>
              <Button type="submit" variant="ghost">
                Sign out
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  let clubs = mergeClubsFromBootstrap([]);
  try {
    const bootstrap = await getBootstrapStatic();
    clubs = mergeClubsFromBootstrap(bootstrap.teams);
  } catch {
    // fall back to static club list
  }

  return (
    <div className="space-y-8 py-8 sm:py-10">
      <PageHeader
        eyebrow="Account"
        title="Link your manager"
        description="Match your name and FPL team, then choose the Premier League club you support for your crest avatar."
      />
      <ClaimForm email={auth.email ?? ""} nextPath={nextPath} clubs={clubs} />
      <form action={signOutAction} className="mx-auto max-w-md text-center">
        <Button type="submit" variant="ghost" size="sm">
          Sign out
        </Button>
      </form>
    </div>
  );
}
