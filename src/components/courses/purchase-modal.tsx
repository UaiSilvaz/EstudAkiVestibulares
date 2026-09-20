"use client";

import { CheckCircle2, CreditCard, Landmark, QrCode, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatCoursePrice } from "./format";

type Props = {
  courseId: string;
  courseSlug: string;
  title: string;
  priceCents: number;
  open: boolean;
  onClose: () => void;
};

export function PurchaseModal({ courseId, courseSlug, title, priceCents, open, onClose }: Props) {
  const router = useRouter();
  const [method, setMethod] = useState<"PIX" | "CARD" | "BOLETO">("PIX");
  const [approved, setApproved] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  async function approve() {
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/courses/${courseId}/purchase-demo`, { method: "POST" });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Nao foi possivel aprovar.");
      setApproved(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha na compra demo.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-xl overflow-hidden rounded-[30px] border border-white/70 bg-white shadow-2xl">
        <div className="relative bg-gradient-to-br from-blue-600 via-cyan-500 to-emerald-400 p-6 text-white">
          <button type="button" onClick={onClose} aria-label="Fechar" className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-2xl bg-white/18 ring-1 ring-white/25">
            <X className="h-4 w-4" />
          </button>
          {approved ? <CheckCircle2 className="h-12 w-12" /> : <CreditCard className="h-12 w-12" />}
          <h2 className="mt-4 font-display text-2xl font-black">{approved ? "Pagamento aprovado!" : "Checkout demo"}</h2>
          <p className="mt-2 text-sm font-semibold text-white/82">
            {approved ? "Curso liberado. A trilha sequencial ja esta pronta para voce comecar." : "Simule o pagamento em ambiente de desenvolvimento."}
          </p>
        </div>
        <div className="space-y-5 p-5">
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Curso</p>
            <div className="mt-2 flex items-center justify-between gap-3">
              <p className="font-black text-slate-950">{title}</p>
              <p className="text-lg font-black text-blue-700">{formatCoursePrice(priceCents)}</p>
            </div>
          </div>
          {!approved && (
            <div className="grid grid-cols-3 gap-2">
              {([
                ["PIX", QrCode],
                ["CARD", CreditCard],
                ["BOLETO", Landmark],
              ] satisfies Array<[typeof method, LucideIcon]>).map(([label, Icon]) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setMethod(label as "PIX" | "CARD" | "BOLETO")}
                  className={`flex h-20 flex-col items-center justify-center gap-2 rounded-2xl border text-xs font-black transition ${method === label ? "border-blue-300 bg-blue-50 text-blue-700" : "border-slate-100 bg-white text-slate-500 hover:bg-slate-50"}`}
                >
                  <Icon className="h-5 w-5" />
                  {label}
                </button>
              ))}
            </div>
          )}
          {error && <p className="rounded-2xl bg-rose-50 p-3 text-sm font-bold text-rose-700">{error}</p>}
          <div className="flex flex-wrap gap-3">
            {approved ? (
              <a href={`/cursos/${courseSlug}`} className="inline-flex h-12 items-center justify-center rounded-full bg-emerald-600 px-5 text-sm font-black text-white">
                Comecar agora
              </a>
            ) : (
              <button type="button" disabled={pending} onClick={approve} className="inline-flex h-12 items-center justify-center rounded-full bg-blue-600 px-5 text-sm font-black text-white shadow-lg shadow-blue-100 transition hover:-translate-y-0.5 disabled:opacity-70">
                {pending ? "Aprovando..." : "Simular pagamento aprovado"}
              </button>
            )}
            <button type="button" onClick={onClose} className="inline-flex h-12 items-center justify-center rounded-full border border-slate-200 px-5 text-sm font-black text-slate-700">
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
