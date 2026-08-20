import type { ReactNode } from "react";
import { requireAdmin } from "@/lib/auth/session";
import { AdminNav } from "@/components/admin/admin-nav";
import { Badge } from "@/components/ui/badge";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireAdmin();

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
