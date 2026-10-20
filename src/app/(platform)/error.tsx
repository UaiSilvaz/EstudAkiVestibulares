"use client";

import { AlertTriangle, RotateCw } from "lucide-react";
import { useEffect } from "react";

export default function PlatformError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Erro na Área autenticada", error);
  }, [error]);

  return (
    <main className="flex min-h-[70vh] items-center justify-center px-4 py-10">
      <section className="w-full max-w-xl rounded-[18px] border border-red-100 bg-white p-6 text-center shadow-sm md:p-8">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-500 ring-1 ring-red-100">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <p className="mt-5 text-[11px] font-semibold uppercase tracking-wide text-red-500">
          Algo saiu do ritmo
        </p>
        <h1 className="mt-2 font-display text-2xl font-bold text-[#0F172A]">
          Não conseguimos carregar esta parte.
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm font-semibold leading-6 text-slate-500">
          Sua sessão continua segura. Tente recarregar esta tela para buscar os dados novamente.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl    px-5 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 active:scale-[0.99] professional-action"
        >
          <RotateCw className="h-4 w-4" />
          Tentar novamente
        </button>
      </section>
    </main>
  );
}
