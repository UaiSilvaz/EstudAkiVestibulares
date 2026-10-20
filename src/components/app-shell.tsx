"use client";

import { ChevronDown, Menu, Moon, PanelLeftClose, PanelLeftOpen, Search, ShoppingCart, Sun, UserRound, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { FastLink } from "./fast-link";
import { StudySessionTimer } from "./study-session-timer";
import { SidebarNav } from "./sidebar-nav";
import { LogoutButton } from "./logout-button";
import { PreparationSwitcher } from "./preparation-switcher";
import { Brand } from "./brand";
import { FeedbackProvider } from "./feedback/feedback-provider";
import type { AppUser } from "@/lib/roles";
import type { ActivePreparationContext } from "@/lib/preparations";
import { getVerticalTheme, normalizeVerticalSlug, verticalThemeStyle } from "@/config/vertical-themes";
import { cn, roleLabel } from "@/lib/utils";

type Props = { user: AppUser; preparationContext: ActivePreparationContext; children: React.ReactNode };
type AppearancePreferences = { colorMode: "system" | "light" | "dark"; backgroundIntensity: "subtle"; iconMood: "line" };
const STORAGE_KEY = "estudaki:appearance";
const defaults: AppearancePreferences = { colorMode: "light", backgroundIntensity: "subtle", iconMood: "line" };
function readAppearance(): AppearancePreferences {
  try {
    const value = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}");
    return { ...defaults, colorMode: ["system", "light", "dark"].includes(value.colorMode) ? value.colorMode : "light" };
  } catch { return defaults; }
}

