import { StudyIcon, type StudyIconName } from "./study-icon";

export type SubjectMotionIconName = "matematica" | "linguagens" | "redacao" | "fisica" | "quimica" | "biologia" | "ciencias_humanas";
export type SubjectMotionIconSize = "xs" | "sm" | "md" | "lg" | "xl";

export function SubjectMotionIcon({ name, label, size = "md", decorative = false, className }: {
  name: SubjectMotionIconName; label?: string; size?: SubjectMotionIconSize;
  decorative?: boolean; className?: string;
}) {
  const subject: StudyIconName = name === "ciencias_humanas" ? "ciencias-humanas" : name;
  return <span role={decorative ? undefined : "img"} aria-label={decorative ? undefined : label} aria-hidden={decorative || undefined}>
    <StudyIcon name={subject} size={size} variant="plain" className={className} />
  </span>;
}
