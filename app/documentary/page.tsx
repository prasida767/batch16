import nextDynamic from "next/dynamic";
import { getActingManagerId } from "@/lib/challenges";
import { getLiveQuoteCandidate } from "@/lib/chat";
import { ensureChatGameweekRollover } from "@/lib/chat/rollover";
import {
  ensureDocumentaryEpisodesThrottled,
  getDocumentaryShelf,
} from "@/lib/documentary";
import { isDatabaseConfigured } from "@/lib/db";

const DocumentaryShelf = nextDynamic(
  () =>
    import("@/components/documentary/documentary-shelf").then(
      (m) => m.DocumentaryShelf,
    ),
  {
    loading: () => (
      <div className="h-[28rem] animate-pulse rounded-2xl bg-muted/40" aria-hidden />
    ),
  },
);

export const revalidate = 120;

export default async function DocumentaryPage() {
  if (!isDatabaseConfigured()) {
    return (
      <div className="py-16 text-center text-muted-foreground">
        Database not configured.
      </div>
    );
  }

  await ensureDocumentaryEpisodesThrottled();
  const viewerId = await getActingManagerId();
  const shelf = await getDocumentaryShelf(viewerId);

  let liveQuote: Awaited<ReturnType<typeof getLiveQuoteCandidate>> = null;
  try {
    const gw = await ensureChatGameweekRollover();
    liveQuote = await getLiveQuoteCandidate(gw);
  } catch {
    liveQuote = null;
  }

  const featuredGw = shelf.featured?.gameweek;
  const showLive =
    liveQuote != null &&
    (featuredGw == null || featuredGw !== liveQuote.gameweek);

  return (
    <DocumentaryShelf
      featured={shelf.featured}
      episodes={shelf.episodes}
      finale={shelf.finale}
      canRate={viewerId != null}
      liveQuote={showLive ? liveQuote : null}
    />
  );
}
