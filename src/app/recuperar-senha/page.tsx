import { PasswordRecoveryForm } from "@/components/password-recovery-form";

export default async function PasswordRecoveryPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return <PasswordRecoveryForm token={typeof token === "string" ? token : undefined} />;
}
