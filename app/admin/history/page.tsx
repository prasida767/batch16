import { PageHeader, SetupState } from "@/components/league/shared";
import { HistoricalImportForm } from "@/components/admin/historical-import-form";
import { isDatabaseConfigured } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default function AdminHistoryPage() {
  if (!isDatabaseConfigured()) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Historical import"
          description="Bring past seasons in from the Batch 2016 Excel workbook."
        />
        <SetupState
          title="Connect the database"
          body="Set DATABASE_URL in .env.local and run migrations before importing."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Historical import"
        description="Import clean gameweek winners and final season prizes only."
      />
      <HistoricalImportForm />
      <p className="text-sm text-muted-foreground">
        Expected sheets: FPL 2021-22 through FPL 2025-26. Name spelling variants
        (Prajwal/Prajwol, Sujan/Suzan, etc.) are normalized automatically.
      </p>
    </div>
  );
}
