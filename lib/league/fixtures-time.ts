/** Format an FPL kick-off (ISO UTC) in a specific IANA timezone. */
export function formatKickoffLocal(
  iso: string | null | undefined,
  timeZone: string,
): string {
  if (!iso) return "TBD";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "TBD";

  try {
    return new Intl.DateTimeFormat(undefined, {
      timeZone,
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  } catch {
    return new Intl.DateTimeFormat(undefined, {
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  }
}

export function formatTimezoneLabel(timeZone: string): string {
  try {
    const parts = new Intl.DateTimeFormat(undefined, {
      timeZone,
      timeZoneName: "short",
    }).formatToParts(new Date());
    const name = parts.find((part) => part.type === "timeZoneName")?.value;
    return name ? `${timeZone.replace(/_/g, " ")} · ${name}` : timeZone;
  } catch {
    return timeZone;
  }
}
