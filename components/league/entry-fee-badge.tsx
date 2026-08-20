import { Check, Flag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/** Public flag so the whole league can see who has paid the entry fee. */
export function EntryFeeBadge({
  paid,
  className,
  size = "default",
}: {
  paid: boolean;
  className?: string;
  size?: "default" | "sm";
}) {
  if (paid) {
    return (
      <Badge
        variant="outline"
        className={cn(
          "gap-1 border-emerald-500/35 bg-emerald-500/10 font-semibold text-emerald-800 dark:text-emerald-300",
          size === "sm" && "h-4 px-1.5 text-[10px]",
          className,
        )}
        title="Entry fee paid"
      >
        <Check className={size === "sm" ? "size-2.5" : "size-3"} />
        Paid
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1 border-amber-500/40 bg-amber-500/10 font-semibold text-amber-900 dark:text-amber-200",
        size === "sm" && "h-4 px-1.5 text-[10px]",
        className,
      )}
      title="Entry fee not paid yet"
    >
      <Flag className={size === "sm" ? "size-2.5" : "size-3"} />
      Unpaid
    </Badge>
  );
}
