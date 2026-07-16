import { PasswordResetForm } from "@/components/customer/password-reset-form";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email = "" } = await searchParams;
  return <PasswordResetForm mode="reset" initialEmail={email} />;
}
