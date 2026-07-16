import { getCurrentUser } from "@/lib/auth/session";
import { BrowseHeaderClient } from "./browse-header-client";

/**
 * Server wrapper keeps the customer navigation in sync with the isolated
 * CUSTOMER session without adding a client-side auth request on every page.
 */
export async function BrowseHeader() {
  const customer = await getCurrentUser("CUSTOMER");

  return <BrowseHeaderClient signedIn={Boolean(customer)} />;
}
