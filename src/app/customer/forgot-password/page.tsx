import { PasswordResetForm } from "@/components/customer/password-reset-form";

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email = "" } = await searchParams;
  return <PasswordResetForm mode="request" initialEmail={email} />;
}
