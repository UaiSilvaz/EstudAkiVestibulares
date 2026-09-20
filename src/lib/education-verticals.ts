import type { CSSProperties } from "react";
import {
  canonicalVerticalSlugs,
  getVerticalTheme,
  normalizeVerticalSlug,
  verticalThemeStyle,
  verticalThemes,
  type StudyVertical,
} from "@/config/vertical-themes";

export type EducationTheme = "youth" | "professional" | "clinical" | "institutional";

type VerticalDefinition = {
  name: string;
  description: string;
  theme: EducationTheme;
  primary: string;
  primaryDark: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  ink: string;
  personality: string;
  essay: boolean;
  syllabus: boolean;
  gamification: boolean;
  subjects: { slug: string; name: string }[];
  exams: { slug: string; name: string }[];
};

function themeKeyForVertical(slug: StudyVertical): EducationTheme {
  if (slug === "vestibular") return "youth";
  if (slug === "medicina") return "clinical";
  if (slug === "policia-civil" || slug === "policia-militar" || slug === "militares") {
    return "institutional";
  }
  return "professional";
}

function toEducationDefinition(slug: StudyVertical): VerticalDefinition {
  const theme = verticalThemes[slug];

  return {
    name: theme.name,
    description: theme.description,
    theme: themeKeyForVertical(slug),
    primary: theme.colors.primary,
    primaryDark: theme.colors.primaryDark,
    secondary: theme.colors.secondary,
    accent: theme.colors.accent,
    background: theme.colors.background,
    surface: theme.colors.surface,
    ink: theme.colors.text,
    personality: theme.personality,
    essay: theme.features.essay,
    syllabus: theme.features.syllabus,
    gamification: theme.features.gamification,
    subjects: theme.subjects,
    exams: theme.exams,
  };
}

export const educationVerticals = Object.fromEntries(
  canonicalVerticalSlugs.map((slug) => [slug, toEducationDefinition(slug)]),
) as Record<StudyVertical, VerticalDefinition>;

export type EducationVerticalSlug = keyof typeof educationVerticals;

export function getEducationVertical(slug: string | null | undefined): VerticalDefinition {
  return toEducationDefinition(normalizeVerticalSlug(slug));
}

export function educationThemeStyle(slug: string | null | undefined): CSSProperties {
  return verticalThemeStyle(slug);
}

export { getVerticalTheme, normalizeVerticalSlug, verticalThemeStyle };
