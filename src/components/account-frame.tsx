"use client";

import { Moon, Sun } from "lucide-react";
import type { ReactNode } from "react";
import { verticalThemeStyle } from "@/config/vertical-themes";
import { Brand } from "./brand";
import { useProductAppearance } from "./use-product-appearance";

export function AccountFrame({ children }: { children: ReactNode }) {
  const { mode, toggleMode } = useProductAppearance();
  return <main className="professional-platform flex min-h-screen items-center justify-center px-5 py-12" style={verticalThemeStyle("vestibular", mode)} data-theme-mode={mode}>
    <section className="account-frame-card w-full max-w-md">
      <header className="mb-8 flex items-center justify-between gap-4">
        <Brand href="/" className="estudaki-brand--sm" />
        <button type="button" onClick={toggleMode} className="product-icon-button" aria-label={mode === "dark" ? "Trocar para tema claro" : "Trocar para tema escuro"}>{mode === "dark" ? <Sun /> : <Moon />}</button>
      </header>
      {children}
    </section>
  </main>;
}
