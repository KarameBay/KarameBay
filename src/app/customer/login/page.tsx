import { AuthForm } from "@/components/auth-form";

export default async function CustomerLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <AuthForm mode="login" audience="customer" initialError={error ?? ""} />
  );
}
