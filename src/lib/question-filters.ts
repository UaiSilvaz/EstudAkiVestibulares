import { Difficulty, type Prisma } from "@prisma/client";

export type QuestionSearchParams = Record<string, string | string[] | undefined>;

export type QuestionFilters = {
  vestibular?: string;
  subject?: string;
  topic?: string;
  year?: number;
  day?: string;
  area?: string;
  difficulty?: Difficulty;
  mode?: string;
  scope?: string;
  query: string;
};

export type QuestionSubjectContext = {
  id: string;
  name: string;
  slug: string;
};

const SPECIFIC_SUBJECT_FALLBACKS = [
  {
    keys: ["quimica"],
    broadSubjectSlugs: ["natureza", "ciencias-da-natureza"],
    terms: [
      "quim",
      "molecul",
      "reacao",
      "reagente",
      "produto",
      "estequiometr",
      "solucao",
      "concentracao",
      "acido",
      "base",
      "oxid",
      "reduc",
      "corros",
      "metal",
      "ion",
      "pilha",
      "eletrol",
      "polim",
      "carbono",
      "hidrocarbon",
      "organica",
    ],
  },
  {
    keys: ["fisica"],
    broadSubjectSlugs: ["natureza", "ciencias-da-natureza"],
    terms: [
      "fisic",
      "forca",
      "energia",
      "velocidade",
      "aceleracao",
      "movimento",
      "potencia",
      "corrente",
      "tensao",
      "resistencia",
      "circuito",
      "onda",
      "frequencia",
      "luz",
      "calor",
      "temperatura",
      "pressao",
      "densidade",
      "radiacao",
    ],
  },
  {
    keys: ["biologia"],
    broadSubjectSlugs: ["natureza", "ciencias-da-natureza"],
    terms: [
      "biolog",
      "celul",
      "organismo",
      "especie",
      "ecolog",
      "gen",
      "dna",
      "hereditar",
      "metabolism",
      "enzima",
      "respiracao",
      "fotossintese",
      "bacteria",
      "virus",
      "saude",
      "vacina",
      "membrana",
      "vacuolo",
      "vegetal",
      "animal",
    ],
  },
] as const;

const AREA_BY_CODE: Record<string, string> = {
  LC: "Linguagens, Códigos e suas Tecnologias",
  CH: "Ciências Humanas e suas Tecnologias",
  CN: "Ciências da Natureza e suas Tecnologias",
  MT: "Matemática e suas Tecnologias",
};

function first(value: string | string[] | undefined) {
  const candidate = Array.isArray(value) ? value[0] : value;
  const trimmed = candidate?.trim();
  return trimmed || undefined;
}

function normalize(value: string | undefined) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function containsInsensitive(term: string) {
  return { contains: term, mode: "insensitive" as const };
}

function selectedSubjectWhere(
  subjectId: string | undefined,
  subjectContext: QuestionSubjectContext | null | undefined,
): Prisma.QuestionWhereInput | null {
  if (!subjectId) return null;

  const direct: Prisma.QuestionWhereInput = { subjectId };
  const normalized = normalize(`${subjectContext?.slug ?? ""} ${subjectContext?.name ?? ""}`);
  const fallback = SPECIFIC_SUBJECT_FALLBACKS.find((rule) =>
    rule.keys.some((key) => normalized.includes(key)),
  );

  if (!fallback) return direct;

  const termMatches: Prisma.QuestionWhereInput[] = fallback.terms.flatMap((term) => [
    { statement: containsInsensitive(term) },
    { supportText: containsInsensitive(term) },
    { tags: containsInsensitive(term) },
    { topic: { is: { name: containsInsensitive(term) } } },
    {
      pedagogicalMetadata: {
        is: {
          OR: [
            { disciplinaryComponent: containsInsensitive(term) },
            { knowledgeArea: containsInsensitive(term) },
          ],
        },
      },
    },
  ]);

  return {
    OR: [
      direct,
      {
        AND: [
          { subject: { is: { slug: { in: [...fallback.broadSubjectSlugs] } } } },
          { OR: termMatches },
        ],
      },
    ],
  };
}

export function normalizeQuestionDay(value: string | undefined) {
  if (!value) return undefined;
  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  if (["1", "1o", "1-dia", "1o-dia", "dia-1", "primeiro", "primeiro-dia"].includes(normalized)) return "1º dia";
  if (["2", "2o", "2-dia", "2o-dia", "dia-2", "segundo", "segundo-dia"].includes(normalized)) return "2º dia";
  return value;
}

export function normalizeKnowledgeArea(value: string | undefined) {
  if (!value) return undefined;
  return AREA_BY_CODE[value.toUpperCase()] ?? value;
}

export function parseQuestionFilters(params: QuestionSearchParams): QuestionFilters {
  const rawYear = first(params.year);
  const year = rawYear ? Number(rawYear) : undefined;
  const rawDifficulty = first(params.difficulty);
  return {
    vestibular: first(params.vestibular),
    subject: first(params.subject),
    // `topic` é o parâmetro histórico. `content` é um alias legível para links externos.
    topic: first(params.topic) ?? first(params.content),
    year: Number.isInteger(year) && year && year > 0 ? year : undefined,
    day: normalizeQuestionDay(first(params.day)),
    area: normalizeKnowledgeArea(first(params.area)),
    difficulty:
      rawDifficulty &&
      [Difficulty.EASY, Difficulty.MEDIUM, Difficulty.HARD].includes(rawDifficulty as Difficulty)
        ? (rawDifficulty as Difficulty)
        : undefined,
    mode: first(params.mode),
    scope: first(params.scope),
    query: first(params.q) ?? "",
  };
}

export function buildPublishedQuestionWhere(
  filters: QuestionFilters,
  selectedVestibularId?: string,
  subjectContext?: QuestionSubjectContext | null,
): Prisma.QuestionWhereInput {
  const and: Prisma.QuestionWhereInput[] = [
    { status: "PUBLISHED" },
    { reviewState: "APPROVED" },
  ];
  const subjectWhere = selectedSubjectWhere(filters.subject, subjectContext);

  if (selectedVestibularId) and.push({ vestibularId: selectedVestibularId });
  if (subjectWhere) and.push(subjectWhere);
  if (filters.topic) and.push({ topicId: filters.topic });
  if (filters.year) and.push({ year: filters.year });
  if (filters.day) and.push({ day: filters.day });
  if (filters.area) and.push({ pedagogicalMetadata: { is: { knowledgeArea: filters.area } } });
  if (filters.difficulty) and.push({ difficulty: filters.difficulty });
  if (filters.query) {
    and.push({
      OR: [
        { statement: { contains: filters.query, mode: "insensitive" } },
        { supportText: { contains: filters.query, mode: "insensitive" } },
        { tags: { contains: filters.query, mode: "insensitive" } },
      ],
    });
  }

  return {
    AND: and,
  };
}

export function knowledgeAreaLabel(area: string) {
  return Object.entries(AREA_BY_CODE).find(([, name]) => name === area)?.[0] ?? area;
}
