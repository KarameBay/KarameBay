import { AuthForm } from "@/components/auth-form";

export default async function PartnerLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <AuthForm
      mode="login"
      audience="partner"
      portal="partner"
      initialError={error}
    />
  );
}
