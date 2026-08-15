import Image from "next/image";
import { cn } from "@/lib/utils";

export type StudyIconName =
  | "matematica"
  | "linguagens"
  | "redacao"
  | "fisica"
  | "quimica"
  | "biologia"
  | "geografia"
  | "ciencias-humanas";

type StudyIconVariant = "tile" | "ghost" | "plain";

type StudyIconProps = {
  name: StudyIconName;
  variant?: StudyIconVariant;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
  imageClassName?: string;
  priority?: boolean;
};

type StudyIconMeta = {
  src?: string;
  alt: string;
  primary: string;
  secondary: string;
  soft: string;
  glow: string;
  deep: string;
};

export const STUDY_ICON_META: Record<StudyIconName, StudyIconMeta> = {
  matematica: {
    src: "/assets/jornada-icons/matematica-compact.png",
    alt: "Matematica",
    primary: "#2F8DFF",
    secondary: "#7CC2FF",
    soft: "#EAF4FF",
    glow: "rgba(47, 141, 255, 0.32)",
    deep: "#1664D8",
  },
  linguagens: {
    src: "/assets/jornada-icons/linguagens-compact.png",
    alt: "Linguagens",
    primary: "#2F9BFF",
    secondary: "#62D77D",
    soft: "#EAF8EF",
    glow: "rgba(34, 197, 94, 0.26)",
    deep: "#1179D4",
  },
  redacao: {
    src: "/assets/jornada-icons/redacao-compact.png",
    alt: "Redacao",
    primary: "#FF8A18",
    secondary: "#FFB45C",
    soft: "#FFF2E2",
    glow: "rgba(255, 138, 24, 0.30)",
    deep: "#EA580C",
  },
  fisica: {
    src: "/assets/jornada-icons/fisica-compact.png",
    alt: "Fisica",
    primary: "#F43F5E",
    secondary: "#FF6B7E",
    soft: "#FFE9EE",
    glow: "rgba(244, 63, 94, 0.34)",
    deep: "#E11D48",
  },
  quimica: {
    src: "/assets/jornada-icons/quimica-compact.png",
    alt: "Quimica",
    primary: "#8A42FF",
    secondary: "#C084FC",
    soft: "#F2E8FF",
    glow: "rgba(138, 66, 255, 0.32)",
    deep: "#6D28D9",
  },
  biologia: {
    src: "/assets/jornada-icons/biologia-compact.png",
    alt: "Biologia",
    primary: "#168A3A",
    secondary: "#8BD91F",
    soft: "#EEF9DE",
    glow: "rgba(54, 185, 85, 0.30)",
    deep: "#0F7A32",
  },
  geografia: {
    src: "/assets/jornada-icons/geografia-compact.png",
    alt: "Geografia",
    primary: "#22A06B",
    secondary: "#86EFAC",
    soft: "#ECFDF5",
    glow: "rgba(34, 160, 107, 0.30)",
    deep: "#15803D",
  },
  "ciencias-humanas": {
    src: "/assets/jornada-icons/humanas-compact.png",
    alt: "Ciencias Humanas",
    primary: "#F4B000",
    secondary: "#FFD43B",
    soft: "#FFF4BF",
    glow: "rgba(244, 176, 0, 0.30)",
    deep: "#C57F00",
  },
};

const sizeMap = {
  xs: "h-10 w-10",
  sm: "h-12 w-12",
  md: "h-16 w-16",
  lg: "h-24 w-24",
  xl: "h-40 w-40",
};

const sizePx = {
  xs: 40,
  sm: 48,
  md: 64,
  lg: 96,
  xl: 160,
};

export function StudyIcon({
  name,
  variant = "tile",
  size = "md",
  className,
  imageClassName,
  priority = false,
}: StudyIconProps) {
  const meta = STUDY_ICON_META[name];

  return (
    <span
      aria-hidden={meta.src ? undefined : true}
      aria-label={meta.src ? meta.alt : undefined}
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-visible",
        variant === "tile" && "study-icon-badge",
        variant === "ghost" && "pointer-events-none opacity-[0.58] saturate-125",
        sizeMap[size],
        className,
      )}
      style={{
        filter: variant === "tile" && meta.src ? `drop-shadow(0 14px 16px ${meta.glow})` : undefined,
      }}
    >
      {meta.src ? (
        <Image
          src={meta.src}
          alt=""
          width={sizePx[size] * 2}
          height={sizePx[size] * 2}
          priority={priority}
          draggable={false}
          className={cn("pointer-events-none h-full w-full select-none object-contain", imageClassName)}
          sizes={`${sizePx[size]}px`}
        />
      ) : null}
    </span>
  );
}

export function studyIconNameForSubject(subjectName?: string | null): StudyIconName {
  const normalized = normalizeSubject(subjectName);

  if (normalized.includes("matemat") || normalized.includes("algebra") || normalized.includes("geometr")) {
    return "matematica";
  }
  if (normalized.includes("quim")) return "quimica";
  if (normalized.includes("bio") || normalized.includes("genet") || normalized.includes("ecolog")) return "biologia";
  if (normalized.includes("fisic") || normalized.includes("mecan") || normalized.includes("eletric")) return "fisica";
  if (normalized.includes("redac") || normalized.includes("essay")) return "redacao";
  if (normalized.includes("geograf")) return "geografia";
  if (
    normalized.includes("hist") ||
    normalized.includes("sociolog") ||
    normalized.includes("filosof") ||
    normalized.includes("human")
  ) {
    return "ciencias-humanas";
  }

  return "linguagens";
}

export function studyIconColors(name: StudyIconName) {
  return STUDY_ICON_META[name];
}

function normalizeSubject(value?: string | null) {
  return (value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}
