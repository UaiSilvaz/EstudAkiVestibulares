"use client";

import { Mail } from "@/components/visual/aicon-icons";
import { ArrowRight, Lock, User } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";

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
    !isSignup && process.env.NODE_ENV === "development" ? "Admin@gmail.com" : "",
  );
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const submitting = useRef(false);
  const requestRef = useRef<AbortController | null>(null);

  useEffect(() => () => requestRef.current?.abort(), []);

  async function submit(event?: FormEvent) {
    event?.preventDefault();
    if (submitting.current || loading) return;
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

    if (password.length < (isSignup ? 8 : 6)) {
      setError(`A senha deve ter pelo menos ${isSignup ? 8 : 6} caracteres.`);
      setLoading(false);
      return;
    }

    submitting.current = true;
    const request = new AbortController();
    requestRef.current = request;
    const timeout = window.setTimeout(() => request.abort(), 20000);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: request.signal,
        body: JSON.stringify({
          intent: isSignup ? "signup" : "login",
          email: email.trim().toLowerCase(),
          password,
          name: isSignup ? name.trim() : undefined,
        }),
      });
      const data = (await response.json().catch(() => null)) as { error?: string; verificationRequired?: boolean } | null;
      if (data?.verificationRequired) {
        router.replace(`/confirmar-email?email=${encodeURIComponent(email.trim().toLowerCase())}`);
        return;
      }

      if (!response.ok) {
        setError(data?.error ?? "Não foi possível entrar agora.");
        setLoading(false);
        return;
      }

      const destination = isSignup ? "/onboarding" : redirectTo ?? "/dashboard";
      const target = new URL(destination, window.location.origin);
      window.location.replace(target.origin === window.location.origin ? target.href : `${window.location.origin}/dashboard`);
    } catch {
      setError("Não foi possível entrar agora.");
      setLoading(false);
    } finally {
      window.clearTimeout(timeout);
      submitting.current = false;
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
            placeholder={isSignup ? "Mínimo 8 caracteres" : "Sua senha"}
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
        className="ek-login-submit group relative w-full overflow-hidden rounded-2xl px-5 text-[15px] font-bold text-white disabled:cursor-not-allowed disabled:opacity-70"
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
        Seu acesso é pessoal e protegido.
      </div>

      {!isSignup && <Link href="/recuperar-senha" className="block text-center text-xs font-semibold text-orange-600">Esqueci minha senha</Link>}
      <div className="pt-1.5 text-center text-[12px] font-medium text-slate-500">
        {isSignup ? (
          <>
            Já tem conta?{" "}
            <button
              type="button"
              disabled={loading}
              onClick={() => onModeChange?.("login")}
              className="ek-login-signup-link inline-flex items-center gap-1 border-0 bg-transparent p-0 font-bold text-[#F97316]"
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
              disabled={loading}
              onClick={() => onModeChange?.("signup")}
              className="ek-login-signup-link inline-flex items-center gap-1 border-0 bg-transparent p-0 font-bold text-[#F97316]"
            >
              Crie sua conta grátis
            </button>
          </>
        )}
      </div>
    </form>
  );
}
