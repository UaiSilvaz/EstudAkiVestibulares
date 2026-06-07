import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { LandingNavbar } from "@/components/landing-navbar";
import { HeroSection } from "@/components/landing/hero-section";
import { VestibularesLoopSection } from "@/components/landing/vestibulares-loop-section";
import { HowItWorksSection } from "@/components/landing/how-it-works-section";
import { VestibularesSection } from "@/components/landing/vestibulares-section";
import { MateriasSection } from "@/components/landing/materias-section";
import { SimuladosSection } from "@/components/landing/simulados-section";
import { MaterialsSection } from "@/components/landing/materials-section";
import { PricingSection } from "@/components/landing/pricing-section";
import { FaqSection } from "@/components/landing/faq-section";
import { CtaFinal } from "@/components/landing/cta-final";
import { LandingFooter } from "@/components/landing/landing-footer";
import { FloatingWhatsApp } from "@/components/visual/floating-whatsapp";

export default async function LandingPage() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  return (
    <main className="relative overflow-hidden bg-white">
      <LandingNavbar />
      <HeroSection />
      <VestibularesLoopSection />
      <HowItWorksSection />
      <VestibularesSection />
      <MateriasSection />
      <SimuladosSection />
      <MaterialsSection />
      <PricingSection />
      <FaqSection />
      <CtaFinal />
      <LandingFooter />
      <FloatingWhatsApp variant="landing" />
    </main>
  );
}
