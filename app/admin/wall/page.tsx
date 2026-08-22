import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/** Wall posts are moderated via live chat; dedicated wall admin removed. */
export default function AdminWallRedirect() {
  redirect("/admin");
}
