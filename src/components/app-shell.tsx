"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { LogoEstudAki } from "./logo-estudaki";
import { SidebarNav } from "./sidebar-nav";
import { LogoutButton } from "./logout-button";
import type { AppUser } from "@/lib/roles";
import { canManageContent } from "@/lib/roles";
import { roleLabel } from "@/lib/utils";
import { Sparkles, Trophy } from "lucide-react";

type Props = {
  user: AppUser;
  children: React.ReactNode;
};

export function AppShell({ user, children }: Props) {
  const canManage = canManageContent(user.role);
  const [openMobile, setOpenMobile] = useState(false);

  return (
    <div className="relative min-h-screen">
      {/* Desktop sidebar */}
      <aside className="fixed left-0 top-0 z-40 hidden h-screen w-[280px] flex-col border-r border-slate-100 bg-white/90 px-4 py-5 shadow-[18px_0_50px_-25px_rgba(15,23,42,0.10)] backdrop-blur-2xl lg:flex">
        <div className="px-2 pb-6">
          <LogoEstudAki size="sm" />
        </div>

        <div className="thin-scrollbar -mx-1 flex-1 overflow-y-auto px-1 pr-2">
          <SidebarNav canManage={canManage} />
        </div>

        <div className="mt-3 rounded-[24px] border border-blue-100/80 bg-white p-3 shadow-sm">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#2563EB] via-[#22D3EE] to-[#86EFAC] text-sm font-black text-white shadow-md ring-2 ring-white">
              {user.name
                .split(" ")
                .slice(0, 2)
                .map((part) => part[0])
                .join("")}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-extrabold text-[#0F172A]">{user.name}</p>
              <p className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-slate-500">
                <Sparkles className="h-3 w-3 text-orange-500" />
                {roleLabel(user.role)}
              </p>
            </div>
          </div>
          <div className="mb-2 flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-2 text-[11px] font-extrabold text-slate-600">
            <span className="flex items-center gap-1.5">
              <Trophy className="h-3.5 w-3.5 text-amber-500" /> Liga
            </span>
            <span className="rounded-full bg-gradient-to-r from-[#FACC15] to-[#F97316] px-2.5 py-0.5 text-white">
              {user.league}
            </span>
          </div>
          <LogoutButton />
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 border-b border-slate-100 bg-white/90 backdrop-blur-2xl lg:hidden">
        <div className="flex items-center justify-between gap-2 px-4 py-3">
          <button
            type="button"
            aria-label="Abrir menu"
            onClick={() => setOpenMobile(true)}
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-[#0F172A] shadow-sm"
          >
            <Menu className="h-4 w-4" />
          </button>
          <LogoEstudAki size="sm" />
          <div className="flex items-center gap-2">
            <div className="rounded-full bg-gradient-to-r from-[#FACC15] to-[#F97316] px-3 py-1 text-[10px] font-black uppercase tracking-wider text-white">
              {user.league}
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[#2563EB] via-[#22D3EE] to-[#86EFAC] text-xs font-black text-white ring-2 ring-white">
              {user.name
                .split(" ")
                .slice(0, 2)
                .map((part) => part[0])
                .join("")}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile drawer */}
      <AnimatePresence>
        {openMobile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 lg:hidden"
          >
            <button
              type="button"
              aria-label="Fechar menu"
              onClick={() => setOpenMobile(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-md"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 240, damping: 26 }}
              className="absolute left-0 top-0 h-full w-[88%] max-w-sm overflow-y-auto bg-white p-5 shadow-2xl"
            >
              <div className="mb-5 flex items-center justify-between">
                <LogoEstudAki size="sm" />
                <button
                  type="button"
                  aria-label="Fechar"
                  onClick={() => setOpenMobile(false)}
                  className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <SidebarNav canManage={canManage} />
              <div className="mt-4 rounded-2xl border border-slate-100 bg-white p-3">
                <div className="mb-2 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[#2563EB] via-[#22D3EE] to-[#86EFAC] text-sm font-black text-white shadow-md">
                    {user.name
                      .split(" ")
                      .slice(0, 2)
                      .map((part) => part[0])
                      .join("")}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-extrabold text-[#0F172A]">{user.name}</p>
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                      {roleLabel(user.role)}
                    </p>
                  </div>
                </div>
                <LogoutButton />
              </div>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="lg:pl-[280px]">
        <div className="mx-auto min-h-screen w-full max-w-[1500px] px-3 py-4 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
