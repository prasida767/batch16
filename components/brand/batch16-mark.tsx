import { cn } from "@/lib/utils";

const NUMERAL = "#F7F4EC";

/**
 * Batch 16 crest — shield + ball + crown + jersey “16”.
 * “1” = flag + stem (no wide foot). “6” = flat top + left stem + bottom bowl.
 */
export function Batch16Mark({
  className,
  title = "Batch 16",
}: {
  className?: string;
  title?: string;
}) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
      role="img"
      aria-label={title}
    >
      <title>{title}</title>
      <rect width="40" height="40" rx="11" fill="#0B3D2E" />
      <rect
        x="1.5"
        y="1.5"
        width="37"
        height="37"
        rx="9.5"
        stroke="#F0C14A"
        strokeOpacity="0.5"
        strokeWidth="1.5"
      />
      <path
        d="M20 5.5C20 5.5 11.5 7.4 9 8.5V22.2C9 28.2 13.6 33 20 34.8C26.4 33 31 28.2 31 22.2V8.5C28.5 7.4 20 5.5 20 5.5Z"
        fill="#147A4E"
      />
      <path
        d="M20 7.2C20 7.2 12.8 8.8 10.6 9.7V22.1C10.6 27.2 14.6 31.3 20 32.9C25.4 31.3 29.4 27.2 29.4 22.1V9.7C27.2 8.8 20 7.2 20 7.2Z"
        fill="#1A9B62"
      />
      <circle cx="20" cy="11.15" r="2.15" fill={NUMERAL} />
      <path
        d="M20 9.15C19.45 9.85 19.3 10.5 19.3 11.15C19.3 11.8 19.45 12.45 20 13.15C20.55 12.45 20.7 11.8 20.7 11.15C20.7 10.5 20.55 9.85 20 9.15Z"
        fill="#0B3D2E"
        fillOpacity="0.5"
      />
      <path d="M20 4.25L21.35 6.2H18.65L20 4.25Z" fill="#F0C14A" />

      {/* 1 */}
      <path
        fill={NUMERAL}
        d="M12.55 18.55 15.55 16.2h2.85v13.1h-2.85V18.85l-1.75 1.2H12.55z"
      />

      {/* 6: top bar */}
      <rect
        x="21.1"
        y="16.2"
        width="8.85"
        height="2.5"
        rx="0.35"
        fill={NUMERAL}
      />
      {/* 6: left stem into bowl */}
      <rect
        x="21.1"
        y="16.2"
        width="2.55"
        height="7"
        rx="0.35"
        fill={NUMERAL}
      />
      {/* 6: bottom bowl */}
      <path
        fill={NUMERAL}
        fillRule="evenodd"
        d="M25.75 21.45a4.4 4.4 0 1 1 0 8.8 4.4 4.4 0 1 1 0-8.8Zm0 2.25a2.15 2.15 0 1 0 0 4.3 2.15 2.15 0 1 0 0-4.3Z"
      />
    </svg>
  );
}

export function Batch16Brand({
  className,
  markClassName,
  showWordmark = true,
}: {
  className?: string;
  markClassName?: string;
  showWordmark?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <Batch16Mark className={cn("size-8", markClassName)} />
      {showWordmark ? (
        <span className="font-[family-name:var(--font-display)] text-sm font-semibold tracking-tight sm:text-[0.95rem]">
          Batch 16
        </span>
      ) : null}
    </span>
  );
}
