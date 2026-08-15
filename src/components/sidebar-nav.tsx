"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { FastLink } from "./fast-link";
import { cn } from "@/lib/utils";

type IconName =
  | "home"
  | "plan"
  | "questions"
  | "materials"
  | "progress"
  | "community"
  | "settings"
  | "logout"
  | "admin";

type NavChild = {
  href: string;
  label: string;
  exact?: boolean;
};

type NavItem = {
  id: string;
  label: string;
  icon: IconName;
  href?: string;
  exact?: boolean;
  children?: NavChild[];
};

type SidebarNavProps = {
  canManage: boolean;
  collapsed?: boolean;
  onNavigate?: () => void;
  onRequestExpand?: () => void;
};

const mainItems: NavItem[] = [
  { id: "home", label: "Início", icon: "home", href: "/dashboard" },
  {
    id: "plan",
    label: "Meu Plano",
    icon: "plan",
    children: [
      { href: "/trilhas", label: "Jornada" },
      { href: "/cronograma", label: "Cronograma" },
      { href: "/diagnostico", label: "Diagnóstico" },
    ],
  },
  {
    id: "questions",
    label: "Questões",
    icon: "questions",
    children: [
      { href: "/questions", label: "Banco de Questões" },
      { href: "/simulados", label: "Simulados" },
      { href: "/flashcards", label: "Flashcards" },
      { href: "/redacao", label: "Redação" },
    ],
  },
  {
    id: "materials",
    label: "Materiais",
    icon: "materials",
    children: [
      { href: "/biblioteca", label: "Biblioteca" },
      { href: "/provas-antigas", label: "Provas antigas" },
      { href: "/materials", label: "Materiais" },
    ],
  },
  {
    id: "progress",
    label: "Progresso",
    icon: "progress",
    children: [
      { href: "/performance", label: "Desempenho" },
      { href: "/ranking", label: "Ranking" },
      { href: "/conquistas", label: "Conquistas" },
    ],
  },
  { id: "community", label: "Comunidade", icon: "community", href: "/community" },
];

const adminItem: NavItem = {
  id: "admin",
  label: "Administração",
  icon: "admin",
  children: [
    { href: "/admin", label: "Visão geral", exact: true },
    { href: "/admin/questions", label: "Questões cadastradas" },
    { href: "/admin/trilhas", label: "Jornada" },
    { href: "/admin/conquistas", label: "Conquistas" },
    { href: "/admin/exams", label: "Provas CMS" },
    { href: "/admin/provas-antigas", label: "Provas antigas" },
    { href: "/admin/content", label: "Conteúdos" },
  ],
};

function isActiveHref(pathname: string, href: string, exact = false) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function itemHasActiveRoute(pathname: string, item: NavItem) {
  if (item.href && isActiveHref(pathname, item.href, item.exact)) return true;
  return item.children?.some((child) => isActiveHref(pathname, child.href, child.exact)) ?? false;
}