export function AppShell({ user, preparationContext, children }: Props) {
  const slug = normalizeVerticalSlug(preparationContext.active?.vertical.slug);
  const theme = getVerticalTheme(slug);
  const [appearance, setAppearance] = useState(defaults);
  const [systemDark, setSystemDark] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [openMobile, setOpenMobile] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const profile = useRef<HTMLDivElement>(null);
  const drawer = useRef<HTMLDivElement>(null);
  const mode = appearance.colorMode === "system" ? (systemDark ? "dark" : "light") : appearance.colorMode;

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const sync = () => { setAppearance(readAppearance()); setSystemDark(media.matches); };
    queueMicrotask(sync);
    media.addEventListener("change", sync);
    window.addEventListener("estudaki:appearance-updated", sync);
    return () => { media.removeEventListener("change", sync); window.removeEventListener("estudaki:appearance-updated", sync); };
  }, []);
  useEffect(() => {
    let mounted = true;
    const controller = new AbortController();
    async function refresh() {
      try {
        const response = await fetch("/api/cart", { signal: controller.signal });
        if (response.ok) { const data = await response.json(); if (mounted) setCartCount(data.count ?? 0); }
      } catch { /* Navigation remains available when the cart cannot be loaded. */ }
    }
    void refresh(); window.addEventListener("estudaki:cart-updated", refresh);
    return () => { mounted = false; controller.abort(); window.removeEventListener("estudaki:cart-updated", refresh); };
  }, []);
  useEffect(() => {
    if (!profileOpen) return;
    const close = (event: PointerEvent) => { if (!profile.current?.contains(event.target as Node)) setProfileOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") { setProfileOpen(false); profile.current?.querySelector("button")?.focus(); } };
    document.addEventListener("pointerdown", close); document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", close); document.removeEventListener("keydown", escape); };
  }, [profileOpen]);
  useEffect(() => {
    if (!openMobile) return;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow; document.body.style.overflow = "hidden";
    drawer.current?.querySelector<HTMLButtonElement>("button[aria-label='Fechar menu']")?.focus();
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenMobile(false);
      if (event.key !== "Tab") return;
      const nodes = [...(drawer.current?.querySelectorAll<HTMLElement>("a[href],button:not([disabled]),input,select,[tabindex='0']") ?? [])].filter(node => node.getClientRects().length);
      const first = nodes[0], last = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener("keydown", keyboard);
    return () => { document.body.style.overflow = overflow; document.removeEventListener("keydown", keyboard); previous?.focus(); };
  }, [openMobile]);
  function toggleMode() {
    const next: AppearancePreferences = { ...defaults, colorMode: mode === "dark" ? "light" : "dark" };
    setAppearance(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      window.dispatchEvent(new CustomEvent("estudaki:appearance-updated"));
    }
    catch { /* The selected mode remains available in this session. */ }
  }
  const modeToggle = <button type="button" onClick={toggleMode} className="theme-mode-toggle product-icon-button" aria-label={mode === "dark" ? "Trocar para tema claro" : "Trocar para tema escuro"}>{mode === "dark" ? <Sun /> : <Moon />}</button>;

  return <div className="estudaki-platform-shell professional-platform min-h-screen" style={verticalThemeStyle(slug, mode)} data-vertical={slug} data-theme-mode={mode} data-icon-mood="line" data-background-intensity="subtle">
    <aside className={cn("product-sidebar fixed left-0 top-0 z-40 hidden h-screen flex-col transition-[width] duration-200 lg:flex", sidebarCollapsed ? "px-3 py-5" : "px-4 py-7")} style={{ width: sidebarCollapsed ? 80 : 252 }}>
      <div className={cn("mb-8 flex", sidebarCollapsed ? "flex-col items-center gap-4" : "items-center justify-between gap-2")}>
        <Brand href="/dashboard" light compact={sidebarCollapsed} subtitle={theme.shortName} className="estudaki-brand--sm" />
        <button type="button" className="sidebar-collapse grid h-8 w-8 shrink-0 place-items-center rounded-lg" aria-expanded={!sidebarCollapsed} aria-label={sidebarCollapsed ? "Expandir sidebar" : "Recolher sidebar"} onClick={() => setSidebarCollapsed(!sidebarCollapsed)}>{sidebarCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}</button>
      </div>
      <div className="min-h-0 flex-1"><SidebarNav role={user.role} verticalSlug={slug} collapsed={sidebarCollapsed} onRequestExpand={() => setSidebarCollapsed(false)} /></div>
      {!sidebarCollapsed && <div className="sidebar-footnote">Norte Preparatórios<span>Um próximo passo. Todos os dias.</span></div>}
    </aside>
    <header className={cn("product-topbar sticky top-0 z-30 hidden border-b border-[color:var(--theme-border)] lg:flex", sidebarCollapsed ? "lg:ml-[80px]" : "lg:ml-[252px]")}>
      <div className="mx-auto flex w-full max-w-[1440px] items-center gap-6 px-8">
        <PreparationSwitcher active={preparationContext.active} preparations={preparationContext.preparations} />
        <form action="/questions" method="get" className="product-search" role="search"><Search aria-hidden="true" /><input name="q" type="search" aria-label="Buscar questões por assunto" placeholder="Buscar questões por assunto" /></form>
        <div className="ml-auto flex items-center gap-2"><StudySessionTimer />{modeToggle}<FastLink href="/carrinho" className="top-cart-button product-icon-button relative" aria-label={cartCount ? `Abrir carrinho, ${cartCount} itens` : "Abrir carrinho"}><ShoppingCart />{cartCount > 0 && <span className="product-cart-count">{cartCount}</span>}</FastLink>
          <div ref={profile} className="relative">
            <button type="button" aria-expanded={profileOpen} aria-controls="product-profile-menu" aria-label="Abrir menu do perfil" onClick={() => setProfileOpen(!profileOpen)} className="top-profile-button flex h-11 items-center gap-3 border border-[color:var(--theme-border)] pl-1.5 pr-3"><UserAvatar user={user} /><span className="hidden max-w-28 truncate text-xs font-semibold xl:block">{user.name.split(" ")[0]}</span><ChevronDown className="h-3.5 w-3.5 text-[color:var(--theme-muted)]" /></button>
            {profileOpen && <div id="product-profile-menu" className="product-profile-menu"><strong>{user.name}</strong><p>{roleLabel(user.role)}</p><FastLink href="/perfil" onClick={() => setProfileOpen(false)}><UserRound className="h-4 w-4" />Meu perfil</FastLink><FastLink href="/perfil#aparencia" onClick={() => setProfileOpen(false)}><Moon className="h-4 w-4" />Aparência</FastLink><LogoutButton /></div>}
          </div>
        </div>
      </div>
    </header>
    <header className="sticky top-0 z-30 border-b border-[color:var(--theme-border)] bg-[color:var(--theme-surface)] lg:hidden"><div className="flex items-center gap-2 px-3 py-3"><button type="button" className="product-icon-button" aria-label="Abrir menu" aria-expanded={openMobile} aria-controls="product-mobile-drawer" onClick={() => setOpenMobile(true)}><Menu /></button><div className="min-w-0 flex-1"><PreparationSwitcher active={preparationContext.active} preparations={preparationContext.preparations} compact /></div><StudySessionTimer />{modeToggle}<FastLink href="/perfil" aria-label="Abrir perfil"><UserAvatar user={user} /></FastLink></div></header>
    {openMobile && <div className="fixed inset-0 z-[80] lg:hidden"><button type="button" className="absolute inset-0 bg-slate-950/55" aria-label="Fechar menu" onClick={() => setOpenMobile(false)} /><div ref={drawer} id="product-mobile-drawer" role="dialog" aria-modal="true" aria-label="Navegação da plataforma" className="product-sidebar absolute inset-y-0 left-0 flex w-[88%] max-w-[320px] flex-col p-5"><div className="mb-6 flex items-center justify-between"><Brand href="/dashboard" light subtitle={theme.shortName} /><button type="button" aria-label="Fechar menu" className="sidebar-collapse grid h-10 w-10 place-items-center rounded-lg" onClick={() => setOpenMobile(false)}><X className="h-5 w-5" /></button></div><div className="min-h-0 flex-1"><SidebarNav role={user.role} verticalSlug={slug} onNavigate={() => setOpenMobile(false)} /></div><FastLink href="/perfil" className="mt-4 flex items-center gap-3 border-t border-white/15 pt-4 text-sm text-white" onClick={() => setOpenMobile(false)}><UserRound className="h-4 w-4" />Meu perfil</FastLink></div></div>}
    <FeedbackProvider><main className={cn("min-w-0", sidebarCollapsed ? "lg:ml-[80px]" : "lg:ml-[252px]")}><div className="product-content min-h-screen">{children}</div></main></FeedbackProvider>
  </div>;
}

function UserAvatar({ user }: { user: AppUser }) {
  const initials = user.name.split(" ").filter(Boolean).slice(0, 2).map(part => part[0]).join("").toUpperCase();
  return <span className="user-avatar relative grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-xl text-xs font-semibold">{user.avatarUrl ? <Image src={user.avatarUrl} alt={user.name} width={72} height={72} className="h-full w-full object-cover" /> : initials}</span>;
}
