"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Edit3, Menu, PanelLeftClose, PanelLeftOpen, ShoppingCart, Trophy, UserRound, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { FastLink } from "./fast-link";
import { SidebarNav } from "./sidebar-nav";
import { LogoutButton } from "./logout-button";
import { RouteTransitionIndicator } from "./route-transition-indicator";
import type { AppUser } from "@/lib/roles";
import { canManageContent } from "@/lib/roles";
import { cn, leagueForXp, roleLabel } from "@/lib/utils";
import { LeagueBadge } from "@/components/visual/league-badge";
import { FeedbackProvider } from "@/components/feedback/feedback-provider";

type Props = {
  user: AppUser;
  children: React.ReactNode;
};

export function AppShell({ user, children }: Props) {
  const canManage = canManageContent(user.role);
  const currentLeague = leagueForXp(user.xp);
  const [openMobile, setOpenMobile] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [desktopProfileOpen, setDesktopProfileOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    async function refreshCart() {
      const response = await fetch("/api/cart");
      if (!response.ok) return;
      const data = (await response.json()) as { count?: number };
      setCartCount(data.count ?? 0);
    }
    void refreshCart();
    window.addEventListener("estudaki:cart-updated", refreshCart);
    return () => window.removeEventListener("estudaki:cart-updated", refreshCart);
  }, []);

  return (
    <div className="estudaki-platform-shell relative min-h-screen">
      <RouteTransitionIndicator />

      {/* Desktop sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: sidebarCollapsed ? 76 : 232 }}
        transition={{ duration: 0.24, ease: [0.2, 0.8, 0.2, 1] }}
        className={cn(
          "fixed left-0 top-0 z-40 hidden h-screen flex-col border-r border-slate-100 bg-white/94 py-4 shadow-[18px_0_50px_-30px_rgba(15,23,42,0.16)] backdrop-blur-2xl lg:flex",
          sidebarCollapsed ? "overflow-visible px-2" : "px-3",
        )}
      >
        <div
          className={cn(
            "mb-4 flex shrink-0",
            sidebarCollapsed ? "flex-col items-center gap-2" : "items-center justify-between gap-2 px-1",
          )}
        >
          <FastLink
            href="/dashboard"
            aria-label="EstudAki Vestibulares"
            className={cn(
              "group flex min-w-0 items-center rounded-[14px] transition hover:bg-blue-50",
              sidebarCollapsed ? "h-11 w-11 justify-center" : "gap-3 px-1.5 py-1",
            )}
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-gradient-to-br from-[#1E73FF] via-[#005CFF] to-[#00C896] text-base font-black text-white shadow-[0_12px_28px_-16px_rgba(30,115,255,0.8)] ring-1 ring-white/50">
              &amp;
            </span>
            <AnimatePresence initial={false}>
              {!sidebarCollapsed && (
                <motion.span
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -6 }}
                  transition={{ duration: 0.18 }}
                  className="min-w-0 leading-none"
                >
                  <span className="block truncate font-display text-xl font-extrabold text-[#0F172A]">
                    EstudAki
                  </span>
                  <span className="mt-1 block text-[9px] font-black uppercase text-slate-400">
                    Vestibulares
                  </span>
                </motion.span>
              )}
            </AnimatePresence>
          </FastLink>

          <button
            type="button"
            aria-label={sidebarCollapsed ? "Expandir sidebar" : "Recolher sidebar"}
            title={sidebarCollapsed ? "Expandir sidebar" : "Recolher sidebar"}
            onClick={() => setSidebarCollapsed((current) => !current)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-blue-100 bg-white text-blue-700 shadow-sm transition hover:bg-blue-50 active:scale-95"
          >
            {sidebarCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
        </div>

        <div className={cn("min-h-0 flex-1", sidebarCollapsed ? "overflow-visible" : "overflow-hidden")}>
          <SidebarNav
            canManage={canManage}
            collapsed={sidebarCollapsed}
            onRequestExpand={() => setSidebarCollapsed(false)}
          />
        </div>
      </motion.aside>

      {/* Desktop top bar */}
      <header
        className={cn(
          "sticky top-0 z-30 hidden h-[76px] border-b border-slate-100 bg-white/92 shadow-[0_12px_32px_-28px_rgba(15,23,42,0.28)] backdrop-blur-2xl transition-[margin-left] duration-300 lg:flex",
          sidebarCollapsed ? "lg:ml-[76px]" : "lg:ml-[232px]",
        )}
      >
        <div className="mx-auto flex w-full max-w-[1500px] items-center justify-end px-8">
          <nav className="flex items-center gap-2" aria-label="Conta e compras">
            <div
              title="Liga atual"
              aria-label={`Liga atual: ${currentLeague}`}
              className="flex h-11 items-center gap-2 rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50 to-white px-2.5 shadow-sm"
            >
              <LeagueBadge league={currentLeague} size="sm" showLabel={false} />
              <span className="hidden pr-1 text-xs font-black text-slate-700 xl:inline">
                Liga {currentLeague}
              </span>
            </div>
            <FastLink
              href="/carrinho"
              title="Abrir carrinho"
              aria-label="Abrir carrinho"
              className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-blue-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-blue-100"
            >
              <ShoppingCart className="h-[18px] w-[18px]" />
              {cartCount > 0 && <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-orange-500 px-1 text-[9px] font-black text-white ring-2 ring-white">{cartCount}</span>}
            </FastLink>
            <div className="relative">
              <button
                type="button"
                aria-label="Abrir menu do perfil"
                aria-expanded={desktopProfileOpen}
                onClick={() => setDesktopProfileOpen((current) => !current)}
                className="flex h-11 items-center gap-2 rounded-2xl border border-slate-100 bg-white pl-1.5 pr-3 shadow-sm transition hover:border-blue-100 hover:shadow-md"
              >
                <UserAvatar user={user} className="h-8 w-8 rounded-xl text-[10px]" />
                <span className="hidden max-w-32 truncate text-xs font-black text-slate-800 xl:block">
                  {user.name.split(" ")[0]}
                </span>
                <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition ${desktopProfileOpen ? "rotate-180" : ""}`} />
              </button>
              <AnimatePresence>
                {desktopProfileOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.98 }}
                    className="absolute right-0 top-[calc(100%+10px)] w-72 overflow-hidden rounded-[24px] border border-slate-100 bg-white p-2 shadow-[0_24px_60px_-24px_rgba(15,23,42,0.38)]"
                  >
                    <div className="flex items-center gap-3 rounded-[18px] bg-gradient-to-br from-blue-50 to-cyan-50 p-3">
                      <UserAvatar user={user} className="h-11 w-11 rounded-2xl text-xs" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-slate-950">{user.name}</p>
                        <p className="mt-0.5 text-[10px] font-black uppercase text-blue-700">
                          {user.xp.toLocaleString("pt-BR")} XP
                        </p>
                      </div>
                    </div>
                    <FastLink onClick={() => setDesktopProfileOpen(false)} href="/perfil" className="mt-1 flex min-h-11 items-center gap-3 rounded-2xl px-3 text-sm font-black text-slate-700 transition hover:bg-blue-50 hover:text-blue-700">
                      <UserRound className="h-4 w-4" /> Meu perfil
                    </FastLink>
                    <div className="flex min-h-11 items-center gap-3 rounded-2xl px-3 text-sm font-black text-slate-700">
                      <Trophy className="h-4 w-4 text-amber-500" />
                      <span className="min-w-0 flex-1">Liga atual</span>
                      <span className="text-xs text-blue-700">{currentLeague}</span>
                    </div>
                    <div className="mt-1 border-t border-slate-100 pt-2">
                      <LogoutButton />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </nav>
        </div>
      </header>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 border-b border-slate-100 bg-white/90 backdrop-blur-2xl lg:hidden">
        <div className="grid grid-cols-[44px_1fr_auto] items-center gap-2 px-3 py-2.5">
          <button
            type="button"
            aria-label="Abrir menu"
            onClick={() => setOpenMobile(true)}
            className="flex h-11 w-11 items-center justify-center rounded-2xl border-2 border-blue-100 bg-white text-blue-700 shadow-[0_9px_22px_-10px_rgba(37,99,235,0.7)] ring-1 ring-blue-50 transition active:scale-95"
          >
            <Menu className="h-5 w-5" strokeWidth={2.5} />
          </button>
          <FastLink href="/dashboard" className="inline-flex min-w-0 items-center justify-center">
            <Image
              src="/brand/estudaki-logo.png"
              alt="EstudAki Vestibulares"
              width={150}
              height={48}
              className="h-9 w-auto object-contain"
              priority
            />
          </FastLink>
          <div className="flex items-center justify-end gap-1.5">
            <FastLink
              href="/carrinho"
              title="Abrir carrinho"
              aria-label="Abrir carrinho"
              className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-blue-700 shadow-sm transition active:scale-95"
            >
              <ShoppingCart className="h-[18px] w-[18px]" />
              {cartCount > 0 && <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-orange-500 px-1 text-[9px] font-black text-white ring-2 ring-white">{cartCount}</span>}
            </FastLink>
            <button
              type="button"
              aria-label="Abrir perfil"
              onClick={() => setProfileOpen(true)}
              className="rounded-2xl transition active:scale-95"
            >
              <UserAvatar user={user} className="h-11 w-11 rounded-2xl text-xs" />
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {profileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] lg:hidden"
          >
            <button
              type="button"
              aria-label="Fechar perfil"
              onClick={() => setProfileOpen(false)}
              className="absolute inset-0 bg-slate-950/35 backdrop-blur-sm"
            />
            <motion.aside
              initial={{ y: 32, opacity: 0, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 28, opacity: 0, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 280, damping: 26 }}
              className="absolute inset-x-3 top-20 overflow-hidden rounded-[30px] border border-white/80 bg-white shadow-2xl"
            >
              <div className="relative overflow-hidden bg-gradient-to-br from-[#2563EB] via-[#22D3EE] to-[#86EFAC] p-5 text-white">
                <div className="absolute -right-12 -top-14 h-36 w-36 rounded-full bg-white/20 blur-2xl" />
                <div className="relative z-10 flex items-center justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <UserAvatar user={user} className="h-14 w-14 rounded-2xl text-base" />
                    <div className="min-w-0">
                      <p className="truncate font-display text-xl font-black">{user.name}</p>
                      <p className="text-[10px] font-black uppercase text-white/78">
                        {roleLabel(user.role)}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    aria-label="Fechar"
                    onClick={() => setProfileOpen(false)}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/18 text-white ring-1 ring-white/30"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="grid gap-2 p-3">
                <FastLink
                  href="/perfil"
                  onClick={() => setProfileOpen(false)}
                  className="flex min-h-12 items-center gap-3 rounded-2xl border border-blue-100 bg-blue-50/70 px-4 text-sm font-black text-[#0F172A]"
                >
                  <UserRound className="h-4 w-4 text-blue-700" />
                  Ver perfil
                </FastLink>
                <FastLink
                  href="/perfil#foto"
                  onClick={() => setProfileOpen(false)}
                  className="flex min-h-12 items-center gap-3 rounded-2xl border border-slate-100 bg-white px-4 text-sm font-black text-[#0F172A]"
                >
                  <Edit3 className="h-4 w-4 text-cyan-600" />
                  Editar perfil
                </FastLink>
                <div className="flex min-h-12 items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-white px-4">
                  <span className="flex items-center gap-2 text-sm font-black text-[#0F172A]">
                    <Trophy className="h-4 w-4 text-amber-500" />
                    Liga/XP
                  </span>
                  <span className="text-xs font-black text-blue-700">
                    {currentLeague} · {user.xp.toLocaleString("pt-BR")} XP
                  </span>
                </div>
                <LogoutButton />
              </div>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile drawer */}
      <AnimatePresence>
        {openMobile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] lg:hidden"
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
              className="absolute left-0 top-0 flex h-full w-[88%] max-w-sm flex-col overflow-hidden bg-white p-5 shadow-2xl"
            >
              <div className="mb-5 flex items-center justify-between">
                <FastLink href="/dashboard" onClick={() => setOpenMobile(false)} className="inline-flex items-center gap-3 rounded-[14px] px-1.5 py-1">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-gradient-to-br from-[#1E73FF] via-[#005CFF] to-[#00C896] text-base font-black text-white shadow-[0_12px_28px_-16px_rgba(30,115,255,0.8)] ring-1 ring-white/50">
                    &amp;
                  </span>
                  <span className="leading-none">
                    <span className="block font-display text-xl font-extrabold text-[#0F172A]">EstudAki</span>
                    <span className="mt-1 block text-[9px] font-black uppercase text-slate-400">
                      Vestibulares
                    </span>
                  </span>
                </FastLink>
                <button
                  type="button"
                  aria-label="Fechar"
                  onClick={() => setOpenMobile(false)}
                  className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="min-h-0 flex-1">
                <SidebarNav canManage={canManage} onNavigate={() => setOpenMobile(false)} />
              </div>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>

      <FeedbackProvider>
        <main
          className={cn(
            "min-w-0 overflow-x-hidden transition-[margin-left] duration-300",
            sidebarCollapsed ? "lg:ml-[76px]" : "lg:ml-[232px]",
          )}
        >
          <div className="mx-auto min-h-screen w-full max-w-[1500px] px-3 py-4 sm:px-5 md:px-6 lg:px-8 lg:py-7 xl:px-8">
            {children}
          </div>
        </main>
      </FeedbackProvider>
    </div>
  );
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function UserAvatar({ user, className }: { user: AppUser; className?: string }) {
  return (
    <span className={`relative flex shrink-0 items-center justify-center overflow-hidden bg-gradient-to-br from-[#2563EB] via-[#22D3EE] to-[#86EFAC] font-black text-white shadow-md ring-2 ring-white ${className ?? ""}`}>
      {user.avatarUrl ? (
        <Image
          src={user.avatarUrl}
          alt={user.name}
          width={96}
          height={96}
          className="h-full w-full object-cover"
        />
      ) : (
        initials(user.name)
      )}
    </span>
  );
}
