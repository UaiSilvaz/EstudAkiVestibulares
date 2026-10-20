"use client";

import { BookOpen, Home } from "@/components/visual/aicon-icons";
import { CreditCard, GraduationCap, Library, LifeBuoy, ListChecks, Timer } from "lucide-react";
import PillNav from "./reactbits/PillNav";

const NAV_ITEMS = [
  { label: "Início", href: "#inicio", icon: <Home /> },
  { label: "Questões", href: "#plataforma", icon: <ListChecks /> },
  { label: "Matérias", href: "#materias", icon: <BookOpen /> },
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
      logo="/assets/norte-design/01_Logos_SVG/logo_horizontal_laranja.svg"
      logoAlt="Norte Preparatórios"
      baseColor="#FFFFFF"
      pillColor="#C94D00"
      hoveredPillTextColor="#101216"
      pillTextColor="#FFFFFF"
      ctaLabel="Entrar grátis"
      ctaHref="/login"
    />
  );
}
