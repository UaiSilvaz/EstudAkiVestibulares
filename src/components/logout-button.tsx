"use client";

import { LogOut } from "lucide-react";
import { useState } from "react";
import { useLoadingRouter } from "@/components/use-loading-router";

export function LogoutButton() {
  const router = useLoadingRouter();
  const [loading, setLoading] = useState(false);

  async function logout() {
    setLoading(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
  }

  return (
    <button
      type="button"
      onClick={logout}
      disabled={loading}
      className="flex w-full items-center justify-center gap-2 rounded-2xl border border-blue-100 bg-white px-3 py-2.5 text-sm font-bold text-slate-600 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
    >
      <LogOut className="h-4 w-4" />
      {loading ? "Saindo..." : "Sair"}
    </button>
  );
}
