import { FeatureErrorBoundary } from "@/components/error/feature-error-boundary";
import { DocumentaryShelf } from "@/components/documentary/documentary-shelf";
import { getActingManagerId } from "@/lib/challenges";
import { getLiveQuoteCandidate } from "@/lib/chat";
import { ensureChatGameweekRollover } from "@/lib/chat/rollover";
import {
  ensureDocumentaryEpisodes,
  getDocumentaryShelf,
  type DocumentaryShelf as DocumentaryShelfData,
} from "@/lib/documentary";
import { logAppError } from "@/lib/errors/log";
import { isDatabaseConfigured } from "@/lib/db";

export const dynamic = "force-dynamic";

const EMPTY_SHELF: DocumentaryShelfData = {
  featured: null,
  episodes: [],
  finale: null,
};

export default async function DocumentaryPage() {
  if (!isDatabaseConfigured()) {
    return (
      <div className="py-16 text-center text-muted-foreground">
        Database not configured.
      </div>
    );
  }

  try {
    await ensureDocumentaryEpisodes();
  } catch (error) {
    logAppError("documentary", error, { action: "ensure" });
  }

  const viewerId = await getActingManagerId().catch(() => null);
  let shelf = EMPTY_SHELF;
  try {
    shelf = await getDocumentaryShelf(viewerId);
  } catch (error) {
    logAppError("documentary", error, { action: "shelf" });
  }

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
    <FeatureErrorBoundary feature="documentary" variant="page">
      <DocumentaryShelf
        featured={shelf.featured}
        episodes={shelf.episodes}
        finale={shelf.finale}
        canRate={viewerId != null}
        liveQuote={showLive ? liveQuote : null}
      />
    </FeatureErrorBoundary>
  );
}
