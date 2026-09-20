"use client";

import { ChevronDown, Edit3, Menu, Moon, PanelLeftClose, PanelLeftOpen, ShoppingCart, Sun, Trophy, UserRound, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { FastLink } from "./fast-link";
import { SidebarNav } from "./sidebar-nav";
import { LogoutButton } from "./logout-button";
import { PreparationSwitcher } from "./preparation-switcher";
import type { AppUser } from "@/lib/roles";
import type { ActivePreparationContext } from "@/lib/preparations";
import { getVerticalTheme, normalizeVerticalSlug } from "@/config/vertical-themes";
import { canManageContent } from "@/lib/roles";
import { cn, leagueForXp, roleLabel } from "@/lib/utils";
import { LeagueBadge } from "@/components/visual/league-badge";
import { FeedbackProvider } from "@/components/feedback/feedback-provider";

type Props = {
  user: AppUser;
  preparationContext: ActivePreparationContext;
  children: React.ReactNode;
};

type AppearancePreferences = {
  colorMode: "system" | "light" | "dark";
  backgroundIntensity: "subtle" | "balanced" | "immersive";
  iconMood: "colorful" | "line" | "minimal";
};

type CSSVariableStyle = React.CSSProperties & Record<`--${string}`, string>;

const APPEARANCE_STORAGE_KEY = "estudaki:appearance";

const defaultAppearance: AppearancePreferences = {
  colorMode: "system",
  backgroundIntensity: "balanced",
  iconMood: "colorful",
};

function parseAppearance(value: string | null): AppearancePreferences {
  if (!value) return defaultAppearance;

  try {
    const parsed = JSON.parse(value) as Partial<AppearancePreferences>;
    return {
      colorMode: parsed.colorMode === "light" || parsed.colorMode === "dark" || parsed.colorMode === "system" ? parsed.colorMode : defaultAppearance.colorMode,
      backgroundIntensity: parsed.backgroundIntensity === "subtle" || parsed.backgroundIntensity === "immersive" || parsed.backgroundIntensity === "balanced" ? parsed.backgroundIntensity : defaultAppearance.backgroundIntensity,
      iconMood: parsed.iconMood === "line" || parsed.iconMood === "minimal" || parsed.iconMood === "colorful" ? parsed.iconMood : defaultAppearance.iconMood,
    };
  } catch {
    return defaultAppearance;
  }
}

function prefersDarkMode() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function backgroundOpacity(
  intensity: AppearancePreferences["backgroundIntensity"],
  defaultOpacity: string,
) {
  if (intensity === "subtle") return "0.08";
  if (intensity === "immersive") return "0.30";
  return defaultOpacity;
}

function saveAppearance(next: AppearancePreferences) {
  window.localStorage.setItem(APPEARANCE_STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent("estudaki:appearance-updated"));
}

export function AppShell({ user, preparationContext, children }: Props) {
  const canManage = canManageContent(user.role);
  const currentLeague = leagueForXp(user.xp);
  const activeVerticalSlug = normalizeVerticalSlug(preparationContext.active?.vertical.slug);
  const activeTheme = getVerticalTheme(activeVerticalSlug);
  const [appearance, setAppearance] = useState<AppearancePreferences>(defaultAppearance);
  const [systemDark, setSystemDark] = useState(false);
  const [openMobile, setOpenMobile] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
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

  useEffect(() => {
    queueMicrotask(() => {
      setAppearance(parseAppearance(window.localStorage.getItem(APPEARANCE_STORAGE_KEY)));
      setSystemDark(prefersDarkMode());
    });

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const syncSystemMode = () => setSystemDark(media.matches);
    const syncAppearance = () => setAppearance(parseAppearance(window.localStorage.getItem(APPEARANCE_STORAGE_KEY)));

    media.addEventListener("change", syncSystemMode);
    window.addEventListener("estudaki:appearance-updated", syncAppearance);
    return () => {
      media.removeEventListener("change", syncSystemMode);
      window.removeEventListener("estudaki:appearance-updated", syncAppearance);
    };
  }, []);

  const resolvedMode = appearance.colorMode === "system" ? (systemDark ? "dark" : "light") : appearance.colorMode;
  const darkThemeStyle: CSSVariableStyle =
    activeVerticalSlug === "oab"
      ? {
          "--background": "#07080C",
          "--foreground": "#F9FAFB",
          "--theme-background": "#07080C",
          "--theme-surface": "#101116",
          "--theme-surface-alt": "#1A0D13",
          "--theme-text": "#F9FAFB",
          "--theme-muted": "rgba(226,232,240,0.76)",
          "--theme-border": "rgba(225,29,72,0.26)",
          "--theme-gradient-hero": "linear-gradient(135deg, #17191F 0%, #270B14 52%, #07080C 100%)",
          "--theme-gradient-card": "linear-gradient(135deg, #111217 0%, #1A0D13 54%, #07080C 100%)",
          "--theme-gradient-sidebar": "linear-gradient(135deg, #07080C 0%, #270B14 44%, #C91835 100%)",
          "--theme-gradient-stat": "linear-gradient(135deg, #1A1C22 0%, #690D1E 58%, #C91835 100%)",
          "--theme-shadow": "0 28px 64px -34px rgba(0,0,0,0.86)",
        }
      : {
          "--background": `color-mix(in srgb, ${activeTheme.colors.primaryDark} 84%, #05070A)`,
          "--foreground": "#F8FAFC",
          "--theme-background": `color-mix(in srgb, ${activeTheme.colors.primaryDark} 86%, #05070A)`,
          "--theme-surface": `color-mix(in srgb, ${activeTheme.colors.primaryDark} 74%, #111827)`,
          "--theme-surface-alt": `color-mix(in srgb, ${activeTheme.colors.secondary} 42%, #111827)`,
          "--theme-text": "#F8FAFC",
          "--theme-muted": "rgba(226,232,240,0.72)",
          "--theme-border": `color-mix(in srgb, ${activeTheme.colors.secondary} 34%, rgba(226,232,240,0.18))`,
          "--theme-gradient-hero": "var(--theme-gradient-hero-dark)",
          "--theme-gradient-card": "var(--theme-gradient-card-dark)",
          "--theme-shadow": "0 26px 56px -34px rgba(0,0,0,0.72)",
        };
  const appearanceStyle: CSSVariableStyle = {
    ...(resolvedMode === "dark" ? darkThemeStyle : {}),
    "--theme-background-opacity": backgroundOpacity(
      appearance.backgroundIntensity,
      activeTheme.imagery.backgroundOpacity,
    ),
  };

  function toggleThemeMode() {
    const colorMode: AppearancePreferences["colorMode"] = resolvedMode === "dark" ? "light" : "dark";
    const next: AppearancePreferences = { ...appearance, colorMode };
    setAppearance(next);
    saveAppearance(next);
  }

  return (
    <div
      className="estudaki-platform-shell relative min-h-screen"
      style={{ ...preparationContext.themeStyle, ...appearanceStyle }}
      data-vertical={activeVerticalSlug}
      data-gamification={activeTheme.ui.gamificationIntensity}
      data-theme-mode={resolvedMode}
      data-background-intensity={appearance.backgroundIntensity}
      data-icon-mood={appearance.iconMood}
    >
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 hidden h-screen flex-col border-r border-[color:var(--theme-border)] bg-[color:var(--theme-surface)]/95 py-4 shadow-[22px_0_58px_-36px_rgba(15,23,42,0.24)] backdrop-blur-xl transition-[width] duration-150 ease-out lg:flex",
          sidebarCollapsed ? "overflow-visible px-3" : "px-4",
        )}
        style={{ width: sidebarCollapsed ? 92 : 252 }}
      >
        <div
          className={cn(
            "mb-4 flex shrink-0",
            sidebarCollapsed ? "flex-col items-center gap-2" : "items-center justify-between gap-2 px-1",
          )}
        >
          <FastLink
            href="/dashboard"
            aria-label={`EstudAki ${activeTheme.shortName}`}
            className={cn(
              "group flex min-w-0 items-center rounded-[18px] transition hover:bg-[color:color-mix(in_srgb,var(--theme-primary)_8%,var(--theme-surface))]",
              sidebarCollapsed ? "h-[52px] w-[52px] justify-center" : "gap-3 px-1.5 py-1",
            )}
          >
            <span
              className={cn(
                "flex shrink-0 items-center justify-center rounded-[16px] font-black text-white shadow-[0_14px_30px_-18px_var(--theme-primary)] ring-1 ring-white/50",
                sidebarCollapsed ? "h-12 w-12 text-lg" : "h-10 w-10 text-base",
              )}
              style={{ background: "var(--theme-gradient-sidebar)" }}
            >
              &amp;
            </span>
            {!sidebarCollapsed && (
              <span className="min-w-0 leading-none animate-[estudaki-fast-fade_120ms_ease-out]">
                <span className="block truncate font-display text-xl font-extrabold text-[color:var(--theme-text)]">
                  EstudAki
                </span>
                <span className="mt-1 block text-[9px] font-black uppercase text-[color:var(--theme-muted)]">
                  {activeTheme.shortName}
                </span>
              </span>
            )}
          </FastLink>

          <button
            type="button"
            aria-label={sidebarCollapsed ? "Expandir sidebar" : "Recolher sidebar"}
            title={sidebarCollapsed ? "Expandir sidebar" : "Recolher sidebar"}
            onClick={() => setSidebarCollapsed((current) => !current)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] border border-[color:var(--theme-border)] bg-[color:var(--theme-surface)] text-[color:var(--theme-primary)] shadow-sm transition hover:bg-[color:color-mix(in_srgb,var(--theme-primary)_8%,var(--theme-surface))] active:scale-95"
          >
            {sidebarCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
        </div>

        <div className={cn("min-h-0 flex-1", sidebarCollapsed ? "overflow-visible" : "overflow-hidden")}>
          <SidebarNav
            canManage={canManage}
            verticalSlug={activeVerticalSlug}
            collapsed={sidebarCollapsed}
            onRequestExpand={() => setSidebarCollapsed(false)}
          />
        </div>
      </aside>

      {/* Desktop top bar */}
      <header
        className={cn(
          "sticky top-0 z-30 hidden h-[76px] border-b border-[color:var(--theme-border)] bg-[color:var(--theme-surface)]/92 shadow-[0_12px_32px_-28px_rgba(15,23,42,0.28)] backdrop-blur-xl transition-[margin-left] duration-150 ease-out lg:flex",
          sidebarCollapsed ? "lg:ml-[92px]" : "lg:ml-[252px]",
        )}
      >
        <div className="mx-auto flex w-full max-w-[1500px] items-center justify-between gap-4 px-8">
          <PreparationSwitcher
            active={preparationContext.active}
            preparations={preparationContext.preparations}
          />
          <nav className="flex items-center gap-2" aria-label="Conta e compras">
            <FastLink
              href="/perfil#ligas"
              title="Abrir painel de ligas"
              aria-label={`Abrir painel de ligas. Liga atual: ${currentLeague}`}
              className="top-league-card flex h-11 items-center gap-2 rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50 to-white px-2.5 shadow-sm transition hover:-translate-y-0.5 hover:border-amber-200 hover:shadow-md"
            >
              <LeagueBadge league={currentLeague} size="sm" showLabel={false} />
              <span className="hidden pr-1 text-xs font-black text-[color:var(--theme-text)] xl:inline">
                Liga {currentLeague}
              </span>
            </FastLink>
            <button
              type="button"
              onClick={toggleThemeMode}
              aria-label={resolvedMode === "dark" ? "Trocar para tema claro" : "Trocar para tema escuro"}
              title={resolvedMode === "dark" ? "Tema claro" : "Tema escuro"}
              className="theme-mode-toggle flex h-11 w-11 items-center justify-center rounded-2xl border border-[color:var(--theme-border)] bg-[color:var(--theme-surface)] text-[color:var(--theme-primary)] shadow-sm transition hover:-translate-y-0.5 hover:border-[color:var(--theme-primary)] hover:bg-[color:color-mix(in_srgb,var(--theme-primary)_9%,var(--theme-surface))]"
            >
              {resolvedMode === "dark" ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
            </button>
            <FastLink
              href="/carrinho"
              title="Abrir carrinho"
              aria-label="Abrir carrinho"
              className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-[color:var(--theme-border)] bg-[color:color-mix(in_srgb,var(--theme-primary)_8%,white)] text-[color:var(--theme-primary)] shadow-sm transition hover:-translate-y-0.5 hover:bg-[color:color-mix(in_srgb,var(--theme-primary)_14%,white)]"
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
                className="flex h-11 items-center gap-2 rounded-2xl border border-[color:var(--theme-border)] bg-[color:var(--theme-surface)] pl-1.5 pr-3 shadow-sm transition hover:border-[color:var(--theme-primary)] hover:shadow-md"
              >
                <UserAvatar user={user} className="h-8 w-8 rounded-xl text-[10px]" />
                <span className="hidden max-w-32 truncate text-xs font-black text-[color:var(--theme-text)] xl:block">
                  {user.name.split(" ")[0]}
                </span>
                <ChevronDown className={`h-3.5 w-3.5 text-[color:var(--theme-muted)] transition ${desktopProfileOpen ? "rotate-180" : ""}`} />
              </button>
              {desktopProfileOpen && (
                  <div className="absolute right-0 top-[calc(100%+10px)] w-72 overflow-hidden rounded-[24px] border border-[color:var(--theme-border)] bg-[color:var(--theme-surface)] p-2 shadow-[0_24px_60px_-24px_rgba(15,23,42,0.38)] animate-[estudaki-fast-pop_120ms_ease-out]">
                    <div className="flex items-center gap-3 rounded-[18px] bg-[color:var(--theme-surface-alt)] p-3">
                      <UserAvatar user={user} className="h-11 w-11 rounded-2xl text-xs" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-[color:var(--theme-text)]">{user.name}</p>
                        <p className="mt-0.5 text-[10px] font-black uppercase text-blue-700">
                          {user.xp.toLocaleString("pt-BR")} XP
                        </p>
                      </div>
                    </div>
                    <FastLink onClick={() => setDesktopProfileOpen(false)} href="/perfil" className="mt-1 flex min-h-11 items-center gap-3 rounded-2xl px-3 text-sm font-black text-[color:var(--theme-muted)] transition hover:bg-[color:color-mix(in_srgb,var(--theme-primary)_10%,transparent)] hover:text-[color:var(--theme-primary)]">
                      <UserRound className="h-4 w-4" /> Meu perfil
                    </FastLink>
                    <FastLink onClick={() => setDesktopProfileOpen(false)} href="/perfil#ligas" className="flex min-h-11 items-center gap-3 rounded-2xl px-3 text-sm font-black text-[color:var(--theme-muted)] transition hover:bg-[color:color-mix(in_srgb,var(--theme-accent)_13%,transparent)] hover:text-[color:var(--theme-accent)]">
                      <Trophy className="h-4 w-4 text-amber-500" />
                      <span className="min-w-0 flex-1">Liga atual</span>
                      <span className="text-xs text-blue-700">{currentLeague}</span>
                    </FastLink>
                    <div className="mt-1 border-t border-[color:var(--theme-border)] pt-2">
                      <LogoutButton />
                    </div>
                  </div>
                )}
            </div>
          </nav>
        </div>
      </header>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 border-b border-[color:var(--theme-border)] bg-[color:var(--theme-surface)]/90 backdrop-blur-xl lg:hidden">
        <div className="grid grid-cols-[44px_1fr_auto] items-center gap-2 px-3 py-2.5">
          <button
            type="button"
            aria-label="Abrir menu"
            onClick={() => setOpenMobile(true)}
            className="flex h-11 w-11 items-center justify-center rounded-2xl border-2 border-[color:var(--theme-border)] bg-[color:var(--theme-surface)] text-[color:var(--theme-primary)] shadow-[0_9px_22px_-10px_var(--theme-primary)] ring-1 ring-[color:color-mix(in_srgb,var(--theme-primary)_10%,white)] transition active:scale-95"
          >
            <Menu className="h-5 w-5" strokeWidth={2.5} />
          </button>
          <PreparationSwitcher
            active={preparationContext.active}
            preparations={preparationContext.preparations}
            compact
          />
          <div className="flex items-center justify-end gap-1.5">
            <button
              type="button"
              onClick={toggleThemeMode}
              aria-label={resolvedMode === "dark" ? "Trocar para tema claro" : "Trocar para tema escuro"}
              className="theme-mode-toggle flex h-11 w-11 items-center justify-center rounded-2xl border border-[color:var(--theme-border)] bg-[color:var(--theme-surface)] text-[color:var(--theme-primary)] shadow-sm transition active:scale-95"
            >
              {resolvedMode === "dark" ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
            </button>
            <FastLink
              href="/carrinho"
              title="Abrir carrinho"
              aria-label="Abrir carrinho"
              className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-[color:var(--theme-border)] bg-[color:color-mix(in_srgb,var(--theme-primary)_8%,white)] text-[color:var(--theme-primary)] shadow-sm transition active:scale-95"
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

      {profileOpen && (
          <div className="fixed inset-0 z-[80] animate-[estudaki-fast-fade_100ms_ease-out] lg:hidden">
            <button
              type="button"
              aria-label="Fechar perfil"
              onClick={() => setProfileOpen(false)}
              className="absolute inset-0 bg-slate-950/35 backdrop-blur-sm"
            />
            <aside className="absolute inset-x-3 top-20 overflow-hidden rounded-[30px] border border-[color:var(--theme-border)] bg-[color:var(--theme-surface)] shadow-2xl will-change-transform animate-[estudaki-fast-sheet_140ms_ease-out]">
              <div className="relative overflow-hidden p-5 text-white" style={{ background: "var(--theme-gradient-sidebar)" }}>
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
                  className="flex min-h-12 items-center gap-3 rounded-2xl border border-[color:var(--theme-border)] bg-[color:color-mix(in_srgb,var(--theme-primary)_10%,var(--theme-surface))] px-4 text-sm font-black text-[color:var(--theme-text)]"
                >
                  <UserRound className="h-4 w-4 text-blue-700" />
                  Ver perfil
                </FastLink>
                <FastLink
                  href="/perfil#foto"
                  onClick={() => setProfileOpen(false)}
                  className="flex min-h-12 items-center gap-3 rounded-2xl border border-[color:var(--theme-border)] bg-[color:var(--theme-surface-alt)] px-4 text-sm font-black text-[color:var(--theme-text)]"
                >
                  <Edit3 className="h-4 w-4 text-cyan-600" />
                  Editar perfil
                </FastLink>
                <FastLink
                  href="/perfil#ligas"
                  onClick={() => setProfileOpen(false)}
                  className="flex min-h-12 items-center justify-between gap-3 rounded-2xl border border-[color:var(--theme-border)] bg-[color:var(--theme-surface-alt)] px-4"
                >
                  <span className="flex items-center gap-2 text-sm font-black text-[color:var(--theme-text)]">
                    <Trophy className="h-4 w-4 text-amber-500" />
                    Liga/XP
                  </span>
                  <span className="text-xs font-black text-blue-700">
                    {currentLeague} · {user.xp.toLocaleString("pt-BR")} XP
                  </span>
                </FastLink>
                <LogoutButton />
              </div>
            </aside>
          </div>
        )}

      {/* Mobile drawer */}
      {openMobile && (
          <div className="fixed inset-0 z-[80] animate-[estudaki-fast-fade_100ms_ease-out] lg:hidden">
            <button
              type="button"
              aria-label="Fechar menu"
              onClick={() => setOpenMobile(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-md"
            />
            <aside className="absolute left-0 top-0 flex h-full w-[88%] max-w-sm flex-col overflow-hidden bg-[color:var(--theme-surface)] p-5 shadow-2xl will-change-transform animate-[estudaki-fast-drawer_140ms_ease-out]">
              <div className="mb-5 flex items-center justify-between">
                <FastLink href="/dashboard" onClick={() => setOpenMobile(false)} className="inline-flex items-center gap-3 rounded-[14px] px-1.5 py-1">
                  <span
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] text-base font-black text-white shadow-[0_12px_28px_-16px_var(--theme-primary)] ring-1 ring-white/50"
                    style={{ background: "var(--theme-gradient-sidebar)" }}
                  >
                    &amp;
                  </span>
                  <span className="leading-none">
                    <span className="block font-display text-xl font-extrabold text-[color:var(--theme-text)]">EstudAki</span>
                    <span className="mt-1 block text-[9px] font-black uppercase text-[color:var(--theme-muted)]">
                      {activeTheme.shortName}
                    </span>
                  </span>
                </FastLink>
                <button
                  type="button"
                  aria-label="Fechar"
                  onClick={() => setOpenMobile(false)}
                  className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[color:var(--theme-border)] bg-[color:var(--theme-surface)] text-[color:var(--theme-muted)]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="min-h-0 flex-1">
                <SidebarNav canManage={canManage} verticalSlug={activeVerticalSlug} onNavigate={() => setOpenMobile(false)} />
              </div>
            </aside>
          </div>
        )}

      <FeedbackProvider>
        <main
          className={cn(
            "min-w-0 overflow-x-hidden transition-[margin-left] duration-150 ease-out",
            sidebarCollapsed ? "lg:ml-[92px]" : "lg:ml-[252px]",
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
