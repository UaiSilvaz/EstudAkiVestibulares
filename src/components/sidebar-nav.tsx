"use client";

import { ChevronRight } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { FastLink } from "./fast-link";
import { announceRouteTransition } from "./route-transition-indicator";
import { getVerticalNavigation } from "@/config/vertical-navigation";
import { normalizeVerticalSlug } from "@/config/vertical-themes";
import { cn } from "@/lib/utils";
import { SidebarMotionIcon, type SidebarMotionIconName } from "@/components/visual/sidebar-motion-icon";

type IconName = SidebarMotionIconName;

type NavChild = {
  href: string;
  label: string;
  exact?: boolean;
  badge?: string;
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
  verticalSlug?: string | null;
  collapsed?: boolean;
  onNavigate?: () => void;
  onRequestExpand?: () => void;
};

const adminItem: NavItem = {
  id: "admin",
  label: "Administracao",
  icon: "admin",
  children: [
    { href: "/admin", label: "Visao geral", exact: true },
    { href: "/admin/questions", label: "Questoes cadastradas" },
    { href: "/admin/trilhas", label: "Jornada" },
    { href: "/admin/conquistas", label: "Conquistas" },
    { href: "/admin/exams", label: "Provas CMS" },
    { href: "/admin/provas-antigas", label: "Provas antigas" },
    { href: "/admin/content", label: "Conteudos" },
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
  verticalSlug,
  collapsed = false,
  onNavigate,
  onRequestExpand,
}: SidebarNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const activeVertical = normalizeVerticalSlug(verticalSlug);
  const items = useMemo(() => {
    const mainItems: NavItem[] = getVerticalNavigation(activeVertical).map((item) => ({
      ...item,
      icon: item.icon as IconName,
    }));

    return canManage ? [...mainItems, adminItem] : mainItems;
  }, [activeVertical, canManage]);
  const activeGroupId = items.find((item) => item.children?.some((child) => isActiveHref(pathname, child.href, child.exact)))?.id ?? null;
  const [openGroupOverride, setOpenGroupOverride] = useState<string | null>(null);
  const openGroup = openGroupOverride ?? activeGroupId;
  const [loggingOut, setLoggingOut] = useState(false);

  async function logout() {
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    onNavigate?.();
    announceRouteTransition("/login");
    router.push("/login");
    router.refresh();
  }

  function toggleGroup(item: NavItem) {
    if (collapsed) onRequestExpand?.();
    setOpenGroupOverride((current) => ((current ?? activeGroupId) === item.id ? null : item.id));
  }

  return (
    <nav className="flex h-full min-h-0 flex-col" aria-label="Navegacao principal">
      <div className={cn("flex min-h-0 flex-1 flex-col gap-2", collapsed ? "items-center" : "overflow-y-auto pr-1 thin-scrollbar")}>
        {items.map((item, index) => {
          const active = itemHasActiveRoute(pathname, item);
          const open = openGroup === item.id && !collapsed;

          return (
            <div
              key={item.id}
              className="w-full animate-[estudaki-fast-fade_120ms_ease-out]"
              style={{ animationDelay: `${Math.min(index * 12, 72)}ms` }}
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
                    <AnimatedNavIcon name={item.icon} active={active} collapsed={collapsed} />
                  </span>
                  <span className={labelClass(collapsed)}>{item.label}</span>
                  {!collapsed && (
                    <span
                      className={cn(
                        "ml-auto flex h-7 w-7 items-center justify-center rounded-lg text-[color:var(--theme-muted)] transition-transform duration-150",
                        open && "rotate-90",
                      )}
                      aria-hidden="true"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </span>
                  )}
                  <CollapsedTooltip show={collapsed} label={item.label} />
                </button>
              )}

              {item.children && open && (
                <div
                  id={`sidebar-group-${item.id}`}
                  className="overflow-hidden animate-[estudaki-fast-reveal_140ms_ease-out]"
                >
                  <div className="ml-5 mt-1.5 space-y-1 border-l border-[color:color-mix(in_srgb,var(--theme-primary)_18%,white)] pb-1 pl-3">
                    {item.children.map((child) => {
                      const childActive = isActiveHref(pathname, child.href, child.exact);

                      return (
                        <FastLink
                          key={child.href}
                          href={child.href}
                          onClick={onNavigate}
                          aria-current={childActive ? "page" : undefined}
                          pendingClassName="bg-[color:color-mix(in_srgb,var(--theme-primary)_10%,white)] text-[color:var(--theme-primary)]"
                          className={cn(
                            "flex h-9 items-center gap-2 rounded-xl px-3 text-[13px] font-semibold transition-all duration-200",
                            childActive
                              ? "bg-[color:color-mix(in_srgb,var(--theme-primary)_10%,white)] text-[color:var(--theme-primary)]"
                              : "text-[color:var(--theme-muted)] hover:translate-x-0.5 hover:bg-[color:color-mix(in_srgb,var(--theme-primary)_7%,white)] hover:text-[color:var(--theme-primary)]",
                          )}
                        >
                          <span className="min-w-0 flex-1 truncate">{child.label}</span>
                          {child.badge && (
                            <span className="shrink-0 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-black uppercase leading-none text-emerald-700 ring-1 ring-emerald-200">
                              {child.badge}
                            </span>
                          )}
                        </FastLink>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className={cn("mt-auto border-t border-[color:var(--theme-border)] pt-3", collapsed ? "flex w-full flex-col items-center gap-2" : "space-y-2")}>
        <SidebarLink
          item={{ id: "settings", label: "Configuracoes", icon: "settings", href: "/perfil" }}
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
            "text-[color:var(--theme-muted)] hover:bg-rose-50 hover:text-rose-600 disabled:opacity-70",
          )}
          aria-label={loggingOut ? "Saindo" : "Sair"}
        >
          <span className={iconWrapClass(false, collapsed)}>
            <AnimatedNavIcon name="logout" collapsed={collapsed} />
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
      pendingClassName="bg-[color:color-mix(in_srgb,var(--theme-primary)_10%,white)] text-[color:var(--theme-primary)]"
      className={navItemClass(active, collapsed)}
    >
      <ActiveIndicator active={active} />
      <span className={iconWrapClass(active, collapsed)}>
        <AnimatedNavIcon name={item.icon} active={active} collapsed={collapsed} />
      </span>
      <span className={labelClass(collapsed)}>{item.label}</span>
      <CollapsedTooltip show={collapsed} label={item.label} />
    </FastLink>
  );
}

function navItemClass(active: boolean, collapsed: boolean) {
  return cn(
    "group relative flex w-full items-center gap-3 rounded-[17px] text-[15px] font-bold transition-all duration-200",
    collapsed ? "h-14 justify-center px-0" : "h-12 px-3",
    active
      ? "bg-[color:color-mix(in_srgb,var(--theme-primary)_13%,var(--theme-surface))] text-[color:var(--theme-primary)] shadow-[0_14px_30px_-24px_var(--theme-primary)]"
      : "text-[color:var(--theme-muted)] hover:translate-x-0.5 hover:bg-[color:color-mix(in_srgb,var(--theme-primary)_8%,var(--theme-surface))] hover:text-[color:var(--theme-primary)]",
  );
}

function iconWrapClass(active: boolean, collapsed: boolean) {
  return cn(
    "flex shrink-0 items-center justify-center rounded-[16px] transition-all duration-200",
    collapsed ? "h-[52px] w-[52px]" : "h-10 w-10",
    active ? "text-[color:var(--theme-primary)]" : "text-[color:var(--theme-muted)] group-hover:text-[color:var(--theme-primary)]",
  );
}

function labelClass(collapsed: boolean) {
  return cn("min-w-0 flex-1 truncate text-left transition-all duration-200", collapsed && "sr-only");
}

function ActiveIndicator({ active }: { active: boolean }) {
  if (!active) return null;
  return <span className="absolute left-0 top-1/2 h-7 w-1 -translate-y-1/2 rounded-r-full bg-[color:var(--theme-primary)]" aria-hidden="true" />;
}

function CollapsedTooltip({ show, label }: { show: boolean; label: string }) {
  if (!show) return null;

  return (
    <span
      className="pointer-events-none absolute left-[calc(100%+10px)] top-1/2 z-50 -translate-y-1/2 translate-x-1 whitespace-nowrap rounded-xl border border-[color:var(--theme-border)] bg-[color:var(--theme-surface)] px-3 py-2 text-xs font-bold text-[color:var(--theme-text)] opacity-0 shadow-[0_14px_32px_-18px_rgba(15,23,42,0.38)] transition-all duration-150 group-hover:translate-x-0 group-hover:opacity-100"
      role="tooltip"
    >
      {label}
    </span>
  );
}

function AnimatedNavIcon({
  name,
  active = false,
  collapsed = false,
}: {
  name: IconName;
  active?: boolean;
  collapsed?: boolean;
}) {
  return <SidebarMotionIcon name={name} active={active} collapsed={collapsed} />;
}
