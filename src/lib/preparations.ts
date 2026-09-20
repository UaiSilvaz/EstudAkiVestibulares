import "server-only";

import { ContentStatus, EntitlementSource, PreparationLevel } from "@prisma/client";
import type { CSSProperties } from "react";
import { cache } from "react";
import { db } from "@/lib/db";
import {
  educationThemeStyle,
  educationVerticals,
  getEducationVertical,
  type EducationVerticalSlug,
} from "@/lib/education-verticals";

export type ActivePreparationContext = {
  active: {
    id: string;
    userPreparationId: string;
    slug: string;
    name: string;
    displayName: string;
    description: string;
    examSlug: string | null;
    examDate: string | null;
    minutesPerDay: number;
    studyDays: number[];
    level: PreparationLevel;
    hasAccess: boolean;
    isFree: boolean;
    selectedTrackId: string | null;
    vertical: {
      slug: string;
      name: string;
      themeKey: string;
      essay: boolean;
      syllabus: boolean;
      gamification: boolean;
    };
  } | null;
  preparations: Array<{
    id: string;
    userPreparationId: string;
    slug: string;
    name: string;
    displayName: string;
    description: string;
    examSlug: string | null;
    examDate: string | null;
    minutesPerDay: number;
    studyDays: number[];
    level: PreparationLevel;
    hasAccess: boolean;
    isFree: boolean;
    selectedTrackId: string | null;
    vertical: {
      slug: string;
      name: string;
      themeKey: string;
      essay: boolean;
      syllabus: boolean;
      gamification: boolean;
    };
  }>;
  themeStyle: CSSProperties;
};

export function defaultPreparationContext(): ActivePreparationContext {
  return {
    active: null,
    preparations: [],
    themeStyle: educationThemeStyle("vestibular"),
  };
}

let preparationSchemaAvailable: boolean | null = null;

async function hasPreparationSchema() {
  if (preparationSchemaAvailable !== null) return preparationSchemaAvailable;

  try {
    const rows = await db.$queryRaw<Array<{ ready: boolean }>>`
      SELECT
        to_regclass('public."Vertical"') IS NOT NULL
        AND to_regclass('public."Preparation"') IS NOT NULL
        AND to_regclass('public."UserPreparation"') IS NOT NULL
        AND to_regclass('public."Entitlement"') IS NOT NULL
        AS ready
    `;
    preparationSchemaAvailable = Boolean(rows[0]?.ready);
  } catch {
    preparationSchemaAvailable = false;
  }

  return preparationSchemaAvailable;
}

function isMissingPreparationSchema(error: unknown) {
  if (typeof error !== "object" || error === null || !("code" in error)) return false;

  const code = (error as { code?: unknown }).code;
  if (code !== "P2021" && code !== "P2022") return false;

  const meta = (error as { meta?: Record<string, unknown> }).meta;
  const detail = [
    meta?.modelName,
    meta?.table,
    meta?.column,
  ]
    .filter(Boolean)
    .join(" ");

  return /Vertical|Preparation|UserPreparation|Entitlement|activePreparationId|userPreparationId|preparationId/.test(
    detail,
  );
}

const verticalSlugByExam = new Map<string, EducationVerticalSlug>([
  ["enem", "vestibular"],
  ["fuvest", "vestibular"],
  ["unesp", "vestibular"],
  ["unicamp", "vestibular"],
  ["fatec", "vestibular"],
  ["etec", "vestibular"],
  ["provao-paulista", "vestibular"],
  ["oab", "oab"],
  ["oab-1-fase", "oab"],
  ["oab-2-fase", "oab"],
  ["concurso-publico", "concursos"],
  ["concursos-publicos", "concursos"],
  ["policia-civil", "policia-civil"],
  ["pc-sp", "policia-civil"],
  ["pc-mg", "policia-civil"],
  ["pc-pr", "policia-civil"],
  ["policia-militar", "policia-militar"],
  ["pm-sp", "policia-militar"],
  ["pm-mg", "policia-militar"],
  ["pm-pr", "policia-militar"],
  ["carreiras-militares", "militares"],
  ["esa", "militares"],
  ["espcex", "militares"],
]);