export function SidebarNav({
  canManage,
  collapsed = false,
  onNavigate,
  onRequestExpand,
}: SidebarNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const items = useMemo(() => (canManage ? [...mainItems, adminItem] : mainItems), [canManage]);
  const activeGroupId = items.find((item) => item.children?.some((child) => isActiveHref(pathname, child.href, child.exact)))?.id ?? null;
  const [openGroupOverride, setOpenGroupOverride] = useState<string | null>(null);
  const openGroup = openGroupOverride ?? activeGroupId;
  const [loggingOut, setLoggingOut] = useState(false);

  async function logout() {
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    onNavigate?.();
    router.push("/login");
    router.refresh();
  }

  function toggleGroup(item: NavItem) {
    if (collapsed) onRequestExpand?.();
    setOpenGroupOverride((current) => ((current ?? activeGroupId) === item.id ? null : item.id));
  }

  return (
    <nav className="flex h-full min-h-0 flex-col" aria-label="Navegação principal">
      <div className={cn("flex min-h-0 flex-1 flex-col gap-1.5", collapsed ? "items-center" : "overflow-y-auto pr-1 thin-scrollbar")}>
        {items.map((item, index) => {
          const active = itemHasActiveRoute(pathname, item);
          const open = openGroup === item.id && !collapsed;

          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.025, duration: 0.22 }}
              className="w-full"
            >
              {item.href ? (
                <SidebarLink
                  item={item}
                  active={active}
                  collapsed={collapsed}
                  onNavigate={onNavigate}
                />
              ) : (
                <button
                  type="button"
                  aria-expanded={open}
                  aria-controls={`sidebar-group-${item.id}`}
                  onClick={() => toggleGroup(item)}
                  className={navItemClass(active, collapsed)}
                >
                  <ActiveIndicator active={active} />
                  <span className={iconWrapClass(active, collapsed)}>
                    <AnimatedNavIcon name={item.icon} />
                  </span>
                  <span className={labelClass(collapsed)}>{item.label}</span>
                  {!collapsed && (
                    <motion.span
                      className="ml-auto flex h-7 w-7 items-center justify-center rounded-lg text-slate-400"
                      animate={{ rotate: open ? 90 : 0 }}
                      transition={{ duration: 0.2 }}
                      aria-hidden="true"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </motion.span>
                  )}
                  <CollapsedTooltip show={collapsed} label={item.label} />
                </button>
              )}

              <AnimatePresence initial={false}>
                {item.children && open && (
                  <motion.div
                    id={`sidebar-group-${item.id}`}
                    initial={{ height: 0, opacity: 0, y: -4 }}
                    animate={{ height: "auto", opacity: 1, y: 0 }}
                    exit={{ height: 0, opacity: 0, y: -4 }}
                    transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
                    className="overflow-hidden"
                  >
                    <div className="ml-5 mt-1.5 space-y-1 border-l border-blue-100/80 pb-1 pl-3">
                      {item.children.map((child) => {
                        const childActive = isActiveHref(pathname, child.href, child.exact);

                        return (
                          <FastLink
                            key={child.href}
                            href={child.href}
                            onClick={onNavigate}
                            aria-current={childActive ? "page" : undefined}
                            pendingClassName="bg-blue-50 text-blue-700"
                            className={cn(
                              "flex h-9 items-center rounded-xl px-3 text-[13px] font-semibold transition-all duration-200",
                              childActive
                                ? "bg-blue-50 text-blue-700"
                                : "text-slate-500 hover:bg-slate-50 hover:text-blue-700 hover:translate-x-0.5",
                            )}
                          >
                            {child.label}
                          </FastLink>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      <div className={cn("mt-auto border-t border-slate-100 pt-3", collapsed ? "flex w-full flex-col items-center gap-1.5" : "space-y-1.5")}>
        <SidebarLink
          item={{ id: "settings", label: "Configurações", icon: "settings", href: "/perfil" }}
          active={isActiveHref(pathname, "/perfil")}
          collapsed={collapsed}
          onNavigate={onNavigate}
        />
        <button
          type="button"
          onClick={logout}
          disabled={loggingOut}
          className={cn(
            navItemClass(false, collapsed),
            "text-slate-500 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-70",
          )}
          aria-label={loggingOut ? "Saindo" : "Sair"}
        >
          <span className={iconWrapClass(false, collapsed)}>
            <AnimatedNavIcon name="logout" />
          </span>
          <span className={labelClass(collapsed)}>{loggingOut ? "Saindo..." : "Sair"}</span>
          <CollapsedTooltip show={collapsed} label={loggingOut ? "Saindo..." : "Sair"} />
        </button>
      </div>
    </nav>
  );
}

function SidebarLink({
  item,
  active,
  collapsed,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  if (!item.href) return null;

  return (
    <FastLink
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      pendingClassName="bg-blue-50 text-blue-700"
      className={navItemClass(active, collapsed)}
    >
      <ActiveIndicator active={active} />
      <span className={iconWrapClass(active, collapsed)}>
        <AnimatedNavIcon name={item.icon} />
      </span>
      <span className={labelClass(collapsed)}>{item.label}</span>
      <CollapsedTooltip show={collapsed} label={item.label} />
    </FastLink>
  );
}

function navItemClass(active: boolean, collapsed: boolean) {
  return cn(
    "group relative flex h-11 w-full items-center gap-3 rounded-[13px] text-[14px] font-semibold transition-all duration-200",
    collapsed ? "justify-center px-0" : "px-3",
    active
      ? "bg-blue-50 text-blue-700 shadow-[0_10px_24px_-20px_rgba(37,99,235,0.55)]"
      : "text-slate-500 hover:bg-slate-50 hover:text-blue-700 hover:translate-x-0.5",
  );
}

function iconWrapClass(active: boolean, collapsed: boolean) {
  return cn(
    "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-all duration-200",
    collapsed && "h-10 w-10",
    active ? "bg-white text-blue-700 ring-1 ring-blue-100" : "text-slate-400 group-hover:bg-white group-hover:text-blue-700 group-hover:shadow-sm",
  );
}

function labelClass(collapsed: boolean) {
  return cn("min-w-0 flex-1 truncate text-left transition-all duration-200", collapsed && "sr-only");
}

function ActiveIndicator({ active }: { active: boolean }) {
  if (!active) return null;
  return <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-blue-600" aria-hidden="true" />;
}

function CollapsedTooltip({ show, label }: { show: boolean; label: string }) {
  if (!show) return null;

  return (
    <span
      className="pointer-events-none absolute left-[calc(100%+10px)] top-1/2 z-50 -translate-y-1/2 translate-x-1 whitespace-nowrap rounded-xl border border-slate-100 bg-white px-3 py-2 text-xs font-bold text-slate-700 opacity-0 shadow-[0_14px_32px_-18px_rgba(15,23,42,0.38)] transition-all duration-150 group-hover:translate-x-0 group-hover:opacity-100"
      role="tooltip"
    >
      {label}
    </span>
  );
}

function AnimatedNavIcon({ name }: { name: IconName }) {
  const svgClass = "h-[21px] w-[21px] overflow-visible";
  const commonProps = {
    className: svgClass,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  switch (name) {
    case "home":
      return (
        <svg {...commonProps}>
          <path className="transition-transform duration-500 ease-out group-hover:-translate-y-0.5" d="M3.5 10.8 12 3.8l8.5 7" />
          <path className="origin-bottom transition-transform duration-500 ease-out group-hover:scale-y-[0.94]" d="M5.5 10.5V20h13v-9.5" />
          <path className="transition-transform duration-500 ease-out group-hover:translate-y-0.5" d="M10 20v-5h4v5" />
        </svg>
      );
    case "plan":
      return (
        <svg {...commonProps}>
          <path className="[stroke-dasharray:26] [stroke-dashoffset:10] transition-[stroke-dashoffset] duration-500 ease-out group-hover:[stroke-dashoffset:0]" d="M4 17.5c2.8-6.7 8.2-1.7 9.5-7.2C14.2 7.3 16 5.8 20 5.5" />
          <path className="origin-center opacity-80 transition-transform duration-500 ease-out group-hover:rotate-[22deg]" d="M17.5 3.5 18.2 5l1.6.7-1.6.7-.7 1.6-.7-1.6-1.6-.7 1.6-.7.7-1.5Z" />
          <path className="opacity-0 transition-opacity delay-75 duration-300 group-hover:opacity-100" d="M5 6.5h.01M19 17.5h.01" />
        </svg>
      );
    case "questions":
      return (
        <svg {...commonProps}>
          <path className="origin-center transition-transform duration-500 ease-out group-hover:rotate-[4deg]" d="M8 4.5h8M9 3h6l.7 2H8.3L9 3Z" />
          <rect className="origin-center transition-transform duration-500 ease-out group-hover:rotate-[4deg]" x="5.5" y="5" width="13" height="16" rx="2.2" />
          <path className="[stroke-dasharray:10] [stroke-dashoffset:10] transition-[stroke-dashoffset] duration-500 group-hover:[stroke-dashoffset:0]" d="M9 10h6" />
          <path d="M9 14h3.2" />
          <path className="opacity-0 transition-opacity delay-100 duration-300 group-hover:opacity-100" d="m13.8 15.2 1.1 1.1 2.3-2.6" />
        </svg>
      );
    case "materials":
      return (
        <svg {...commonProps}>
          <path className="transition-transform duration-500 ease-out group-hover:-translate-y-0.5 group-hover:translate-x-0.5" d="M4 7.5h6l1.6 2H20" />
          <path d="M3.8 8.5h16.4l-1 10H4.8l-1-10Z" />
          <path d="M5 18.5h14" />
        </svg>
      );
    case "progress":
      return (
        <svg {...commonProps}>
          <path d="M4 20h16" />
          <path className="origin-bottom transition-transform duration-300 ease-out group-hover:scale-y-[1.22]" d="M7 16v-4" />
          <path className="origin-bottom transition-transform delay-[50ms] duration-300 ease-out group-hover:scale-y-[1.18]" d="M12 16V8" />
          <path className="origin-bottom transition-transform delay-100 duration-300 ease-out group-hover:scale-y-[1.14]" d="M17 16V5" />
        </svg>
      );
    case "community":
      return (
        <svg {...commonProps}>
          <g className="transition-transform duration-500 ease-out group-hover:-translate-y-0.5">
            <path d="M12 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
            <path d="M7.6 19c.7-2.7 2.2-4 4.4-4s3.7 1.3 4.4 4" />
          </g>
          <g className="transition-transform duration-500 ease-out group-hover:-translate-x-0.5">
            <path d="M6.5 12.5a2.1 2.1 0 1 0 0-4.2" />
            <path d="M4 18c.2-1.4 1-2.3 2.3-2.7" />
          </g>
          <g className="transition-transform duration-500 ease-out group-hover:translate-x-0.5">
            <path d="M17.5 8.3a2.1 2.1 0 1 0 0 4.2" />
            <path d="M17.7 15.3c1.3.4 2.1 1.3 2.3 2.7" />
          </g>
        </svg>
      );
    case "settings":
      return (
        <svg {...commonProps}>
          <g className="origin-center transition-transform duration-500 ease-out group-hover:rotate-[25deg]">
            <path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z" />
            <path d="M19.4 15a1.8 1.8 0 0 0 .36 2l.05.05-2 3.4-.08-.03a1.9 1.9 0 0 0-2.05.42 1.8 1.8 0 0 0-.55 1.13H8.87a1.8 1.8 0 0 0-.55-1.13 1.9 1.9 0 0 0-2.05-.42l-.08.03-2-3.4.05-.05a1.8 1.8 0 0 0 .36-2 1.8 1.8 0 0 0-1.42-1.08v-3.84A1.8 1.8 0 0 0 4.6 9a1.8 1.8 0 0 0-.36-2l-.05-.05 2-3.4.08.03a1.9 1.9 0 0 0 2.05-.42 1.8 1.8 0 0 0 .55-1.13h6.26a1.8 1.8 0 0 0 .55 1.13 1.9 1.9 0 0 0 2.05.42l.08-.03 2 3.4-.05.05a1.8 1.8 0 0 0-.36 2 1.8 1.8 0 0 0 1.42 1.08v3.84A1.8 1.8 0 0 0 19.4 15Z" />
          </g>
        </svg>
      );
    case "logout":
      return (
        <svg {...commonProps}>
          <path d="M10 5H6.8A1.8 1.8 0 0 0 5 6.8v10.4A1.8 1.8 0 0 0 6.8 19H10" />
          <g className="transition-transform duration-500 ease-out group-hover:translate-x-[3px]">
            <path d="M13 8.5 16.5 12 13 15.5" />
            <path d="M8.5 12h8" />
          </g>
        </svg>
      );
    case "admin":
      return (
        <svg {...commonProps}>
          <path d="M12 3.5 19 6v5.8c0 4-2.8 7.1-7 8.7-4.2-1.6-7-4.7-7-8.7V6l7-2.5Z" />
          <path className="[stroke-dasharray:12] [stroke-dashoffset:12] transition-[stroke-dashoffset] duration-500 group-hover:[stroke-dashoffset:0]" d="m8.8 12 2.1 2.1 4.4-4.6" />
        </svg>
      );
  }
}
