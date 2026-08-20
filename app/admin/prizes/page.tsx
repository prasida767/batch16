import { redirect } from "next/navigation";

export default function AdminPrizesRedirect() {
  redirect("/admin/settings");
}
