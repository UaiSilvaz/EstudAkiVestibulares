"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function BibliotecaError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Biblioteca indisponivel", error);
  }, [error]);

  return (
    <div className="rounded-[28px] border border-amber-200 bg-amber-50 p-6 text-center shadow-sm">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-amber-600">
        <AlertTriangle className="h-7 w-7" />
      </div>
      <h1 className="mt-4 text-2xl font-black text-amber-950">Biblioteca em modo de recuperacao</h1>
      <p className="mx-auto mt-2 max-w-xl text-sm font-semibold leading-6 text-amber-800">
        Nao conseguimos carregar seus materiais nesta tentativa. Atualize a tela ou volte para Materiais enquanto o acesso sincroniza.
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-3">
        <button type="button" onClick={reset} className="ek-button ek-button-primary">
          <RefreshCw className="h-4 w-4" />
          Tentar novamente
        </button>
        <Link href="/materials" className="ek-button ek-button-ghost">
          Ver materiais
        </Link>
      </div>
    </div>
  );
}
