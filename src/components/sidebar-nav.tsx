"use client";

import { motion } from "framer-motion";
import {
  BarChart3,
  BookMarked,
  CalendarDays,
  ClipboardList,
  FileText,
  Flame,
  GraduationCap,
  Home,
  Library,
  type LucideIcon,
  MessagesSquare,
  Medal,
  PenTool,
  PlaySquare,
  Sparkles,
  Trophy,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

type NavLink = { href: string; label: string; icon: LucideIcon; badge?: string; color: string; gradient: string };

const studentLinks: NavLink[] = [
  { href: "/dashboard", label: "Início", icon: Home, color: "#2563EB", gradient: "from-[#2563EB] via-[#22D3EE] to-[#86EFAC]" },
  { href: "/questions", label: "Questões", icon: ClipboardList, color: "#F97316", gradient: "from-[#FACC15] via-[#F97316] to-[#FB7185]", badge: "novo" },
  { href: "/simulados", label: "Simulados", icon: GraduationCap, color: "#22C55E", gradient: "from-[#22C55E] via-[#86EFAC] to-[#22D3EE]" },
  { href: "/cronograma", label: "Cronograma", icon: CalendarDays, color: "#A78BFA", gradient: "from-[#A78BFA] via-[#C4B5FD] to-[#22D3EE]" },
  { href: "/performance", label: "Desempenho", icon: BarChart3, color: "#FACC15", gradient: "from-[#FACC15] via-[#FDE047] to-[#F97316]" },
];

const materialLinks: NavLink[] = [
  { href: "/provas", label: "Provas antigas", icon: FileText, color: "#2563EB", gradient: "from-[#2563EB] via-[#60A5FA] to-[#22D3EE]" },
  { href: "/materials", label: "Materiais", icon: Library, color: "#F97316", gradient: "from-[#FACC15] via-[#F97316] to-[#FB7185]" },
  { href: "/videos", label: "Express", icon: PlaySquare, color: "#FB7185", gradient: "from-[#FB7185] via-[#FDA4AF] to-[#A78BFA]" },
  { href: "/flashcards", label: "Flashcards", icon: BookMarked, color: "#22C55E", gradient: "from-[#22C55E] via-[#86EFAC] to-[#22D3EE]" },
  { href: "/redacao", label: "Redação", icon: PenTool, color: "#F97316", gradient: "from-[#FACC15] via-[#F97316] to-[#FB7185]" },
];

const communityLinks: NavLink[] = [
  { href: "/ranking", label: "Ranking", icon: Trophy, color: "#FACC15", gradient: "from-[#FACC15] via-[#FDE047] to-[#F97316]" },
  { href: "/conquistas", label: "Conquistas", icon: Medal, color: "#A78BFA", gradient: "from-[#A78BFA] via-[#C4B5FD] to-[#22D3EE]" },
  { href: "/community", label: "Comunidade", icon: MessagesSquare, color: "#2563EB", gradient: "from-[#2563EB] via-[#22D3EE] to-[#86EFAC]" },
];

const adminLinks: NavLink[] = [
  { href: "/admin", label: "Visão geral", icon: Sparkles, color: "#2563EB", gradient: "from-[#2563EB] via-[#22D3EE] to-[#86EFAC]" },
  { href: "/admin/questions", label: "Editor de questões", icon: PenTool, color: "#F97316", gradient: "from-[#FACC15] via-[#F97316] to-[#FB7185]" },
  { href: "/admin/exams", label: "Provas CMS", icon: FileText, color: "#A78BFA", gradient: "from-[#A78BFA] via-[#C4B5FD] to-[#22D3EE]" },
  { href: "/admin/content", label: "Conteúdos", icon: Flame, color: "#F97316", gradient: "from-[#FACC15] via-[#F97316] to-[#FB7185]" },
];

type Group = { title: string; links: NavLink[]; accent: string };

export function SidebarNav({ canManage }: { canManage: boolean }) {
  const pathname = usePathname();
  const groups: Group[] = [
    { title: "Estudos", accent: "from-[#2563EB] to-[#86EFAC]", links: studentLinks },
    { title: "Materiais", accent: "from-[#FACC15] to-[#F97316]", links: materialLinks },
    { title: "Comunidade", accent: "from-[#22C55E] to-[#22D3EE]", links: communityLinks },
    ...(canManage
      ? [{ title: "Administração", accent: "from-[#A78BFA] to-[#FB7185]", links: adminLinks } as Group]
      : []),
  ];

  return (
    <nav className="space-y-6">
      {groups.map((group, groupIndex) => (
        <div key={group.title}>
          <div className="mb-2 flex items-center gap-2 px-3">
            <span className={`h-1.5 w-6 rounded-full bg-gradient-to-r ${group.accent}`} />
            <p className="text-[10px] font-black uppercase tracking-[0.32em] text-slate-500">
              {group.title}
            </p>
          </div>
          <div className="space-y-1.5">
            {group.links.map((link, linkIndex) => {
              const Icon = link.icon;
              const active = pathname === link.href || pathname.startsWith(`${link.href}/`);

              return (
                <motion.div
                  key={link.href}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: groupIndex * 0.05 + linkIndex * 0.03, duration: 0.3 }}
                >
                  <Link
                    href={link.href}
                    className={cn(
                      "group relative flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-bold transition-all duration-200",
                      active
                        ? "text-white shadow-[0_10px_24px_-10px_rgba(37,99,235,0.45)]"
                        : "text-slate-500 hover:bg-slate-50 hover:text-[#0F172A]",
                    )}
                    style={
                      active
                        ? {
                            background: `linear-gradient(135deg, ${link.color} 0%, ${link.color}DD 100%)`,
                          }
                        : undefined
                    }
                  >
                    <span
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-all",
                        active
                          ? "bg-white/25 text-white ring-1 ring-white/30"
                          : "bg-slate-50 text-slate-500 group-hover:bg-white group-hover:shadow-sm",
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="flex-1 truncate">{link.label}</span>
                    {link.badge && (
                      <span className="rounded-full bg-gradient-to-r from-[#FACC15] to-[#F97316] px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-white">
                        {link.badge}
                      </span>
                    )}
                    {active && (
                      <span className="h-1.5 w-1.5 animate-blink rounded-full bg-white" />
                    )}
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </div>
      ))}

      <div className="rounded-3xl border border-blue-100/80 bg-gradient-to-br from-[#EFF6FF] via-white to-[#FEF3C7] p-5 shadow-sm">
        <p className="text-[10px] font-black uppercase tracking-[0.32em] text-blue-700">
          Plano Pro
        </p>
        <p className="mt-1 font-display text-base font-extrabold leading-tight text-[#0F172A]">
          Desbloqueie trilhas avançadas, simulados e estatísticas.
        </p>
        <Link
          href="/performance"
          className="mt-3 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#2563EB] to-[#22D3EE] px-3 py-1.5 text-xs font-black text-white shadow-md transition hover:-translate-y-0.5"
        >
          Conhecer →
        </Link>
      </div>
    </nav>
  );
}
