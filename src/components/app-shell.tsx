"use client";

import { ArrowUpRight, BookOpen, CalendarDays, ChartNoAxesCombined, ChevronDown, ClipboardList, GraduationCap, House, Library, Menu, Moon, Search, Settings, ShieldCheck, ShoppingCart, Sun, Target, Users, X } from "lucide-react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { FastLink } from "./fast-link";
import { LogoutButton } from "./logout-button";
import { PreparationSwitcher } from "./preparation-switcher";
import { SilvaBrand } from "./silva-brand";
import { FeedbackProvider } from "./feedback/feedback-provider";
import { TrackProvider, useTrack } from "@/providers/track-provider";
import { trackForPreparation, trackStyle } from "@/config/tracks";
import { canManageContent, type AppUser } from "@/lib/roles";
import type { ActivePreparationContext } from "@/lib/preparations";

type Props = { user: AppUser; preparationContext: ActivePreparationContext; children: React.ReactNode };
const navigation = [
  { group: "PRINCIPAL", label: "Início", href: "/dashboard", icon: House, routes: ["/dashboard"] },
  { group: "", label: "Meu plano", href: "/cronograma", icon: CalendarDays, routes: ["/cronograma", "/meu-plano", "/diagnostico", "/onboarding"] },
  { group: "ESTUDOS", label: "Estudar", href: "/estudar", icon: BookOpen, routes: ["/estudar", "/cursos", "/aula", "/aulas", "/trilhas"] },
  { group: "", label: "Praticar", href: "/praticar", icon: Target, routes: ["/praticar", "/questions", "/flashcards", "/caderno-de-erros", "/redacao", "/revisoes"] },
  { group: "", label: "Simulados", href: "/simulados", icon: ClipboardList, routes: ["/simulados", "/provas-antigas"] },
  { group: "EVOLUÇÃO", label: "Desempenho", href: "/performance", icon: ChartNoAxesCombined, routes: ["/performance", "/radar", "/conquistas", "/ranking"] },
  { group: "RECURSOS", label: "Biblioteca", href: "/biblioteca", icon: Library, routes: ["/biblioteca", "/materials", "/favoritos"] },
  { group: "", label: "Comunidade", href: "/community", icon: Users, routes: ["/community", "/comunidade", "/salas"] },
];
const searchable = [...navigation,
  { label: "Questões", href: "/questions", icon: Target }, { label: "Flashcards", href: "/flashcards", icon: BookOpen },
  { label: "Cursos e aulas", href: "/cursos", icon: GraduationCap }, { label: "Materiais", href: "/materials", icon: Library },
  { label: "Caderno de erros", href: "/caderno-de-erros", icon: ClipboardList }, { label: "Redação", href: "/redacao", icon: BookOpen },
];
function normalized(value: string) { return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase(); }

export function AppShell(props: Props) {
  return <TrackProvider key={props.preparationContext.active?.id ?? "default"} initialTrack={trackForPreparation(props.preparationContext.active)}><SilvaShell {...props} /></TrackProvider>;
}

