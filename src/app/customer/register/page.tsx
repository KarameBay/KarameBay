import { AuthForm } from "@/components/auth-form";

export default async function CustomerRegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <AuthForm mode="register" audience="customer" initialError={error ?? ""} />
  );
}
