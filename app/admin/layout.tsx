import type { ReactNode } from "react";
import { requireAdmin } from "@/lib/auth/session";
import { AdminNav } from "@/components/admin/admin-nav";
import { Badge } from "@/components/ui/badge";
import { redirect, unstable_rethrow } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  try {
    await requireAdmin();
  } catch (error) {
    unstable_rethrow(error);
    redirect("/league");
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Badge variant="secondary">Admin</Badge>
        <AdminNav />
      </div>
      {children}
    </div>
  );
}
