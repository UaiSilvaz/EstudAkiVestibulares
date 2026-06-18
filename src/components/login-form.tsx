"use client";

import { motion } from "framer-motion";
import { ArrowRight, Lock, Mail, Smartphone, Sparkles, User } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { CelebrationBurst } from "./visual/celebration-burst";
import { cn } from "@/lib/utils";

type LoginMode = "email" | "phone";
type FormMode = "login" | "signup";

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

export function LoginForm({ mode = "login" }: { mode?: FormMode }) {
  const router = useRouter();
  const isSignup = mode === "signup";

  const [loginMode, setLoginMode] = useState<LoginMode>("email");
  const [name, setName] = useState("");
  const [identifier, setIdentifier] = useState(isSignup ? "" : "aluno@estudaki.com");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [confetti, setConfetti] = useState(0);

  async function submit(event?: FormEvent) {
    event?.preventDefault();
    setLoading(true);
    setError("");

    if (isSignup) {
      if (!name.trim()) {
        setError("Informe seu nome completo.");
        setLoading(false);
        return;
      }
      if (!identifier.trim()) {
        setError("Informe um e-mail ou celular.");
        setLoading(false);
        return;
      }
      if (password.length < 6) {
        setError("Sua senha deve ter pelo menos 6 caracteres.");
        setLoading(false);
        return;
      }
    }

    if (!identifier.trim()) {
      setError("Informe um e-mail ou celular.");
      setLoading(false);
      return;
    }

    if (!password.trim()) {
      setError("Informe uma senha.");
      setLoading(false);
      return;
    }

    const loginEmail =
      loginMode === "phone"
        ? `${onlyDigits(identifier) || "aluno"}@telefone.local`
        : identifier.trim().toLowerCase();

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: loginEmail,
        password,
        name: isSignup ? name.trim() : undefined,
      }),
    });

    if (!response.ok) {
      setError("Não foi possível entrar agora.");
      setLoading(false);
      return;
    }

    setConfetti((value) => value + 1);
    setTimeout(() => router.push("/dashboard"), 450);
    router.refresh();
  }

  function changeMode(nextMode: LoginMode) {
    setLoginMode(nextMode);
    setIdentifier("");
    setError("");
  }

  const Icon = loginMode === "phone" ? Smartphone : Mail;

  return (
    <form onSubmit={submit} className="space-y-3">
      <CelebrationBurst trigger={confetti} origins={[{ x: 50, y: 58 }]} />

      {isSignup && (
        <label className="block">
          <span className="mb-1.5 block text-[12px] font-semibold text-[#0F172A]">
            Nome completo
          </span>
          <div className="ek-login-field group relative">
            <span className="ek-login-field-icon">
              <User className="h-4 w-4" />
            </span>
            <input
              type="text"
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                setError("");
              }}
              autoComplete="name"
              placeholder="Como devemos te chamar?"
              className="ek-login-input"
            />
          </div>
        </label>
      )}

      <div>
        <p className="mb-1.5 text-[12px] font-semibold text-[#0F172A]">
          {isSignup ? "Como você quer se cadastrar?" : "Método de login"}
        </p>
        <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-100/80 p-1 shadow-[inset_0_0_0_1px_rgba(15,23,42,0.04)]">
          {[
            { value: "email" as const, label: "Email", Icon: Mail },
            { value: "phone" as const, label: "Celular", Icon: Smartphone },
          ].map((option) => {
            const active = loginMode === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => changeMode(option.value)}
                className={cn(
                  "group flex min-h-9 items-center justify-center gap-1.5 rounded-xl text-[12.5px] font-bold transition-all duration-200",
                  active
                    ? "ek-login-tab-active text-white"
                    : "bg-white text-slate-600 shadow-[0_1px_2px_rgba(15,23,42,0.06)] hover:bg-blue-50/70 hover:text-blue-600",
                )}
              >
                <option.Icon
                  className={cn(
                    "h-3.5 w-3.5 transition-transform duration-200 group-hover:scale-110",
                    active ? "text-white" : "text-slate-400 group-hover:text-blue-500",
                  )}
                />
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      <label className="block">
        <span className="mb-1.5 block text-[12px] font-semibold text-[#0F172A]">
          {loginMode === "phone" ? "Celular" : "E-mail"}
        </span>
        <div className="ek-login-field group relative">
          <span className="ek-login-field-icon">
            <Icon className="h-4 w-4" />
          </span>
          <input
            type={loginMode === "phone" ? "tel" : "email"}
            inputMode={loginMode === "phone" ? "tel" : "email"}
            value={identifier}
            onChange={(event) => {
              setIdentifier(event.target.value);
              setError("");
            }}
            autoComplete={loginMode === "phone" ? "tel" : "email"}
            placeholder={loginMode === "phone" ? "(17) 99999-9999" : "seu@email.com"}
            className="ek-login-input"
          />
        </div>
      </label>

      <label className="block">
        <span className="mb-1.5 block text-[12px] font-semibold text-[#0F172A]">
          {isSignup ? "Crie uma senha" : "Senha"}
        </span>
        <div className="ek-login-field group relative">
          <span className="ek-login-field-icon">
            <Lock className="h-4 w-4" />
          </span>
          <input
            type="password"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              setError("");
            }}
            autoComplete={isSignup ? "new-password" : "current-password"}
            placeholder={isSignup ? "Mínimo 6 caracteres" : "Sua senha"}
            className="ek-login-input"
          />
        </div>
        {!isSignup && (
          <div className="mt-1.5 flex justify-end">
            <a
              href="#"
              className="text-[11px] font-bold text-[#F97316] underline-offset-2 hover:underline"
            >
              Esqueci minha senha
            </a>
          </div>
        )}
      </label>

      {error && (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-lg border border-orange-200 bg-orange-50 px-3 py-1.5 text-[12px] font-medium text-orange-700"
        >
          {error}
        </motion.p>
      )}

      <motion.button
        type="submit"
        disabled={loading}
        whileHover={!loading ? { y: -2 } : undefined}
        whileTap={!loading ? { scale: 0.98 } : undefined}
        transition={{ type: "spring", stiffness: 400, damping: 22 }}
        className="ek-login-submit group relative w-full overflow-hidden rounded-2xl px-5 text-[15px] font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-70"
      >
        <span className="ek-login-shine" aria-hidden />
        <span className="relative z-10 flex items-center justify-center gap-2 py-3">
          {loading ? (
            isSignup ? "Criando conta..." : "Entrando..."
          ) : (
            <>
              {isSignup ? "Criar conta grátis" : "Entrar"}
              <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </>
          )}
        </span>
      </motion.button>

      <div className="flex items-center justify-center gap-1.5 pt-0.5 text-[11px] font-medium text-slate-500">
        <Lock className="h-3 w-3 text-slate-400" />
        {isSignup
          ? "Seus dados estão seguros e protegidos."
          : "Acesso local liberado para testes."}
      </div>

      <div className="pt-1.5 text-center text-[12px] font-medium text-slate-500">
        {isSignup ? (
          <>
            Já tem conta?{" "}
            <Link
              href="/login"
              className="ek-login-signup-link inline-flex items-center gap-1 font-extrabold text-[#F97316]"
            >
              Entrar
              <ArrowRight className="h-3 w-3" />
            </Link>
          </>
        ) : (
          <>
            Ainda não tem conta?{" "}
            <Link
              href="/login?signup=true"
              className="ek-login-signup-link inline-flex items-center gap-1 font-extrabold text-[#F97316]"
            >
              Crie sua conta grátis
              <Sparkles className="h-3 w-3" />
            </Link>
          </>
        )}
      </div>
    </form>
  );
}
