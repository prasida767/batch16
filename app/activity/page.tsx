import { redirect } from "next/navigation";

/** Activity points now show on the League table beside each manager. */
export default function ActivityRedirect() {
  redirect("/league");
}
