import { Award, BookMarked, BookOpenCheck, CalendarCheck, Clock3, FlaskConical, Globe2, Medal, MessagesSquare, PenLine, Target, Trophy, Users } from "@/components/visual/aicon-icons";
import { Brain, Calculator, ClipboardCheck, Flame, Gem, GraduationCap, Leaf, Lightbulb, LockKeyhole, Map, Network, Rocket, ScrollText, Sparkles, Zap, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";



const iconMap: Record<string, LucideIcon> = {
  award: Award,
  brain: Brain,
  "book-marked": BookMarked,
  "book-open-check": BookOpenCheck,
  calculator: Calculator,
  "calendar-check": CalendarCheck,
  "clipboard-check": ClipboardCheck,
  clock: Clock3,
  flame: Flame,
  flask: FlaskConical,
  gem: Gem,
  globe: Globe2,
  "graduation-cap": GraduationCap,
  leaf: Leaf,
  lightbulb: Lightbulb,
  map: Map,
  medal: Medal,
  "messages-square": MessagesSquare,
  network: Network,
  pen: PenLine,
  rocket: Rocket,
  scroll: ScrollText,
  sparkles: Sparkles,
  target: Target,
  trophy: Trophy,
  users: Users,
  zap: Zap,
};

function normalized(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function iconNameFor(input: {
  icon?: string | null;
  iconKey: string;
  category?: string;
  title?: string;
}) {
  const direct = normalized(input.icon).replace(/_/g, "-");
  if (direct && iconMap[direct]) return direct;

  const text = normalized(`${input.iconKey} ${input.category ?? ""} ${input.title ?? ""}`);
  if (text.includes("matemat") || text.includes("numero") || text.includes("algebra")) return "calculator";
  if (text.includes("fisic") || text.includes("energia") || text.includes("vetor")) return "zap";
  if (text.includes("quim") || text.includes("reacao")) return "flask";
  if (text.includes("bio") || text.includes("vida")) return "leaf";
  if (text.includes("redacao") || text.includes("texto") || text.includes("essay")) return "pen";
  if (text.includes("sequencia") || text.includes("constancia") || text.includes("streak")) return "flame";
  if (text.includes("acerto") || text.includes("gabarito") || text.includes("alvo") || text.includes("correct")) return "target";
  if (text.includes("simulado") || text.includes("prova") || text.includes("quest")) return "clipboard-check";
  if (text.includes("erro") || text.includes("review")) return "book-open-check";
  if (text.includes("tempo") || text.includes("hora")) return "clock";
  if (text.includes("conteudo") || text.includes("dominio")) return "brain";
  if (text.includes("comunidade")) return "users";
  if (text.includes("ranking")) return "medal";
  if (text.includes("material") || text.includes("aula") || text.includes("pdf")) return "book-marked";
  if (text.includes("vestibular") || text.includes("exam")) return "graduation-cap";
  if (text.includes("secreta") || text.includes("secret")) return "gem";
  return "trophy";
}

type AchievementIconLookup = {
  icon?: string | null;
  iconKey: string;
  category?: string;
  title?: string;
  locked?: boolean;
};

type AchievementGlyphProps = AchievementIconLookup & {
  className?: string;
  strokeWidth?: number;
};

export function AchievementGlyph({
  icon,
  iconKey,
  category,
  title,
  locked,
  className,
  strokeWidth = 1.75,
}: AchievementGlyphProps) {
  const props = { className, strokeWidth };
  if (locked) return <LockKeyhole {...props} />;
  const iconName = iconNameFor({ icon, iconKey, category, title });

  switch (iconName) {
    case "award":
      return <Award {...props} />;
    case "brain":
      return <Brain {...props} />;
    case "book-marked":
      return <BookMarked {...props} />;
    case "book-open-check":
      return <BookOpenCheck {...props} />;
    case "calculator":
      return <Calculator {...props} />;
    case "calendar-check":
      return <CalendarCheck {...props} />;
    case "clipboard-check":
      return <ClipboardCheck {...props} />;
    case "clock":
      return <Clock3 {...props} />;
    case "flame":
      return <Flame {...props} />;
    case "flask":
      return <FlaskConical {...props} />;
    case "gem":
      return <Gem {...props} />;
    case "globe":
      return <Globe2 {...props} />;
    case "graduation-cap":
      return <GraduationCap {...props} />;
    case "leaf":
      return <Leaf {...props} />;
    case "lightbulb":
      return <Lightbulb {...props} />;
    case "map":
      return <Map {...props} />;
    case "medal":
      return <Medal {...props} />;
    case "messages-square":
      return <MessagesSquare {...props} />;
    case "network":
      return <Network {...props} />;
    case "pen":
      return <PenLine {...props} />;
    case "rocket":
      return <Rocket {...props} />;
    case "scroll":
      return <ScrollText {...props} />;
    case "sparkles":
      return <Sparkles {...props} />;
    case "target":
      return <Target {...props} />;
    case "users":
      return <Users {...props} />;
    case "zap":
      return <Zap {...props} />;
    default:
      return <Trophy {...props} />;
  }
}

export function AchievementIcon({
  icon,
  iconKey,
  rarity,
  locked,
  label,
  category,
  color,
  title,
  className = "h-20 w-20",
}: {
  icon?: string | null;
  iconKey: string;
  rarity: string;
  locked?: boolean;
  label: string;
  category?: string;
  color?: string | null;
  title?: string;
  className?: string;
}) {
  void rarity;
  void color;

  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center rounded-xl border border-[color:var(--theme-border)] bg-[color:var(--theme-surface-alt)] text-[color:var(--theme-primary)]",
        locked && "bg-slate-100 text-slate-400 ring-slate-200",
        className,
      )}
      role="img"
      aria-label={label}
    >
      <AchievementGlyph
        icon={icon}
        iconKey={iconKey}
        category={category}
        title={title}
        locked={locked}
        className="relative z-10 h-[46%] w-[46%]"
        strokeWidth={1.75}
      />

    </span>
  );
}
