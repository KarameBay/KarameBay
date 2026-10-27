import { AuthForm } from "@/components/auth-form";

export default async function PartnerRegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <AuthForm
      mode="register"
      audience="partner"
      portal="partner"
      initialError={error}
    />
  );
}
