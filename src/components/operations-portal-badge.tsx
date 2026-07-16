import { BriefcaseBusiness } from "lucide-react";
import { LogoutButton } from "@/components/logout-button";

export function OperationsPortalBadge({
  role,
  destination = "/admin/login",
}: {
  role: string;
  destination?: string;
}) {
  return (
    <aside
      className="operations-portal-badge"
      aria-label="Portal account controls"
    >
      <span>
        <BriefcaseBusiness />
      </span>
      <div>
        <small>KARAME STAFF PORTAL</small>
        <b>{role}</b>
      </div>
      <LogoutButton destination={destination} />
    </aside>
  );
}
