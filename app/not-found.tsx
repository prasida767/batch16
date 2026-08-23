import Link from "next/link";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[50vh] w-full max-w-lg flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        404
      </p>
      <h1 className="text-2xl font-semibold tracking-tight">Page not found</h1>
      <p className="text-sm text-muted-foreground">
        That route doesn&apos;t exist in Batch 16. Head back to the league.
      </p>
      <Button render={<Link href="/league" />}>Back to league</Button>
    </div>
  );
}