function SilvaShell({ user, preparationContext, children }: Props) {
  const pathname = usePathname();
  const { track } = useTrack();
  const [dark, setDark] = useState(false);
  const [openMobile, setOpenMobile] = useState(false);
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const drawerRef = useRef<HTMLElement>(null);
  const menuRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault(); searchInputRef.current?.focus(); setSearchOpen(true);
      }
    };
    document.addEventListener("keydown", shortcut);
    return () => document.removeEventListener("keydown", shortcut);
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const sync = () => {
      try {
        const settings = JSON.parse(localStorage.getItem("estudaki:appearance") || "{}");
        setDark(settings.colorMode === "dark" || (settings.colorMode !== "light" && media.matches));
      } catch { setDark(media.matches); }
    };
    const click = (event: PointerEvent) => { if (!searchRef.current?.contains(event.target as Node)) setSearchOpen(false); };
    queueMicrotask(sync);
    media.addEventListener("change", sync);
    window.addEventListener("estudaki:appearance-updated", sync);
    document.addEventListener("pointerdown", click);
    return () => { media.removeEventListener("change", sync); window.removeEventListener("estudaki:appearance-updated", sync); document.removeEventListener("pointerdown", click); };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const refresh = async () => {
      try {
        const response = await fetch("/api/cart", { signal: controller.signal });
        if (response.ok) { const data = await response.json(); setCartCount(data.count ?? 0); }
      } catch { /* Cart remains accessible when the count cannot be fetched. */ }
    };
    void refresh(); window.addEventListener("estudaki:cart-updated", refresh);
    return () => { controller.abort(); window.removeEventListener("estudaki:cart-updated", refresh); };
  }, []);

  useEffect(() => {
    if (!openMobile) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusable = () => Array.from(drawerRef.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input') ?? []);
    focusable()[0]?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenMobile(false);
      if (event.key !== "Tab") return;
      const elements = focusable(); const first = elements[0]; const last = elements.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    const desktop = window.matchMedia("(min-width: 1024px)");
    const closeOnDesktop = () => { if (desktop.matches) setOpenMobile(false); };
    desktop.addEventListener("change", closeOnDesktop);
    document.addEventListener("keydown", keydown);
    const menuButton = menuRef.current;
    return () => { document.body.style.overflow = previousOverflow; document.removeEventListener("keydown", keydown); desktop.removeEventListener("change", closeOnDesktop); menuButton?.focus(); };
  }, [openMobile]);

  function toggleDark() {
    const next = !dark;
    setDark(next);
    try {
      const existing = JSON.parse(localStorage.getItem("estudaki:appearance") || "{}");
      localStorage.setItem("estudaki:appearance", JSON.stringify({ ...existing, colorMode: next ? "dark" : "light" }));
      window.dispatchEvent(new CustomEvent("estudaki:appearance-updated"));
    } catch { /* The current session can still switch themes. */ }
  }
  const results = searchable.filter((item) => normalized(item.label).includes(normalized(query)));

  return <div className="estudaki-platform-shell silva-platform" style={{ ...preparationContext.themeStyle, ...trackStyle(track, dark) }} data-track={track} data-vertical={preparationContext.active?.vertical.slug ?? "vestibular"} data-theme-mode={dark ? "dark" : "light"} data-icon-mood="line" data-background-intensity="subtle">
    {openMobile && <button className="silva-backdrop" tabIndex={-1} aria-label="Fechar menu" onClick={() => setOpenMobile(false)} />}
    <aside ref={drawerRef} className="silva-sidebar" data-open={openMobile} aria-label="Menu principal" role={openMobile ? "dialog" : undefined} aria-modal={openMobile || undefined}>
      <div className="silva-sidebar-brand"><FastLink href="/dashboard" onClick={() => setOpenMobile(false)}><SilvaBrand compact /></FastLink><button className="silva-mobile-menu silva-icon-button" aria-label="Fechar menu" onClick={() => setOpenMobile(false)}><X size={18} /></button></div>
      <nav aria-label="Estudos">
        {navigation.map(({ group, label, href, icon: Icon, routes }) => <div key={href}>
          {group && <p className="silva-nav-label">{group}</p>}
          <FastLink href={href} onClick={() => setOpenMobile(false)} className="silva-nav-item" aria-label={label} title={label} aria-current={routes.some((route) => pathname === route || pathname.startsWith(route + "/")) ? "page" : undefined}><Icon /><span>{label}</span></FastLink>
        </div>)}
        {canManageContent(user.role) && <FastLink href="/admin" aria-label="Administração" title="Administração" className="silva-nav-item" onClick={() => setOpenMobile(false)} aria-current={pathname.startsWith("/admin") ? "page" : undefined}><ShieldCheck /><span>Administração</span></FastLink>}
      </nav>
      <div className="silva-sidebar-footer"><FastLink href="/perfil" aria-label="Configurações" title="Configurações" className="silva-nav-item" onClick={() => setOpenMobile(false)} aria-current={pathname === "/perfil" ? "page" : undefined}><Settings /><span>Configurações</span></FastLink><LogoutButton compact /></div>
    </aside>
    <header className="silva-topbar" inert={openMobile}>
      <button ref={menuRef} className="silva-mobile-menu silva-icon-button" aria-label="Abrir menu" aria-expanded={openMobile} onClick={() => setOpenMobile(true)}><Menu size={20} /></button>
      <FastLink href="/dashboard" className="silva-topbar-brand"><SilvaBrand /></FastLink>
      <PreparationSwitcher active={preparationContext.active} preparations={preparationContext.preparations} />
      <div ref={searchRef} className="silva-search">
        <label className="silva-search-field"><Search size={18} /><input ref={searchInputRef} aria-label="Buscar áreas de estudo" aria-controls="silva-search-results" placeholder="Buscar áreas de estudo..." value={query} onChange={(event) => { setQuery(event.target.value); setSearchOpen(true); }} onFocus={() => setSearchOpen(true)} onKeyDown={(event) => { if (event.key === "Escape") setSearchOpen(false); }} /><kbd>Ctrl K</kbd></label>
        {searchOpen && <div id="silva-search-results" className="silva-popover" onKeyDown={(event) => { if (event.key === "Escape") { setSearchOpen(false); searchInputRef.current?.focus(); } }}><p className="silva-eyebrow px-3 py-2">Acesso rápido</p>{results.length ? results.map(({ label, href, icon: Icon }) => <FastLink key={href} href={href} className="silva-nav-item" onClick={() => { setSearchOpen(false); setQuery(""); }}><Icon />{label}<ArrowUpRight size={14} className="ml-auto" /></FastLink>) : <p className="p-3 text-sm silva-muted">Nenhuma área encontrada. Tente cursos, questões ou materiais.</p>}</div>}
      </div>
      <div className="silva-account">
        <button className="silva-icon-button" aria-label={dark ? "Usar tema claro" : "Usar tema escuro"} onClick={toggleDark}>{dark ? <Sun size={18} /> : <Moon size={18} />}</button>
        <FastLink href="/carrinho" className="silva-icon-button relative" aria-label={"Carrinho, " + cartCount + " itens"}><ShoppingCart size={18} />{cartCount > 0 && <span className="absolute -right-1 -top-1 rounded-full bg-[var(--brand-button)] px-1 text-[10px] text-white">{cartCount}</span>}</FastLink>
        <FastLink href="/perfil" className="flex items-center gap-2.5" aria-label={"Perfil de " + user.name}><span className="silva-avatar">{user.avatarUrl ? <Image src={user.avatarUrl} alt="" width={35} height={35} className="h-full w-full object-cover" /> : user.name.split(" ").slice(0, 2).map((part) => part[0]).join("")}</span><span className="silva-account-name text-xs font-semibold">{user.name.split(" ")[0]}</span><ChevronDown size={13} className="silva-desktop-only silva-muted" /></FastLink>
      </div>
    </header>
    <FeedbackProvider><main id="main-content" className="silva-main" inert={openMobile}>{children}</main></FeedbackProvider>
  </div>;
}
