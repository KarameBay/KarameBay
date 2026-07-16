import { AuthForm } from "@/components/auth-form";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <AuthForm
      mode="login"
      audience="staff"
      portal="admin"
      initialError={error ?? ""}
    />
  );
}
