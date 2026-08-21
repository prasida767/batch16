import { DressingRoomPanel } from "@/components/chat/dressing-room-panel";
import { getAuthStatus } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export const revalidate = 0;

export default async function DressingRoomPage() {
  const auth = await getAuthStatus();
  if (!auth.signedIn) {
    redirect("/auth/login");
  }

  return (
    <div className="-mx-4 -my-8 h-[calc(100dvh-3.5rem)] sm:-mx-6 sm:-my-10 lg:-mx-8">
      <DressingRoomPanel
        managerId={auth.manager?.managerId ?? null}
        managerName={auth.manager?.displayName ?? null}
        isAdmin={auth.isAdmin}
        immersive
        className="h-full"
      />
    </div>
  );
}
