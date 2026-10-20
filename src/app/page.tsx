import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { GlassLandingPage } from "@/components/landing/glass-landing-page";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Norte Preparatórios | Seu futuro tem direção",
  description:
    "Plano de estudos, aulas, questões e progresso para ENEM, vestibulares, OAB, Medicina e concursos. Sua preparação, com direção.",
};

export default async function LandingPage() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  return <GlassLandingPage />;
}
