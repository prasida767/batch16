import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/** Legacy trash-talk wall → The Dressing Room. */
export default function WallRedirect() {
  redirect("/dressing-room");
}
