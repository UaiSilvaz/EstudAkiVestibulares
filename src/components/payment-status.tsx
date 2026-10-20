"use client";
import { Clock3 } from "@/components/visual/aicon-icons";
import Link from "next/link";
import { CheckCircle2, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";

export function PaymentStatus({ orderId, initialStatus, devMode }: { orderId: string; initialStatus: string; devMode: boolean }) {
  const [status, setStatus] = useState(initialStatus);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    if (status !== "PENDING") return;
    let stopped = false; let timer: ReturnType<typeof setTimeout>; let attempts = 0;
    const controller = new AbortController();
    async function check() {
      try {
        const response = await fetch(`/api/payments/orders/${orderId}`, { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(20_000)]) });
        const data = await response.json();
        if (stopped) return;
        if (!response.ok) throw new Error();
        setStatus(data.status); setError("");
        if (data.status !== "PENDING") return;
      } catch { if (!stopped) setError("A confirmação pode levar alguns instantes. Você pode atualizar novamente."); }
      if (!stopped && ++attempts < 36) timer = setTimeout(check, 10_000);
    }
    void check();
    return () => { stopped = true; controller.abort(); clearTimeout(timer); };
  }, [orderId, status, refresh]);
  const approved = status === "APPROVED";
  const terminal = ["REFUNDED", "CANCELED", "CHARGEBACK"].includes(status);
  return <div className="mx-auto max-w-lg rounded-[18px] border border-[color:var(--theme-border)] bg-white p-8 text-center shadow-sm">
    {devMode && <p className="mb-5 rounded-full bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">Pagamento em ambiente de teste</p>}
    {approved ? <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-500" /> : <Clock3 className="mx-auto h-14 w-14 text-[color:var(--theme-primary)]" />}
    <h1 className="mt-5 font-display text-2xl font-bold text-slate-900">{approved ? "Tudo certo. Vamos estudar?" : terminal ? "Pagamento encerrado" : "Estamos confirmando seu pagamento"}</h1>
    <p className="mt-3 text-sm leading-6 text-slate-500">{approved ? "Seu acesso já está disponível na sua conta." : terminal ? "Este pedido foi cancelado, estornado ou teve uma contestação. Confira suas compras." : "Assim que o provedor confirmar, seu acesso será liberado automaticamente."}</p>
    {error && <p role="status" className="mt-4 text-xs text-amber-700">{error}</p>}
    {!approved && !terminal && <button type="button" onClick={() => setRefresh(value => value + 1)} className="mx-auto mt-5 flex items-center gap-2 text-sm font-bold text-[color:var(--theme-primary)]"><RefreshCw className="h-4 w-4" /> Verificar novamente</button>}
    <Link href={approved ? "/cursos" : "/compras"} className="mt-6 inline-flex min-h-11 items-center rounded-xl bg-orange-500 px-5 text-sm font-bold text-white">{approved ? "Acessar meus cursos" : "Ver minhas compras"}</Link>
  </div>;
}
