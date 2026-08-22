import { redirect } from "next/navigation";

/** Activity points live on the League table; awards still auto via Baaji. */
export default function AdminActivityRedirect() {
  redirect("/admin");
}
