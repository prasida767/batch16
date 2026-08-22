import { DressingRoomPanel } from "@/components/chat/dressing-room-panel";
import { FeatureErrorBoundary } from "@/components/error/feature-error-boundary";
import { logAppError } from "@/lib/errors/log";
import { getAuthStatus } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function DressingRoomPage() {
  let auth: Awaited<ReturnType<typeof getAuthStatus>>;
  try {
    auth = await getAuthStatus();
  } catch (error) {
    logAppError("chat", error);
    redirect("/auth/login");
  }
  if (!auth.signedIn) {
    redirect("/auth/login");
  }

  return (
    <div className="-mx-4 -my-8 h-[calc(100dvh-3.5rem)] sm:-mx-6 sm:-my-10 lg:-mx-8">
    <FeatureErrorBoundary feature="chat" variant="page">
      <DressingRoomPanel
        managerId={auth.manager?.managerId ?? null}
        managerName={auth.manager?.displayName ?? null}
        isAdmin={auth.isAdmin}
        immersive
        className="h-full"
      />
    </FeatureErrorBoundary>
    </div>
  );
}
