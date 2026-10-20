"use client";

import Link from "next/link";
import { MailCheck, ArrowRight, LoaderCircle } from "lucide-react";
import { useState, type FormEvent } from "react";
import { AccountFrame } from "./account-frame";

export function EmailConfirmationForm({ token, initialEmail = "" }: { token?: string; initialEmail?: string }) {
  const [email, setEmail] = useState(initialEmail);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [resend, setResend] = useState(!token);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/auth/email", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(resend ? { email } : { token }), signal: AbortSignal.timeout(20_000) });
      const data = await response.json();
      if (!response.ok) setError(data.error || "Tente novamente.");
      else { setMessage(data.message); if (!resend) setConfirmed(true); }
    } catch { setError("Não foi possível conectar. Tente novamente."); }
    finally { setBusy(false); }
  }
  return <AccountFrame>
      <MailCheck className="mb-6 h-9 w-9 text-[color:var(--theme-primary)]" strokeWidth={1.5} />
      <h1 className="text-2xl font-bold text-slate-900">{confirmed ? "Seu e-mail está confirmado" : resend ? "Confira sua caixa de entrada" : "Confirme seu e-mail"}</h1>
      <p className="mt-3 text-sm leading-6 text-slate-600">{confirmed ? "Agora você pode entrar e preparar seu plano de estudos." : resend ? "Abra o link que enviamos. Se precisar, solicite uma nova confirmação abaixo." : "Toque no botão abaixo para confirmar seu endereço e liberar o acesso à sua conta."}</p>
      {!confirmed && <form onSubmit={submit} className="mt-6 space-y-4">
        {resend && <label className="block text-sm font-medium text-slate-700">E-mail<input type="email" autoComplete="email" required maxLength={254} value={email} onChange={e => setEmail(e.target.value)} className="welcome-input mt-2" /></label>}
        <button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-3 font-semibold text-white disabled:opacity-60">{busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}{resend ? "Reenviar confirmação" : "Confirmar meu e-mail"}</button>
      </form>}
      {error && <p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}
      {message && <p role="status" className="mt-4 text-sm text-green-700">{message}</p>}
      {token && !resend && !confirmed && <button type="button" onClick={() => { setResend(true); setError(""); }} className="mt-4 text-sm font-semibold text-slate-600">O link expirou? Solicitar outro</button>}
      <Link href="/login" className="mt-6 block text-sm font-semibold text-[color:var(--theme-primary)]">{confirmed ? "Entrar na minha conta" : "Voltar para entrar"}</Link>
  </AccountFrame>;
}