const fallbackPreparationSeed = [
  {
    slug: "enem-2027",
    name: "ENEM 2027",
    verticalSlug: "vestibular",
    examSlug: "enem",
    description: "Trilha completa para o ENEM com plano, questoes, redacao e simulados.",
    isFree: true,
  },
  {
    slug: "fuvest-2027",
    name: "FUVEST 2027",
    verticalSlug: "vestibular",
    examSlug: "fuvest",
    description: "Preparacao para primeira e segunda fase da FUVEST.",
    isFree: false,
  },
  {
    slug: "medicina-enem",
    name: "Medicina pelo ENEM",
    verticalSlug: "medicina",
    examSlug: "medicina-enem",
    description: "Rota de alta concorrencia com dados, revisoes e simulados.",
    isFree: false,
  },
  {
    slug: "oab-1-fase",
    name: "OAB 1a fase",
    verticalSlug: "oab",
    examSlug: "oab-1-fase",
    description: "Disciplinas juridicas, questoes e revisao objetiva para a OAB.",
    isFree: true,
  },
  {
    slug: "tj-sp-escrevente",
    name: "TJ-SP Escrevente",
    verticalSlug: "concursos",
    examSlug: "concursos-publicos",
    description: "Plano por edital para portugues, direito, informatica e raciocinio logico.",
    isFree: false,
  },
  {
    slug: "policia-civil-sp",
    name: "PC-SP Investigador",
    verticalSlug: "policia-civil",
    examSlug: "policia-civil",
    description: "Preparacao por cargo com foco em edital, questoes e evolucao.",
    isFree: false,
  },
  {
    slug: "pm-sp-soldado",
    name: "PM-SP Soldado",
    verticalSlug: "policia-militar",
    examSlug: "policia-militar",
    description: "Missao diaria com foco em disciplina, questoes e constancia.",
    isFree: false,
  },
  {
    slug: "esa-2027",
    name: "ESA 2027",
    verticalSlug: "militares",
    examSlug: "esa",
    description: "Base e aprofundamento para carreiras militares.",
    isFree: false,
  },
] as const;

export function getFallbackPreparationCatalog() {
  return fallbackPreparationSeed.map((item) => {
    const vertical = getEducationVertical(item.verticalSlug);
    return {
      id: item.slug,
      slug: item.slug,
      name: item.name,
      description: item.description,
      examSlug: item.examSlug,
      isFree: item.isFree,
      vertical: {
        slug: item.verticalSlug,
        name: vertical.name,
        themeKey: vertical.theme,
      },
    };
  });
}

function safeStudyDays(value: unknown) {
  if (!Array.isArray(value)) return [1, 2, 3, 4, 5];
  const days = value
    .filter((day): day is number => Number.isInteger(day) && day >= 0 && day <= 6)
    .sort((a, b) => a - b);
  return days.length ? Array.from(new Set(days)) : [1, 2, 3, 4, 5];
}

function verticalFeatures(slug: string) {
  const vertical = getEducationVertical(slug);
  return {
    essay: vertical.essay,
    syllabus: vertical.syllabus,
    gamification: vertical.gamification,
  };
}

function serializePreparation(item: Awaited<ReturnType<typeof fetchPreparationRows>>[number], entitlementIds: Set<string>) {
  const vertical = item.preparation.vertical;
  const features = verticalFeatures(vertical.slug);
  return {
    id: item.preparation.id,
    userPreparationId: item.id,
    slug: item.preparation.slug,
    name: item.preparation.name,
    displayName: item.displayName ?? item.preparation.name,
    description: item.preparation.description,
    examSlug: item.preparation.examSlug,
    examDate: item.examDate?.toISOString() ?? item.preparation.defaultExamDate?.toISOString() ?? null,
    minutesPerDay: item.minutesPerDay,
    studyDays: safeStudyDays(item.studyDays),
    level: item.level,
    hasAccess: item.preparation.isFree || entitlementIds.has(item.preparation.id),
    isFree: item.preparation.isFree,
    selectedTrackId: item.selectedTrackId,
    vertical: {
      slug: vertical.slug,
      name: vertical.name,
      themeKey: vertical.themeKey,
      ...features,
    },
  };
}

async function fetchPreparationRows(userId: string) {
  return db.userPreparation.findMany({
    where: { userId, status: "ACTIVE" },
    orderBy: [{ updatedAt: "desc" }],
    include: {
      preparation: {
        include: { vertical: true },
      },
    },
  });
}

