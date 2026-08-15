"use client";

import { ArrowRight, Lock, Mail, Sparkles, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

export type FormMode = "login" | "signup";

export function LoginForm({
  mode = "login",
  redirectTo,
  onModeChange,
}: {
  mode?: FormMode;
  redirectTo?: string;
  onModeChange?: (mode: FormMode) => void;
}) {
  const router = useRouter();
  const isSignup = mode === "signup";

  const [name, setName] = useState("");
  const [email, setEmail] = useState(
    !isSignup && process.env.NODE_ENV === "development" ? "aluno@estudaki.com" : "",
  );
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    router.prefetch("/dashboard");
    router.prefetch("/onboarding");
  }, [router]);

  async function submit(event?: FormEvent) {
    event?.preventDefault();
    setLoading(true);
    setError("");

    if (isSignup && !name.trim()) {
      setError("Informe seu nome de usuário.");
      setLoading(false);
      return;
    }

    if (!email.trim()) {
      setError("Informe seu e-mail.");
      setLoading(false);
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Informe um e-mail válido.");
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intent: isSignup ? "signup" : "login",
          email: email.trim().toLowerCase(),
          password,
          name: isSignup ? name.trim() : undefined,
        }),
      });
      const data = (await response.json().catch(() => null)) as { error?: string } | null;

      if (!response.ok) {
        setError(data?.error ?? "Não foi possível entrar agora.");
        setLoading(false);
        return;
      }

      router.replace(isSignup ? "/onboarding" : redirectTo ?? "/dashboard");
    } catch {
      setError("Não foi possível entrar agora.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      {isSignup && (
        <label className="block">
          <span className="mb-1.5 block text-[12px] font-semibold text-[#0F172A]">
            Nome de usuário
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
              placeholder="Ex: Guilherme"
              className="ek-login-input"
            />
          </div>
        </label>
      )}

      <label className="block">
        <span className="mb-1.5 block text-[12px] font-semibold text-[#0F172A]">
          E-mail
        </span>
        <div className="ek-login-field group relative">
          <span className="ek-login-field-icon">
            <Mail className="h-4 w-4" />
          </span>
          <input
            type="email"
            inputMode="email"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              setError("");
            }}
            autoComplete="email"
            placeholder="seu@email.com"
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
      </label>

      {error && (
        <p className="rounded-lg border border-orange-200 bg-orange-50 px-3 py-1.5 text-[12px] font-medium text-orange-700">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="ek-login-submit group relative w-full overflow-hidden rounded-2xl px-5 text-[15px] font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-70"
      >
        <span className="ek-login-shine" aria-hidden />
        <span className="relative z-10 flex items-center justify-center gap-2 py-3">
          {loading ? (
            isSignup ? "Criando conta..." : "Entrando..."
          ) : (
            <>
              {isSignup ? "Criar conta grátis" : "Entrar"}
              <ArrowRight className="h-4 w-4 transition-colors duration-200" />
            </>
          )}
        </span>
      </button>

      <div className="flex items-center justify-center gap-1.5 pt-0.5 text-[11px] font-medium text-slate-500">
        <Lock className="h-3 w-3 text-slate-400" />
        Conta protegida e salva no banco de dados.
      </div>

      <div className="pt-1.5 text-center text-[12px] font-medium text-slate-500">
        {isSignup ? (
          <>
            Já tem conta?{" "}
            <button
              type="button"
              onClick={() => onModeChange?.("login")}
              className="ek-login-signup-link inline-flex items-center gap-1 border-0 bg-transparent p-0 font-extrabold text-[#F97316]"
            >
              Entrar
              <ArrowRight className="h-3 w-3" />
            </button>
          </>
        ) : (
          <>
            Ainda não tem conta?{" "}
            <button
              type="button"
              onClick={() => onModeChange?.("signup")}
              className="ek-login-signup-link inline-flex items-center gap-1 border-0 bg-transparent p-0 font-extrabold text-[#F97316]"
            >
              Crie sua conta grátis
              <Sparkles className="h-3 w-3" />
            </button>
          </>
        )}
      </div>
    </form>
  );
}
