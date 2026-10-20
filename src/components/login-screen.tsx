"use client";

import { Brand } from "./brand";
import { CalendarDays, ChartNoAxesCombined, Layers3, Moon, Sun } from "lucide-react";
import { useProductAppearance } from "./use-product-appearance";
import { verticalThemeStyle } from "@/config/vertical-themes";
import { useState } from "react";

import { LoginForm, type FormMode } from "@/components/login-form";

export function LoginScreen({
  initialMode,
  redirectTo,
}: {
  initialMode: FormMode;
  redirectTo?: string;
}) {
  const [formMode, setFormMode] = useState<FormMode>(initialMode);
  const isSignup = formMode === "signup";
  const { mode, toggleMode } = useProductAppearance();

  function changeFormMode(nextMode: FormMode) {
    setFormMode(nextMode);
    const params = new URLSearchParams();
    if (nextMode === "signup") params.set("signup", "true");
    if (redirectTo) params.set("redirect", redirectTo);
    const query = params.toString();
    window.history.replaceState(
      null,
      "",
      query ? `/login?${query}` : "/login",
    );
  }

  return (
    <main className="estudaki-login-page professional-platform relative min-h-screen overflow-hidden" style={verticalThemeStyle("vestibular", mode)} data-theme-mode={mode}>
      <div className="estudaki-login-bg-blob estudaki-login-bg-blob-a" aria-hidden />
      <div className="estudaki-login-bg-blob estudaki-login-bg-blob-b" aria-hidden />
      <div className="estudaki-login-bg-blob estudaki-login-bg-blob-c" aria-hidden />
      <div className="estudaki-login-dots" aria-hidden />

      <section className="relative z-10 mx-auto flex min-h-screen w-full max-w-[1060px] items-center justify-center px-4 py-4 sm:px-6">
        <div className="estudaki-login-card relative w-full overflow-hidden rounded-[18px] border border-white/80 bg-white/85 shadow-sm backdrop-blur-xl">
          <div className="grid lg:grid-cols-[1fr_1fr]">
            <aside className="relative flex flex-col px-5 pb-5 pt-6 sm:px-8 sm:pt-7 lg:px-10 lg:py-8">
              <div className="flex items-center justify-between gap-2.5">
                <Brand href="/" className="estudaki-brand--sm" />
                <button type="button" onClick={toggleMode} className="product-icon-button" aria-label={mode === "light" ? "Ativar modo escuro" : "Ativar modo claro"}>{mode === "light" ? <Moon /> : <Sun />}</button>
              </div>

              <div className="my-auto pt-6 lg:pt-4">
                <span className="estudaki-login-badge">
                  {isSignup ? "Comece agora" : "Acesso rápido"}
                </span>

                <h1 className="mt-4 font-display text-[24px] font-bold leading-[1.08] tracking-tight text-[#0F172A] sm:text-[28px]">
                  {isSignup ? (
                    <>
                      Crie sua conta e{" "}
                      <span className="text-[color:var(--theme-primary)]">comece a estudar.</span>
                    </>
                  ) : (
                    <>
                      Entre e continue sua{" "}
                      <span className="text-[color:var(--theme-primary)]">preparação.</span>
                    </>
                  )}
                </h1>

                <p className="mt-2 max-w-[340px] text-[13.5px] font-medium leading-relaxed text-slate-600">
                  {isSignup
                    ? "Cadastre-se com nome de usuário, e-mail e senha para acessar questões, simulados e materiais."
                    : "Acesse sua conta para estudar com questões, simulados, flashcards e materiais exclusivos."}
                </p>

                <div className="mt-6">
                  <LoginForm
                    key={formMode}
                    mode={formMode}
                    redirectTo={redirectTo}
                    onModeChange={changeFormMode}
                  />
                </div>
              </div>

              <p className="mt-4 text-[10.5px] font-medium text-slate-400">
                Sua conta pessoal. Seu estudo em um só lugar.
              </p>
            </aside>

            <aside className="professional-login-aside hidden flex-col justify-center border-l border-[color:var(--theme-border)] bg-[#F1F4F8] px-10 py-12 lg:flex">
              <Brand href="/" light className="mb-10 estudaki-brand--lg" />
              <p className="text-xs font-medium text-[#52647B]">Sua preparação, com direção.</p>
              <h2 className="mt-4 text-3xl font-semibold leading-tight tracking-tight text-[#243B59]">Um próximo passo.<br />Todos os dias.</h2>
              <p className="mt-5 text-sm leading-7 text-[#657184]">Organize seus estudos, pratique com foco e acompanhe sua evolução em um só lugar.</p>
              <div className="login-proof"><span><CalendarDays />Um plano para sua rotina</span><span><Layers3 />Conteúdo, prática e revisão</span><span><ChartNoAxesCombined />Seu progresso em perspectiva</span></div>
            </aside>
          </div>
        </div>
      </section>
    </main>
  );
}
