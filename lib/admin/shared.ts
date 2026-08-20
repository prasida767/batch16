import { revalidatePath } from "next/cache";

export type ActionResult = {
  ok: boolean;
  message: string;
};

export type PrizeFormState = ActionResult | null;

export function revalidateLeaguePaths() {
  revalidatePath("/league");
  revalidatePath("/managers");
  revalidatePath("/gameweeks");
  revalidatePath("/prizes");
  revalidatePath("/past-seasons");
  revalidatePath("/challenges");
  revalidatePath("/awards");
  revalidatePath("/live");
  revalidatePath("/admin");
  revalidatePath("/admin/managers");
  revalidatePath("/admin/winners");
  revalidatePath("/admin/settings");
  revalidatePath("/admin/prizes");
  revalidatePath("/admin/history");
  revalidatePath("/admin/challenges");
  revalidatePath("/admin/awards");
  revalidatePath("/auth/claim");
}
