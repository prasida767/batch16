import { DocumentaryShelf } from "@/components/documentary/documentary-shelf";
import { FeatureErrorBoundary } from "@/components/error-boundary";
import { ErrorState, PageHeader, SetupState } from "@/components/league/shared";
import { getActingManagerId } from "@/lib/challenges";
import { getLiveQuoteCandidate } from "@/lib/chat";
import { ensureChatGameweekRollover } from "@/lib/chat/rollover";
import {
  ensureDocumentaryEpisodes,
  getDocumentaryShelf,
} from "@/lib/documentary";
import { isDatabaseConfigured } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function DocumentaryPage() {
  if (!isDatabaseConfigured()) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="Season story" title="Documentary" />
        <SetupState
          title="Database not configured"
          body="Episodes appear here once the league database is connected."
          href="/league"
          cta="Back to league"
        />
      </div>
    );
  }

  try {
    await ensureDocumentaryEpisodes();
  } catch {
    // Listing existing episodes is enough if generation fails.
  }

  try {
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
      <FeatureErrorBoundary name="Documentary">
        <DocumentaryShelf
          featured={shelf.featured}
          episodes={shelf.episodes}
          finale={shelf.finale}
          canRate={viewerId != null}
          liveQuote={showLive ? liveQuote : null}
        />
      </FeatureErrorBoundary>
    );
  } catch (error) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="Season story" title="Documentary" />
        <ErrorState
          message={
            error instanceof Error
              ? error.message
              : "Couldn't load the documentary shelf."
          }
        />
      </div>
    );
  }
}
