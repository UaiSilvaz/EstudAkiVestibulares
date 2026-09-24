"use client";

import Link from "next/link";
import { useState } from "react";
import { BookOpen, CalendarDays, ChartNoAxesCombined } from "lucide-react";
import { LoginForm, type FormMode } from "@/components/login-form";
import { SilvaBrand } from "@/components/silva-brand";

export function LoginScreen({ initialMode, redirectTo }: { initialMode: FormMode; redirectTo?: string }) {
  const [formMode, setFormMode] = useState<FormMode>(initialMode);
  const isSignup = formMode === "signup";
  function changeFormMode(nextMode: FormMode) {
    setFormMode(nextMode);
    const params = new URLSearchParams();
    if (nextMode === "signup") params.set("signup", "true");
    if (redirectTo) params.set("redirect", redirectTo);
    window.history.replaceState(null, "", "/login" + (params.size ? "?" + params.toString() : ""));
  }
  return <main className="silva-login">
    <section className="silva-login-form">
      <Link href="/" aria-label="Página inicial Silva Educacional"><SilvaBrand color /></Link>
      <h1>{isSignup ? "Seu próximo capítulo começa aqui." : "Bom ter você de volta."}</h1>
      <p>{isSignup ? "Crie sua conta e encontre o caminho para o seu objetivo." : "Entre na sua conta e continue sua preparação."}</p>
      <div className="mt-7"><LoginForm key={formMode} mode={formMode} redirectTo={redirectTo} onModeChange={changeFormMode} /></div>
      <Link href="/" className="silva-link mt-8">← Voltar à página inicial</Link>
    </section>
    <aside className="silva-login-aside"><p className="silva-eyebrow">SILVA EDUCACIONAL</p><h2>Diferentes caminhos.<br />O mesmo compromisso<br />com o seu futuro.</h2><p>Um lugar para aprender, praticar e transformar a sua dedicação em novos passos.</p><div className="mt-6">{[{ icon: CalendarDays, label: "Um plano que acompanha seu objetivo" }, { icon: BookOpen, label: "Aulas, questões e revisões conectadas" }, { icon: ChartNoAxesCombined, label: "Clareza para acompanhar sua evolução" }].map(({ icon: Icon, label }) => <div className="silva-login-benefit" key={label}><Icon size={19} />{label}</div>)}</div></aside>
  </main>;
}
