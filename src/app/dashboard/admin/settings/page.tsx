import Link from "next/link";
import { AdminBusinessProfileForm } from "@/components/admin/admin-business-profile-form";
import { AdminParcelSettings } from "@/components/admin/admin-parcel-settings";
import { AdminTestEmailForm } from "@/components/admin/admin-test-email-form";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { OperationsPortalBadge } from "@/components/operations-portal-badge";
import { requireRole } from "@/lib/auth/session";
import { getBusinessProfile } from "@/lib/business-profile";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const user = await requireRole("ADMIN");
  const emailProvider = process.env.RESEND_API_KEY
    ? "RESEND"
    : process.env.GMAIL_SMTP_USER && process.env.GMAIL_SMTP_APP_PASSWORD
      ? "SMTP"
      : null;
  const emailReady = Boolean(
    emailProvider && process.env.EMAIL_FROM_ADDRESS,
  );
  const [businessProfile, parcelPricing, parcelSizes, parcelCapacities, parcelCategories, prohibitedRules] =
    await Promise.all([
      getBusinessProfile(),
      db.parcelPricingSetting.findUnique({
        where: { id: "parcel" },
        select: {
          version: true,
          baseFeeRwf: true,
          perKmRwf: true,
          roundingIncrementRwf: true,
          sizeSurchargeEnabled: true,
          weightSurchargeEnabled: true,
          weightFreeAllowanceKg: true,
          weightSurchargePerKgRwf: true,
          fragileSurchargeEnabled: true,
          fragileSurchargeRwf: true,
          carefulHandlingEnabled: true,
          carefulHandlingRwf: true,
          waitingTimeChargeEnabled: true,
          waitingGraceMinutes: true,
          waitingPerMinuteRwf: true,
          scheduledSurchargeEnabled: true,
          scheduledSurchargeRwf: true,
          isActive: true,
        },
      }),
      db.parcelSizeDefinition.findMany({
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      }),
      db.parcelVehicleCapacity.findMany({
        orderBy: [{ isActive: "desc" }, { vehicleType: "asc" }],
      }),
      db.parcelCategory.findMany({
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      }),
      db.parcelProhibitedItemRule.findMany({
        orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
      }),
    ]);

  return (
    <>
      <main className="admin-settings-page">
        <header>
          <div>
            <span className="catalog-kicker">KARAME BAY ADMIN</span>
            <h1>Platform settings</h1>
            <p>Manage customer email delivery and parcel service configuration.</p>
          </div>
          <div className="admin-header-actions">
            <NotificationBell />
            <Link href="/admin">Back to dashboard</Link>
          </div>
        </header>
        <AdminBusinessProfileForm profile={businessProfile} />
        <section className="admin-settings-card">
          <div className={`admin-settings-alert ${emailReady ? "ready" : "warning"}`}>
            <div>
              <span className="catalog-kicker">
                {emailReady
                  ? `${emailProvider} EMAIL READY`
                  : "EMAIL DELIVERY NOT SET"}
              </span>
              <b>
                {emailReady
                  ? "Automatic customer emails are enabled."
                  : "Automatic customer emails need an email provider."}
              </b>
              <p>
                {emailReady
                  ? "Accepted and delivered orders will send customer emails automatically."
                  : "Add Resend API credentials or SMTP credentials in Railway production variables."}
              </p>
            </div>
          </div>
          <div>
            <span className="catalog-kicker">TEST EMAIL</span>
            <h2>Send a test email</h2>
            <p>Use the default recipient or enter another address.</p>
          </div>
          <AdminTestEmailForm />
          <small>Signed in as {user.email}</small>
        </section>
        <section className="admin-settings-card" id="parcel-pricing">
          <div className={`admin-settings-alert ${parcelPricing?.isActive ? "ready" : "warning"}`}>
            <div>
              <span className="catalog-kicker">
                {parcelPricing?.isActive ? "PRICING ACTIVE" : "PRICING NEEDS REVIEW"}
              </span>
              <b>
                {parcelPricing
                  ? `Configuration version ${parcelPricing.version}`
                  : "No parcel pricing configuration found"}
              </b>
              <p>
                Optional charges — size {parcelPricing?.sizeSurchargeEnabled ? "enabled" : "disabled"}, weight {parcelPricing?.weightSurchargeEnabled ? "enabled" : "disabled"}, fragile handling {parcelPricing?.fragileSurchargeEnabled ? "enabled" : "disabled"}, and scheduled pickup {parcelPricing?.scheduledSurchargeEnabled ? "enabled" : "disabled"}.
              </p>
            </div>
          </div>
          <AdminParcelSettings
            pricing={parcelPricing}
            sizes={parcelSizes.map((size) => ({
              id: size.id,
              code: size.code,
              name: size.name,
              description: size.description,
              examples: parseExamples(size.examplesJson),
              maxWeightKg: size.maxWeightKg,
              maxLengthCm: size.maxLengthCm,
              maxWidthCm: size.maxWidthCm,
              maxHeightCm: size.maxHeightCm,
              surchargeRwf: size.surchargeRwf,
              sortOrder: size.sortOrder,
              isActive: size.isActive,
            }))}
            capacities={parcelCapacities.map((capacity) => ({
              id: capacity.id,
              vehicleType: capacity.vehicleType,
              maxWeightKg: capacity.maxWeightKg,
              maxLengthCm: capacity.maxLengthCm,
              maxWidthCm: capacity.maxWidthCm,
              maxHeightCm: capacity.maxHeightCm,
              isActive: capacity.isActive,
            }))}
            categories={parcelCategories.map((category) => ({
              id: category.id,
              slug: category.slug,
              name: category.name,
              description: category.description,
              sortOrder: category.sortOrder,
              isActive: category.isActive,
            }))}
            prohibitedRules={prohibitedRules.map((rule) => ({
              id: rule.id,
              title: rule.title,
              description: rule.description,
              sortOrder: rule.sortOrder,
              isActive: rule.isActive,
            }))}
          />
          <Link href="/admin/parcels">Open parcel operations</Link>
        </section>
      </main>
      <OperationsPortalBadge role="Admin" destination="/admin/login" />
    </>
  );
}

function parseExamples(value: string) {
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}
