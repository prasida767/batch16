import { PageHeader } from "@/components/league/shared";
import { RegisterForm } from "@/components/auth/register-form";
import { afterAuthPath, safeNextPath } from "@/lib/auth/paths";
import { getAuthStatus } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
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

  return (
    <div className="space-y-8 py-8 sm:py-10">
      <PageHeader
        eyebrow="Account"
        title="Register"
        description="Create an account with your email, then verify against the league roster."
      />
      <RegisterForm nextPath={nextPath} />
    </div>
  );
}
