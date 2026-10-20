import { EmailConfirmationForm } from "@/components/email-confirmation-form";

export const metadata = { title: "Confirmar e-mail | Norte Preparatórios", robots: { index: false, follow: false } };

export default async function EmailConfirmationPage({ searchParams }: { searchParams: Promise<{ token?: string; email?: string }> }) {
  const params = await searchParams;
  return <EmailConfirmationForm token={params.token} initialEmail={params.email} />;
}
