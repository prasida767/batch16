"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { LoaderCircle, RefreshCw } from "lucide-react";
import { recalculateBalances, syncManagersFromLeague } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function AdminActionButton({
  action,
  label,
  variant = "outline",
  className,
  confirm,
}: {
  action: "recalculate" | "sync";
  label: string;
  variant?: "default" | "outline" | "secondary";
  className?: string;
  confirm?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [ok, setOk] = useState<boolean | null>(null);

  function run() {
    if (confirm && !window.confirm(confirm)) return;
    startTransition(async () => {
      const result =
        action === "recalculate"
          ? await recalculateBalances()
          : await syncManagersFromLeague();
      setOk(result.ok);
      setMessage(result.message);
      if (result.ok) router.refresh();
    });
  }

  return (
    <div className={cn("space-y-2", className)}>
      <Button
        type="button"
        variant={variant}
        disabled={pending}
        onClick={run}
        className="w-full sm:w-auto"
      >
        {pending ? (
          <LoaderCircle className="size-4 animate-spin" data-icon="inline-start" />
        ) : (
          <RefreshCw className="size-4" data-icon="inline-start" />
        )}
        {label}
      </Button>
      {message ? (
        <p
          className={cn(
            "text-sm",
            ok ? "text-emerald-600 dark:text-emerald-400" : "text-destructive",
          )}
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
