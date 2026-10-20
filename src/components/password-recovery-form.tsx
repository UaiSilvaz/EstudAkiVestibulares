"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { AccountFrame } from "./account-frame";

export function PasswordRecoveryForm({ token }: { token?: string }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/auth/password", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(token ? { token, password } : { email }), signal: AbortSignal.timeout(20_000),
      });
      const data = await response.json();
      if (!response.ok) setError(data.error || "Tente novamente.");
      else setMessage(data.message);
    } catch { setError("Não foi possível conectar. Tente novamente."); }
    finally { setBusy(false); }
  }
  return <AccountFrame>
    <form onSubmit={submit} className="space-y-5">
      <h1 className="text-2xl font-bold text-slate-900">{token ? "Crie sua nova senha" : "Recupere seu acesso"}</h1>
      <p className="text-sm text-slate-600">{token ? "Use pelo menos 8 caracteres. Depois, entre novamente na sua conta." : "Informe o e-mail da sua conta ou da compra para receber um link de recuperação."}</p>
      <label className="block text-sm font-medium text-slate-700">
        {token ? "Nova senha" : "E-mail"}
        <input required type={token ? "password" : "email"} autoComplete={token ? "new-password" : "email"}
          minLength={token ? 8 : undefined} maxLength={token ? 72 : 254} value={token ? password : email}
          onChange={(event) => token ? setPassword(event.target.value) : setEmail(event.target.value)}
          className="welcome-input mt-2" />
      </label>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      {message && <p role="status" className="text-sm text-green-700">{message}</p>}
      <button disabled={busy || Boolean(message)} className="w-full rounded-xl bg-orange-500 px-4 py-3 font-bold text-white disabled:opacity-60">
        {busy ? "Aguarde…" : token ? "Alterar senha" : "Enviar link"}
      </button>
      <Link href="/login" className="block text-center text-sm font-semibold text-[color:var(--theme-primary)]">Voltar ao login</Link>
    </form>
  </AccountFrame>;
}
