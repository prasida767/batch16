import { redirect } from "next/navigation";

/** Legacy trash-talk wall → The Dressing Room. */
export default function WallRedirect() {
  redirect("/dressing-room");
}
