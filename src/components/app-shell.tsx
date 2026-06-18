"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Edit3, Menu, UserRound, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { SidebarNav } from "./sidebar-nav";
import { LogoutButton } from "./logout-button";
import type { AppUser } from "@/lib/roles";
import { canManageContent } from "@/lib/roles";
import { roleLabel } from "@/lib/utils";
import { Sparkles, Trophy } from "lucide-react";
import { LeagueBadge } from "@/components/visual/league-badge";

type Props = {
  user: AppUser;
  children: React.ReactNode;
};

export function AppShell({ user, children }: Props) {
  const canManage = canManageContent(user.role);
  const [openMobile, setOpenMobile] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  return (
    <div className="estudaki-platform-shell relative min-h-screen">
      {/* Desktop sidebar */}
      <aside className="fixed left-0 top-0 z-40 hidden h-screen w-[280px] flex-col border-r border-slate-100 bg-white/90 px-4 py-5 shadow-[18px_0_50px_-25px_rgba(15,23,42,0.10)] backdrop-blur-2xl lg:flex">
        <div className="px-2 pb-6">
          <Link href="/dashboard" className="inline-flex items-center">
            <Image
              src="/brand/estudaki-logo.png"
              alt="EstudAki Vestibulares"
              width={176}
              height={56}
              className="h-12 w-auto object-contain drop-shadow-[0_14px_24px_rgba(37,99,235,0.22)]"
              priority
            />
          </Link>
        </div>

        <div className="thin-scrollbar -mx-1 flex-1 overflow-y-auto px-1 pr-2">
          <SidebarNav canManage={canManage} />
        </div>

        <div className="mt-3 rounded-[24px] border border-blue-100/80 bg-white p-3 shadow-sm">
          <Link href="/perfil" className="mb-3 flex items-center gap-3 rounded-2xl p-1 transition hover:bg-blue-50/70">
            <UserAvatar user={user} className="h-11 w-11 rounded-2xl text-sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-extrabold text-[#0F172A]">{user.name}</p>
              <p className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-slate-500">
                <Sparkles className="h-3 w-3 text-orange-500" />
                {roleLabel(user.role)}
              </p>
            </div>
          </Link>
          <div className="mb-2 flex items-center justify-between rounded-2xl bg-gradient-to-br from-[#EFF6FF] to-white px-3 py-2 text-[11px] font-extrabold text-slate-600">
            <span className="flex items-center gap-1.5">
              <Trophy className="h-3.5 w-3.5 text-amber-500" /> Liga
            </span>
            <LeagueBadge league={user.league} size="sm" showLabel={false} />
          </div>
          <Link
            href="/perfil"
            className="mb-2 flex h-10 items-center justify-center rounded-2xl bg-gradient-to-r from-[#2563EB] to-[#22D3EE] text-xs font-black uppercase tracking-wider text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            Perfil
          </Link>
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
          <Link href="/dashboard" className="inline-flex min-w-0 items-center justify-center">
            <Image
              src="/brand/estudaki-logo.png"
              alt="EstudAki Vestibulares"
              width={150}
              height={48}
              className="h-10 w-auto object-contain"
              priority
            />
          </Link>
          <div className="flex items-center gap-2">
            <LeagueBadge league={user.league} size="sm" showLabel={false} />
            <button
              type="button"
              aria-label="Abrir perfil"
              onClick={() => setProfileOpen(true)}
              className="rounded-2xl transition active:scale-95"
            >
              <UserAvatar user={user} className="h-10 w-10 rounded-2xl text-xs" />
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
            className="fixed inset-0 z-[60] lg:hidden"
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
                      <p className="text-[10px] font-black uppercase tracking-wider text-white/78">
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
                <Link
                  href="/perfil"
                  onClick={() => setProfileOpen(false)}
                  className="flex min-h-12 items-center gap-3 rounded-2xl border border-blue-100 bg-blue-50/70 px-4 text-sm font-black text-[#0F172A]"
                >
                  <UserRound className="h-4 w-4 text-blue-700" />
                  Ver perfil
                </Link>
                <Link
                  href="/perfil#foto"
                  onClick={() => setProfileOpen(false)}
                  className="flex min-h-12 items-center gap-3 rounded-2xl border border-slate-100 bg-white px-4 text-sm font-black text-[#0F172A]"
                >
                  <Edit3 className="h-4 w-4 text-cyan-600" />
                  Editar perfil
                </Link>
                <div className="flex min-h-12 items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-white px-4">
                  <span className="flex items-center gap-2 text-sm font-black text-[#0F172A]">
                    <Trophy className="h-4 w-4 text-amber-500" />
                    Liga/XP
                  </span>
                  <span className="text-xs font-black text-blue-700">
                    {user.league} · {user.xp.toLocaleString("pt-BR")} XP
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
                <Link href="/dashboard" className="inline-flex items-center">
                  <Image
                    src="/brand/estudaki-logo.png"
                    alt="EstudAki Vestibulares"
                    width={150}
                    height={48}
                    className="h-10 w-auto object-contain"
                  />
                </Link>
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
                <Link href="/perfil" onClick={() => setOpenMobile(false)} className="mb-2 flex items-center gap-3 rounded-2xl p-1 transition hover:bg-blue-50">
                  <UserAvatar user={user} className="h-10 w-10 rounded-2xl text-sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-extrabold text-[#0F172A]">{user.name}</p>
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                      {roleLabel(user.role)}
                    </p>
                  </div>
                </Link>
                <Link
                  href="/perfil"
                  onClick={() => setOpenMobile(false)}
                  className="mb-2 flex h-10 items-center justify-center rounded-2xl bg-gradient-to-r from-[#2563EB] to-[#22D3EE] text-xs font-black uppercase tracking-wider text-white shadow-sm"
                >
                  Perfil
                </Link>
                <LogoutButton />
              </div>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="min-w-0 overflow-x-hidden lg:ml-[280px]">
        <div className="mx-auto min-h-screen w-full max-w-[1500px] px-3 py-4 sm:px-5 md:px-6 lg:px-8 lg:py-7 xl:px-8">
          {children}
        </div>
      </main>
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
