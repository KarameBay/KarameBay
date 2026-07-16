import { redirect } from "next/navigation";
import { EmailVerificationForm } from "@/components/customer/email-verification-form";
import { getCurrentUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";
export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ delivery?: string }> }) {
  const user = await getCurrentUser("CUSTOMER");
  if (!user) redirect("/customer/login");
  if (user.emailVerifiedAt) redirect("/customer/account");
  const { delivery } = await searchParams;
  const initialMessage = delivery === "sent" ? "We sent your verification code." : delivery === "failed" ? "Your account was created, but email delivery failed. Use Resend code." : undefined;
  return <EmailVerificationForm email={user.email} initialMessage={initialMessage} />;
}
