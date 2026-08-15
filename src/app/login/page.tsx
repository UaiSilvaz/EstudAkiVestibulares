import { redirect } from "next/navigation";
import { LoginScreen } from "@/components/login-screen";
import { getCurrentUser } from "@/lib/auth";

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

function safeRedirectPath(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return undefined;
  if (raw.startsWith("/login")) return undefined;
  return raw;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const redirectTo = safeRedirectPath(params.redirect);
  const user = await getCurrentUser();
  if (user) {
    redirect(redirectTo ?? "/dashboard");
  }

  const initialMode = params.signup === "true" ? "signup" : "login";

  return <LoginScreen initialMode={initialMode} redirectTo={redirectTo} />;
}
