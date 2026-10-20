import {
  BarChart3, CalendarCheck2, CirclePlay, FolderOpen, House, ListChecks,
  LogOut, Presentation, Settings, ShieldCheck, UsersRound, type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Aicon, type AiconName } from "./aicon";

export type SidebarMotionIconName =
  | "home" | "plan" | "lessons" | "questions" | "materials" | "progress"
  | "community" | "settings" | "logout" | "admin" | "teacher";

const icons: Record<SidebarMotionIconName, LucideIcon> = {
  home: House, plan: CalendarCheck2, lessons: CirclePlay, questions: ListChecks,
  materials: FolderOpen, progress: BarChart3, community: UsersRound,
  settings: Settings, logout: LogOut, admin: ShieldCheck, teacher: Presentation,
};
const artwork: Partial<Record<SidebarMotionIconName, AiconName>> = {
  home: "home", plan: "calendar", lessons: "video", questions: "document",
  materials: "folder", progress: "chart", community: "community", teacher: "live",
};

export function SidebarMotionIcon({ name, active = false, collapsed = false, className }: {
  name: SidebarMotionIconName; active?: boolean; collapsed?: boolean; className?: string;
}) {
  const Icon = icons[name];
  return (
    <span aria-hidden="true" className={cn(
      "professional-nav-icon inline-flex shrink-0 items-center justify-center rounded-lg transition-colors duration-150",
      collapsed ? "h-9 w-9" : "h-8 w-8",
      active ? "text-[color:var(--theme-primary)]" : "text-[color:var(--theme-muted)]",
      className,
    )}>
      {artwork[name]
        ? <Aicon name={artwork[name]} tone="outline" size={22} />
        : <Icon className="h-5 w-5" strokeWidth={1.75} />}
    </span>
  );
}