export async function ensureEducationCatalog() {
  const verticals = await Promise.all(
    Object.entries(educationVerticals).map(([slug, vertical]) =>
      db.vertical.upsert({
        where: { slug },
        update: { name: vertical.name, themeKey: vertical.theme, enabled: true },
        create: { slug, name: vertical.name, themeKey: vertical.theme },
      }),
    ),
  );
  const verticalBySlug = new Map(verticals.map((vertical) => [vertical.slug, vertical]));

  await Promise.all(
    fallbackPreparationSeed.map((item) => {
      const vertical = verticalBySlug.get(item.verticalSlug);
      if (!vertical) throw new Error(`Vertical nao encontrada: ${item.verticalSlug}`);
      return db.preparation.upsert({
        where: { slug: item.slug },
        update: {
          verticalId: vertical.id,
          name: item.name,
          description: item.description,
          examSlug: item.examSlug,
          status: ContentStatus.PUBLISHED,
          isFree: item.isFree,
        },
        create: {
          verticalId: vertical.id,
          slug: item.slug,
          name: item.name,
          description: item.description,
          examSlug: item.examSlug,
          status: ContentStatus.PUBLISHED,
          isFree: item.isFree,
        },
      });
    }),
  );
}

export function inferVerticalSlug(input: {
  exams?: string[];
  course?: string;
}): EducationVerticalSlug {
  const joined = [...(input.exams ?? []), input.course ?? ""]
    .join(" ")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  if (joined.includes("medicina")) return "medicina";
  if (joined.includes("oab")) return "oab";
  if (joined.includes("policia civil") || joined.includes("pc-") || joined.includes("investigador")) {
    return "policia-civil";
  }
  if (joined.includes("policia militar") || joined.includes("pm-") || joined.includes("soldado")) {
    return "policia-militar";
  }
  if (joined.includes("militar") || joined.includes("esa") || joined.includes("espcex")) return "militares";
  if (joined.includes("concurso") || joined.includes("tj-")) return "concursos";
  if (joined.includes("etec") || joined.includes("fatec")) return "vestibular";

  const firstExam = (input.exams?.[0] ?? "enem")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, "-");
  return verticalSlugByExam.get(firstExam) ?? "vestibular";
}

export function preparationSlugForOnboarding(input: {
  exams: string[];
  course: string;
}) {
  const firstExam = (input.exams[0] ?? "ENEM")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const course = input.course
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  if (course.includes("medicina")) return firstExam === "enem" ? "medicina-enem" : `medicina-${firstExam}`;
  if (firstExam.includes("oab") && (firstExam.includes("2") || firstExam.includes("segunda"))) return "oab-2-fase";
  if (firstExam.includes("oab")) return "oab-1-fase";
  if (firstExam.includes("policia-militar") || firstExam.includes("pm-")) return "pm-sp-soldado";
  if (firstExam.includes("policia") || firstExam.includes("pc-")) return "policia-civil-sp";
  if (firstExam.includes("carreiras-militares") || firstExam.includes("esa")) return "esa-2027";
  if (firstExam.includes("espcex")) return "espcex";
  if (firstExam.includes("eear")) return "eear";
  if (firstExam.includes("concurso")) return "tj-sp-escrevente";
  if (firstExam === "enem") return "enem-2027";
  if (firstExam === "fuvest") return "fuvest-2027";
  if (firstExam === "etec") return "etec";
  if (firstExam === "fatec") return "fatec";
  return firstExam || "enem-2027";
}

export async function findOrCreatePreparation(input: {
  exams: string[];
  course: string;
  examDate?: Date | null;
}) {
  await ensureEducationCatalog();

  const slug = preparationSlugForOnboarding(input);
  const verticalSlug = inferVerticalSlug(input);
  const vertical = await db.vertical.upsert({
    where: { slug: verticalSlug },
    update: { enabled: true },
    create: {
      slug: verticalSlug,
      name: getEducationVertical(verticalSlug).name,
      themeKey: getEducationVertical(verticalSlug).theme,
    },
  });

  const nameBase = input.course.trim().toLowerCase().includes("medicina")
    ? `Medicina ${input.exams[0] ?? "ENEM"}`
    : input.exams[0] ?? "ENEM";
  const name = slug.match(/-\d{4}$/) ? `${nameBase} 2027` : nameBase;

  return db.preparation.upsert({
    where: { slug },
    update: {
      verticalId: vertical.id,
      name,
      examSlug: slug.replace(/-\d{4}$/, ""),
      defaultExamDate: input.examDate ?? undefined,
      status: ContentStatus.PUBLISHED,
    },
    create: {
      verticalId: vertical.id,
      slug,
      name,
      description: `Preparacao personalizada para ${name}.`,
      examSlug: slug.replace(/-\d{4}$/, ""),
      defaultExamDate: input.examDate ?? null,
      status: ContentStatus.PUBLISHED,
      isFree: slug === "enem-2027" || slug === "oab-1-fase",
    },
  });
}

