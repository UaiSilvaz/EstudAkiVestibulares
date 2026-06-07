"use client";

import {
  Home,
  ListChecks,
  GraduationCap,
  Library,
  Timer,
  BookOpen,
  CreditCard,
  LifeBuoy,
} from "lucide-react";
import PillNav from "./reactbits/PillNav";

const NAV_ITEMS = [
  { label: "Início", href: "#inicio", icon: <Home /> },
  { label: "Questões", href: "#plataforma", icon: <ListChecks /> },
  { label: "Vestibulares", href: "#vestibulares", icon: <GraduationCap /> },
  { label: "Biblioteca", href: "#cadernos", icon: <Library /> },
  { label: "Simulados", href: "#simulados", icon: <Timer /> },
  { label: "Materiais", href: "/materials", icon: <BookOpen /> },
  { label: "Planos", href: "#precos", icon: <CreditCard /> },
  { label: "Ajuda", href: "#faq", icon: <LifeBuoy /> },
];

export function LandingNavbar() {
  return (
    <PillNav
      items={NAV_ITEMS}
      logo="/brand/estudaki-logo.png"
      logoAlt="EstudAki"
      baseColor="#FFFFFF"
      pillColor="#2563EB"
      hoveredPillTextColor="#06245C"
      pillTextColor="#FFFFFF"
      ctaLabel="Entrar grátis"
      ctaHref="/login"
    />
  );
}
