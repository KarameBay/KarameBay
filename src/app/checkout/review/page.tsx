import { BrowseHeader } from "@/components/catalog/browse-header";
import { CheckoutReview } from "@/components/checkout/checkout-review";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
export default async function Page(){
  const user = await getCurrentUser("CUSTOMER");
  if (user && !user.emailVerifiedAt) redirect("/customer/verify-email");
  return <><BrowseHeader/><CheckoutReview/></>
}
