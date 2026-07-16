import { AuthForm } from "@/components/auth-form";

export default async function RiderLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <AuthForm
      mode="login"
      audience="staff"
      portal="rider"
      initialError={error ?? ""}
    />
  );
}
