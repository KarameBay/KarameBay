import { PasswordResetForm } from "@/components/customer/password-reset-form";
export default async function PartnerForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email = "" } = await searchParams;
  return (
    <PasswordResetForm mode="request" role="PARTNER" initialEmail={email} />
  );
}
