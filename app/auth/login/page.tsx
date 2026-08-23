import { PageHeader } from "@/components/league/shared";
import { LoginForm } from "@/components/auth/login-form";
import { afterAuthPath, safeNextPath } from "@/lib/auth/paths";
import { getAuthStatus } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string; confirmed?: string }>;
}) {
  const auth = await getAuthStatus();
  const params = await searchParams;
  const nextPath = safeNextPath(params.next);

  if (auth.signedIn) {
    redirect(
      afterAuthPath({
        verified: auth.verified,
        claimState: auth.claimState,
        next: nextPath,
      }),
    );
  }

  const errorHint =
    params.error === "confirm"
      ? "Email confirmation failed or expired. Try signing in, or register again."
      : null;

  const confirmedHint =
    params.confirmed === "1"
      ? "Email confirmed. Sign in with your email and password to continue."
      : null;

  return (
    <div className="space-y-8 py-8 sm:py-10">
      <PageHeader
        eyebrow="Account"
        title="Sign in"
        description="Access the league with your verified account."
      />
      <LoginForm
        errorHint={errorHint}
        successHint={confirmedHint}
        nextPath={nextPath}
      />
    </div>
  );
}
