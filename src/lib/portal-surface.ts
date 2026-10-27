// Only the staff deployment exposes partner accounts and workspaces.
export function partnerPortalEnabled() {
  if (process.env.PORTAL_SURFACE) return process.env.PORTAL_SURFACE === "staff";
  return process.env.NODE_ENV !== "production";
}
