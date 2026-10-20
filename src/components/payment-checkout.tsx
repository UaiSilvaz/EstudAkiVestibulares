"use client";
import { Landmark } from "@/components/visual/aicon-icons";
import { ArrowUpRight, CreditCard, Loader2, QrCode, ShieldCheck } from "lucide-react";
import { useState } from "react";

export function PaymentCheckout({ courseId, productId, preparationId, label = "Continuar para pagamento" }: { courseId?: string; productId?: string; preparationId?: string; label?: string }) {
  const [method, setMethod] = useState("PIX");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function checkout() {
    if (pending) return;
    setPending(true); setError("");
    try {
      const response = await fetch("/api/payments/checkout", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId, productId, preparationId, method }), signal: AbortSignal.timeout(45_000),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Não foi possível abrir o pagamento.");
      const url = new URL(data.url);
      if (url.protocol !== "https:") throw new Error("Link de pagamento inválido.");
      window.location.assign(url.toString());
    } catch (error) { setError(error instanceof Error ? error.message : "Confira a conexão e tente novamente."); setPending(false); }
  }
  return <div className="space-y-4">
    <fieldset disabled={pending} className="grid grid-cols-3 gap-2">
      <legend className="mb-3 text-sm font-semibold text-slate-700">Como você prefere pagar?</legend>
      {([{ id: "PIX", label: "Pix", icon: QrCode }, { id: "CARD", label: "Cartão", icon: CreditCard }, { id: "BOLETO", label: "Boleto", icon: Landmark }]).map(option => <label key={option.id}
        className={`relative flex cursor-pointer flex-col items-center gap-2 rounded-2xl border px-2 py-4 text-xs font-bold transition ${method === option.id ? "border-[color:var(--theme-border)] bg-orange-50 text-[color:var(--theme-primary)] ring-1 ring-orange-200" : "border-slate-200 bg-white text-slate-600"}`}>
        <input type="radio" name={`payment-method-${courseId || productId || "cart"}`} value={option.id} checked={method === option.id} onChange={() => setMethod(option.id)} className="sr-only peer" />
        <option.icon className="h-5 w-5 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-orange-500" />{option.label}
      </label>)}
    </fieldset>
    {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <button type="button" onClick={checkout} disabled={pending} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-orange-500 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[color:var(--theme-action-bg)] disabled:opacity-60">
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUpRight className="h-4 w-4" />}{pending ? "Preparando pagamento…" : label}
    </button>
    <p className="flex items-start justify-center gap-1.5 text-center text-[11px] leading-5 text-slate-500"><ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />Pagamento seguro. Acesso liberado após confirmação.</p>
  </div>;
}
