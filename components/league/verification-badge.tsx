import { BadgeCheck, CircleDashed } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/** Shows whether a manager has claimed their FPL seat in this app. */
export function VerificationBadge({
  verified,
  className,
  size = "default",
}: {
  verified: boolean;
  className?: string;
  size?: "default" | "sm";
}) {
  if (verified) {
    return (
      <Badge
        variant="outline"
        className={cn(
          "gap-1 border-sky-500/35 bg-sky-500/10 font-semibold text-sky-900 dark:text-sky-200",
          size === "sm" && "h-4 px-1.5 text-[10px]",
          className,
        )}
        title="Registered and linked in Batch 16"
      >
        <BadgeCheck className={size === "sm" ? "size-2.5" : "size-3"} />
        Verified
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1 border-border/80 bg-muted/40 font-semibold text-muted-foreground",
        size === "sm" && "h-4 px-1.5 text-[10px]",
        className,
      )}
      title="On the FPL roster but has not joined Batch 16 yet"
    >
      <CircleDashed className={size === "sm" ? "size-2.5" : "size-3"} />
      Unverified
    </Badge>
  );
}