export async function upsertUserPreparation(input: {
  userId: string;
  preparationId: string;
  displayName?: string;
  examDate?: Date | null;
  minutesPerDay?: number;
  studyDays?: number[];
  difficultSubjects?: string[];
  level?: PreparationLevel;
  experience?: string | null;
}) {
  const membership = await db.userPreparation.upsert({
    where: {
      userId_preparationId: {
        userId: input.userId,
        preparationId: input.preparationId,
      },
    },
    update: {
      displayName: input.displayName,
      examDate: input.examDate,
      minutesPerDay: input.minutesPerDay,
      studyDays: input.studyDays ?? undefined,
      difficultSubjects: input.difficultSubjects ?? undefined,
      level: input.level,
      experience: input.experience,
      status: "ACTIVE",
    },
    create: {
      userId: input.userId,
      preparationId: input.preparationId,
      displayName: input.displayName,
      examDate: input.examDate,
      minutesPerDay: input.minutesPerDay ?? 90,
      studyDays: input.studyDays ?? [1, 2, 3, 4, 5],
      difficultSubjects: input.difficultSubjects ?? [],
      level: input.level ?? PreparationLevel.BEGINNER,
      experience: input.experience,
    },
  });

  await db.user.update({
    where: { id: input.userId },
    data: { activePreparationId: input.preparationId },
  });

  const preparation = await db.preparation.findUnique({
    where: { id: input.preparationId },
    select: { isFree: true },
  });

  if (preparation?.isFree) {
    await db.entitlement.upsert({
      where: {
        userId_preparationId_sourceKey: {
          userId: input.userId,
          preparationId: input.preparationId,
          sourceKey: `free:${input.preparationId}`,
        },
      },
      update: { revokedAt: null },
      create: {
        userId: input.userId,
        preparationId: input.preparationId,
        sourceType: EntitlementSource.PROMOTION,
        sourceKey: `free:${input.preparationId}`,
      },
    });
  }

  return membership;
}

export const getActivePreparationContext = cache(async (userId: string): Promise<ActivePreparationContext> => {
  try {
    if (!(await hasPreparationSchema())) return defaultPreparationContext();

    await ensureEducationCatalog();

    const [user, rows, entitlements] = await Promise.all([
      db.user.findUnique({ where: { id: userId }, select: { activePreparationId: true } }),
      fetchPreparationRows(userId),
      db.entitlement.findMany({
        where: {
          userId,
          revokedAt: null,
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
          preparationId: { not: null },
        },
        select: { preparationId: true },
      }),
    ]);

    let memberships = rows;
    if (memberships.length === 0) {
      const fallback = await db.preparation.findFirst({
        where: { slug: "enem-2027" },
        select: { id: true },
      });
      if (fallback) {
        await upsertUserPreparation({
          userId,
          preparationId: fallback.id,
          displayName: "ENEM 2027",
        });
        memberships = await fetchPreparationRows(userId);
      }
    }

    const entitlementIds = new Set(
      entitlements
        .map((entitlement) => entitlement.preparationId)
        .filter((preparationId): preparationId is string => Boolean(preparationId)),
    );
    const preparations = memberships.map((item) => serializePreparation(item, entitlementIds));
    const active =
      preparations.find((item) => item.id === user?.activePreparationId) ??
      preparations[0] ??
      null;

    return {
      active,
      preparations,
      themeStyle: educationThemeStyle(active?.vertical.slug),
    };
  } catch (error) {
    if (isMissingPreparationSchema(error)) {
      preparationSchemaAvailable = false;
      console.warn("Catalogo de preparacoes indisponivel; usando contexto padrao.", error);
      return defaultPreparationContext();
    }

    throw error;
  }
});
