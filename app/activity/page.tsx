import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/** Activity points now show on the League table beside each manager. */
export default function ActivityRedirect() {
  redirect("/league");
}
