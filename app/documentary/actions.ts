"use server";

import { getActingManagerId } from "@/lib/challenges";
import {
  ensureDocumentaryEpisodes,
  generateSeasonFinaleEpisode,
  generateWeeklyDocumentaryEpisode,
  rateDocumentaryEpisode,
} from "@/lib/documentary";
import { requireAdmin } from "@/lib/auth/session";
import { revalidatePath } from "next/cache";

export async function rateEpisodeAction(
  episodeId: number,
  stars: number,
): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    const managerId = await getActingManagerId();
    if (managerId == null) {
      return { ok: false, message: "Verify your manager account to rate." };
    }
    await rateDocumentaryEpisode({ episodeId, managerId, stars });
    revalidatePath("/documentary");
    revalidatePath("/league");
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Couldn't rate.",
    };
  }
}

export async function regenerateEpisodeAction(
  _prev: unknown,
  formData: FormData,
): Promise<{ ok: true; message: string } | { ok: false; message: string }> {
  await requireAdmin();
  const gameweek = Number(formData.get("gameweek"));
  try {
    if (formData.get("finale") === "1") {
      await generateSeasonFinaleEpisode();
      revalidatePath("/documentary");
      return { ok: true, message: "Season finale regenerated." };
    }
    if (!Number.isInteger(gameweek) || gameweek <= 0) {
      return { ok: false, message: "Invalid gameweek." };
    }
    await generateWeeklyDocumentaryEpisode(gameweek);
    revalidatePath("/documentary");
    revalidatePath("/league");
    return { ok: true, message: `Episode GW${gameweek} regenerated.` };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Generation failed.",
    };
  }
}

export async function ensureEpisodesAction() {
  await requireAdmin();
  await ensureDocumentaryEpisodes();
  revalidatePath("/documentary");
  revalidatePath("/league");
}
