import { DressingRoomPanel } from "@/components/chat/dressing-room-panel";
import { FeatureErrorBoundary } from "@/components/error-boundary";
import { ErrorState } from "@/components/league/shared";
import { getAuthStatus } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function DressingRoomPage() {
  try {
    const auth = await getAuthStatus();
    if (!auth.signedIn) {
      redirect("/auth/login");
    }

    return (
      <FeatureErrorBoundary name="Dressing Room">
        <div className="-mx-4 -my-8 h-[calc(100dvh-3.5rem)] sm:-mx-6 sm:-my-10 lg:-mx-8">
          <DressingRoomPanel
            managerId={auth.manager?.managerId ?? null}
            managerName={auth.manager?.displayName ?? null}
            isAdmin={auth.isAdmin}
            immersive
            className="h-full"
          />
        </div>
      </FeatureErrorBoundary>
    );
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "digest" in error &&
      String((error as { digest?: string }).digest).startsWith("NEXT_REDIRECT")
    ) {
      throw error;
    }
    return (
      <div className="p-6">
        <ErrorState
          message={
            error instanceof Error
              ? error.message
              : "Couldn't open the Dressing Room."
          }
        />
      </div>
    );
  }
}
