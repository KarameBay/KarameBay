import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { EmailVerificationForm } from "@/components/customer/email-verification-form";

export const dynamic = "force-dynamic";
export default async function PartnerVerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ delivery?: string }>;
}) {
  const user = await getCurrentUser("PARTNER");
  if (!user) redirect("/partner/login");
  if (user.emailVerifiedAt) redirect("/partner");
  const { delivery } = await searchParams;
  return (
    <EmailVerificationForm
      role="PARTNER"
      email={user.email}
      initialMessage={
        delivery === "sent"
          ? "We sent your verification code."
          : delivery === "failed"
            ? "Your account was created, but email delivery failed. Use Resend code."
            : undefined
      }
    />
  );
}
