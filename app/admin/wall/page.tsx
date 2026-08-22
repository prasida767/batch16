import { redirect } from "next/navigation";

/** Wall posts are moderated via live chat; dedicated wall admin removed. */
export default function AdminWallRedirect() {
  redirect("/admin");
}
