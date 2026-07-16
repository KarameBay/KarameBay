import { redirect } from "next/navigation";

export default function CustomerPortalHome() {
  redirect("/customer/account");
}
