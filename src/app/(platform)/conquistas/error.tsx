"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function ConquistasError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Conquistas indisponiveis", error);
  }, [error]);

  return (
    <div className="rounded-[28px] border border-blue-200 bg-blue-50 p-6 text-center shadow-sm">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-blue-600">
        <AlertTriangle className="h-7 w-7" />
      </div>
      <h1 className="mt-4 text-2xl font-black text-blue-950">Conquistas em modo de recuperacao</h1>
      <p className="mx-auto mt-2 max-w-xl text-sm font-semibold leading-6 text-blue-800">
        O catalogo nao carregou nesta tentativa. Tente novamente para recarregar seu progresso.
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-3">
        <button type="button" onClick={reset} className="ek-button ek-button-primary">
          <RefreshCw className="h-4 w-4" />
          Tentar novamente
        </button>
        <Link href="/dashboard" className="ek-button ek-button-ghost">
          Ir ao inicio
        </Link>
      </div>
    </div>
  );
}
