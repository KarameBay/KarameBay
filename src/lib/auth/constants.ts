// Keep each portal in its own cookie so Customer, Admin and Rider can remain
// signed in at the same time in one browser. Cookies are shared across ports,
// so using a different development port alone cannot isolate these sessions.
export const LEGACY_SESSION_COOKIE = "karame_session";
export const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 7;
export const ROLES = ["CUSTOMER", "ADMIN", "RIDER"] as const;
export type Role = (typeof ROLES)[number];
export const SESSION_COOKIE_BY_ROLE: Record<Role, string> = {
  CUSTOMER: "karame_customer_session",
  ADMIN: "karame_admin_session",
  RIDER: "karame_rider_session",
};
export const PASSWORD_HASH_ROUNDS = 10;

export function roleLandingPath(role: Role) {
  switch (role) {
    case "ADMIN":
      return "/admin";
    case "RIDER":
      return "/rider";
    default:
      return "/customer/account";
  }
}
