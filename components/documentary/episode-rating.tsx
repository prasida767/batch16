"use client";

import { useState, useTransition } from "react";
import { Star } from "lucide-react";
import { rateEpisodeAction } from "@/app/documentary/actions";
import { cn } from "@/lib/utils";

export function EpisodeRating({
  episodeId,
  initialMyRating,
  ratingAverage,
  ratingCount,
  canRate,
}: {
  episodeId: number;
  initialMyRating: number | null;
  ratingAverage: number | null;
  ratingCount: number;
  canRate: boolean;
}) {
  const [myRating, setMyRating] = useState(initialMyRating);
  const [avg, setAvg] = useState(ratingAverage);
  const [count, setCount] = useState(ratingCount);
  const [hover, setHover] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function rate(stars: number) {
    if (!canRate || pending) return;
    setError(null);
    const prev = myRating;
    setMyRating(stars);
    startTransition(async () => {
      const result = await rateEpisodeAction(episodeId, stars);
      if (!result.ok) {
        setMyRating(prev);
        setError(result.message);
        return;
      }
      // Optimistic avg: approximate until revalidate
      if (prev == null) {
        const nextCount = count + 1;
        const nextSum = (avg ?? 0) * count + stars;
        setCount(nextCount);
        setAvg(nextSum / nextCount);
      } else {
        const nextSum = (avg ?? 0) * count - prev + stars;
        setAvg(count > 0 ? nextSum / count : stars);
      }
    });
  }

  const display = hover || myRating || 0;

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center gap-2">
        <div
          className="flex items-center gap-0.5"
          onMouseLeave={() => setHover(0)}
        >
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              disabled={!canRate || pending}
              aria-label={`Rate ${n} stars`}
              className="rounded p-0.5 transition-transform hover:scale-110 disabled:cursor-default disabled:opacity-60"
              onMouseEnter={() => canRate && setHover(n)}
              onClick={() => rate(n)}
            >
              <Star
                className={cn(
                  "size-4",
                  n <= display
                    ? "fill-amber-400 text-amber-400"
                    : "text-muted-foreground/40",
                )}
              />
            </button>
          ))}
        </div>
        <span className="text-xs text-muted-foreground">
          {avg != null
            ? `${avg.toFixed(1)} · ${count} rating${count === 1 ? "" : "s"}`
            : canRate
              ? "Be the first to rate"
              : "No ratings yet"}
        </span>
      </div>
      {canRate && myRating == null ? (
        <p className="text-[11px] text-muted-foreground">
          First rating earns activity points.
        </p>
      ) : null}
      {error ? <p className="text-[11px] text-destructive">{error}</p> : null}
    </div>
  );
}
