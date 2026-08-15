"use client";

import Image from "next/image";
import { useState } from "react";
import { Sparkles } from "lucide-react";
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
    <main className="estudaki-login-page relative min-h-screen overflow-hidden bg-[#FFFBF7]">
      <div className="estudaki-login-bg-blob estudaki-login-bg-blob-a" aria-hidden />
      <div className="estudaki-login-bg-blob estudaki-login-bg-blob-b" aria-hidden />
      <div className="estudaki-login-bg-blob estudaki-login-bg-blob-c" aria-hidden />
      <div className="estudaki-login-dots" aria-hidden />

      <section className="relative z-10 mx-auto flex min-h-screen w-full max-w-[1060px] items-center justify-center px-4 py-4 sm:px-6">
        <div className="estudaki-login-card relative w-full overflow-hidden rounded-[28px] border border-white/80 bg-white/85 shadow-[0_40px_90px_-50px_rgba(42,23,88,0.45)] backdrop-blur-xl">
          <div className="grid lg:grid-cols-[1fr_1fr]">
            <aside className="relative flex flex-col px-5 pb-5 pt-6 sm:px-8 sm:pt-7 lg:px-10 lg:py-8">
              <div className="flex items-center gap-2.5">
                <Image
                  src="/brand/estudaki-logo.png"
                  alt="EstudAki Vestibulares"
                  width={180}
                  height={52}
                  priority
                  className="h-9 w-auto object-contain"
                />
              </div>

              <div className="my-auto pt-6 lg:pt-4">
                <span className="estudaki-login-badge">
                  <Sparkles className="h-3 w-3" />
                  {isSignup ? "Comece agora" : "Acesso rápido"}
                </span>

                <h1 className="mt-4 font-display text-[24px] font-extrabold leading-[1.08] tracking-tight text-[#0F172A] sm:text-[28px]">
                  {isSignup ? (
                    <>
                      Crie sua conta e{" "}
                      <span className="ek-text-gradient-orange">comece a estudar</span>
                    </>
                  ) : (
                    <>
                      Entre e continue sua{" "}
                      <span className="ek-text-gradient-orange">preparação</span>
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
                Ao continuar, você concorda com os{" "}
                <a href="#" className="font-bold text-slate-600 underline-offset-2 hover:underline">
                  termos
                </a>{" "}
                e a{" "}
                <a href="#" className="font-bold text-slate-600 underline-offset-2 hover:underline">
                  política de privacidade
                </a>
                .
              </p>
            </aside>

            <aside className="estudaki-login-hero relative isolate hidden min-h-[300px] flex-col overflow-hidden lg:flex lg:min-h-[560px]">
              <div className="estudaki-login-hero-glow" aria-hidden />
              <div className="estudaki-login-hero-blob" aria-hidden />
              <div className="estudaki-login-hero-ring" aria-hidden />
              <div className="estudaki-login-hero-ring estudaki-login-hero-ring-2" aria-hidden />

              <div className="estudaki-login-quote estudaki-login-quote-top relative z-10 mx-auto mt-6 max-w-[280px] rounded-2xl border border-white/70 bg-white/85 px-4 py-2.5 text-center shadow-[0_18px_36px_-22px_rgba(15,23,42,0.18)] backdrop-blur sm:mt-8 lg:mt-10">
                <p className="text-[12px] font-bold leading-snug text-[#0F172A] sm:text-[13px]">
                  Sua{" "}
                  <span className="ek-text-gradient-orange">aprovação</span>{" "}
                  {isSignup ? "começa com o próximo passo." : "continua no próximo login."}
                </p>
              </div>

              <div className="estudaki-login-floating relative z-10 mt-auto flex w-full flex-1 items-end justify-center overflow-hidden">
                <Image
                  src="/jovens/rapaz-clean.png"
                  alt="Rapaz apontando para o formulário"
                  width={1410}
                  height={1115}
                  priority
                  className="estudaki-login-hero-img h-auto w-auto max-w-none select-none object-contain object-bottom drop-shadow-[0_24px_36px_rgba(15,23,42,0.18)]"
                  style={{ height: "clamp(300px, 58vh, 545px)" }}
                />
              </div>
            </aside>
          </div>
        </div>
      </section>
    </main>
  );
}
