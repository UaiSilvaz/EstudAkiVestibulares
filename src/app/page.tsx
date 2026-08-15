import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CloudLandingPage } from "@/components/landing/cloud-landing-page";
import { getCurrentUser } from "@/lib/auth";
import "@/components/landing/cloud-landing.css";

export const metadata: Metadata = {
  title: "EstudAki Vestibulares | Sua aprovação começa aqui",
  description:
    "Plano de estudos, questões, simulados, redação e acompanhamento inteligente para ENEM, ETEC, FATEC e vestibulares.",
};

export default async function LandingPage() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  return <CloudLandingPage />;
}
