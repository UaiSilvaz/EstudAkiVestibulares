import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SilvaLanding } from "@/components/landing/silva-landing";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Estude para o que realmente importa",
  description:
    "Silva Educacional: uma plataforma, diferentes caminhos. Prepare-se para ENEM, vestibulares, Medicina, OAB, concursos e carreiras policiais.",
};

export default async function LandingPage() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  return <SilvaLanding />;
}
