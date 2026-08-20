import { PageHeader } from "@/components/league/shared";
import { RegisterForm } from "@/components/auth/register-form";
import { getAuthStatus } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

function safeNext(raw: string | undefined): string | null {
  if (!raw?.startsWith("/") || raw.startsWith("//")) return null;
  if (raw.startsWith("/auth")) return null;
  return raw;
}

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const auth = await getAuthStatus();
  const params = await searchParams;
  const nextPath = safeNext(params.next);

  if (auth.verified) redirect(nextPath ?? "/league");
  if (auth.signedIn) {
    redirect(
      nextPath
        ? `/auth/claim?next=${encodeURIComponent(nextPath)}`
        : "/auth/claim",
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
