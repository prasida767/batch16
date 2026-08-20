/** Resolve @mentions in chat text to manager ids (excludes actor). */
export function resolveMentionedManagerIds(
  body: string,
  roster: { id: number; displayName: string }[],
  actorId: number,
): number[] {
  const found = new Set<number>();
  for (const m of roster) {
    if (m.id === actorId) continue;
    const full = m.displayName.trim();
    if (!full) continue;
    const first = full.split(/\s+/)[0]!;
    const patterns = [full, first].filter((p) => p.length >= 2);
    for (const name of patterns) {
      const re = new RegExp(
        `(^|\\s)@${escapeRegExp(name)}(?=$|[\\s.,!?;:])`,
        "i",
      );
      if (re.test(body)) found.add(m.id);
    }
  }
  return [...found];
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
