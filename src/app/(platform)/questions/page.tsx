import { Prisma, type Vestibular } from "@prisma/client";
import { PageHeader } from "@/components/page-header";
import { QuestionPractice } from "@/components/question-practice";
import { VestibularPicker } from "@/components/vestibular-picker";
import { getPersistedUserId, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { localVestibulares } from "@/lib/local-exams";
import {
  buildPublishedQuestionWhere,
  knowledgeAreaLabel,
  parseQuestionFilters,
} from "@/lib/question-filters";
import { toStudentQuestion } from "@/lib/student-question";

type QuestionWithRelations = Prisma.QuestionGetPayload<{
  include: {
    subject: true;
    topic: true;
    vestibular: true;
    pedagogicalMetadata: { select: { knowledgeArea: true } };
  };
}>;

export default async function QuestionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const persistedUserId = await getPersistedUserId(user);
  const params = await searchParams;
  const filters = parseQuestionFilters(params);
  const { vestibular, subject, mode, scope } = filters;
  const requestedCount = typeof params.count === "string" ? Number(params.count) : 10;
  const selectedQuestionId = typeof params.question === "string" ? params.question : undefined;
  const query = filters.query;
  const page = Math.max(1, typeof params.page === "string" ? Number(params.page) || 1 : 1);
  const pageSize = Math.min(50, Math.max(10, Number.isFinite(requestedCount) ? requestedCount : 20));

  let vestibularRecords: Vestibular[] = [];

  try {
    vestibularRecords = await db.vestibular.findMany({
      orderBy: { name: "asc" },
    });
  } catch {
    const now = new Date();
    vestibularRecords = localVestibulares.map((item) => ({
      ...item,
      logo: null,
      weightMap: "{}",
      createdAt: now,
      updatedAt: now,
    }));
  }

  const selectedVestibular = vestibular
    ? vestibularRecords.find((item) => item.id === vestibular || item.slug === vestibular) ?? null
    : null;

  if (!selectedVestibular) {
    const publishedWhere = {
      status: "PUBLISHED" as const,
      reviewState: "APPROVED" as const,
    };
    const [questionCounts, subjectPairs] = await db.$transaction([
      db.question
        .groupBy({
          by: ["vestibularId"],
          where: publishedWhere,
          orderBy: { vestibularId: "asc" },
          _count: { id: true },
        }),
      db.question
        .findMany({
          where: publishedWhere,
          distinct: ["vestibularId", "subjectId"],
          select: { vestibularId: true, subjectId: true },
        }),
    ]).catch(() => [[], []] as const);
    const questionCountByVestibular = new Map(
      questionCounts.map((item) => {
        const count = item._count as { id?: number } | undefined;
        return [item.vestibularId, count?.id ?? 0] as const;
      }),
    );
    const subjectsByVestibular = new Map<string, Set<string>>();
    for (const item of subjectPairs) {
      const current = subjectsByVestibular.get(item.vestibularId) ?? new Set<string>();
      current.add(item.subjectId);
      subjectsByVestibular.set(item.vestibularId, current);
    }
    const vestibularCards = vestibularRecords.map((item) => ({
      id: item.id,
      slug: item.slug,
      name: item.name,
      color: item.color,
      description: item.description,
      questionCount: questionCountByVestibular.get(item.id) ?? 0,
      subjectCount: subjectsByVestibular.get(item.id)?.size ?? 0,
    }));

    return (
      <div>
        <PageHeader
          eyebrow="Banco de questões"
          title="Escolha seu vestibular"
          description="Selecione uma prova para abrir o banco de questões com filtros por ano, matéria, conteúdo e dificuldade."
        />
        <VestibularPicker vestibulares={vestibularCards} />
      </div>
    );
  }

  const selectedSubject = subject
    ? await db.subject
        .findFirst({
          where: { OR: [{ id: subject }, { slug: subject }] },
          select: { id: true, name: true, slug: true },
        })
        .catch(() => null)
    : null;
  const effectiveFilters = selectedSubject ? { ...filters, subject: selectedSubject.id } : filters;
  const where = buildPublishedQuestionWhere(effectiveFilters, selectedVestibular?.id, selectedSubject);

  if (mode === "errors" || scope === "errors") {
    const wrongAttempts = persistedUserId
      ? await db.questionAttempt
          .findMany({
            where: {
              userId: persistedUserId,
              correct: false,
              annulled: false,
              reviewed: false,
            },
            select: { questionId: true },
          })
          .catch(() => [])
      : [];
    where.id = { in: Array.from(new Set(wrongAttempts.map((attempt) => attempt.questionId))) };
  } else if (scope === "favorites") {
    const favorites = persistedUserId
      ? await db.questionFavorite
          .findMany({
            where: { userId: persistedUserId },
            select: { questionId: true },
          })
          .catch(() => [])
      : [];
    where.id = { in: favorites.map((favorite) => favorite.questionId) };
  } else if (scope === "unanswered") {
    const answered = persistedUserId
      ? await db.questionAttempt
          .findMany({
            where: { userId: persistedUserId },
            distinct: ["questionId"],
            select: { questionId: true },
          })
          .catch(() => [])
      : [];
    where.id = { notIn: answered.map((attempt) => attempt.questionId) };
  } else if (selectedQuestionId) {
    where.id = selectedQuestionId;
  } else if (persistedUserId) {
    const answered = await db.questionAttempt
      .findMany({
        where: { userId: persistedUserId },
        distinct: ["questionId"],
        select: { questionId: true },
      })
      .catch(() => []);
    where.id = { notIn: answered.map((attempt) => attempt.questionId) };
  }

  let questions: QuestionWithRelations[] = [];
  let subjects: Array<{ id: string; name: string }> = [];
  let topics: Array<{ id: string; name: string; subjectId: string }> = [];
  let years: number[] = [];
  let days: string[] = [];
  let areas: Array<{ value: string; label: string }> = [];
  let totalQuestions = 0;
  let favoriteIds: string[] = [];
  let answeredIds: string[] = [];

  try {
    const loaded = await db.$transaction(async (tx) => {
      const questionRows = await tx.question.findMany({
          where,
          include: {
            subject: true,
            topic: true,
            vestibular: true,
            pedagogicalMetadata: { select: { knowledgeArea: true } },
          },
          orderBy: [{ year: "desc" }, { createdAt: "desc" }],
          skip: (page - 1) * pageSize,
          take: pageSize,
        });
      const subjectRows = await tx.subject.findMany({
          where: {
            questions: {
              some: {
                status: "PUBLISHED",
                reviewState: "APPROVED",
                ...(selectedVestibular ? { vestibularId: selectedVestibular.id } : {}),
              },
            },
          },
          orderBy: { name: "asc" },
          select: { id: true, name: true },
        });
      const topicRows = await tx.topic.findMany({
          where: {
            questions: {
              some: {
                status: "PUBLISHED",
                reviewState: "APPROVED",
                ...(selectedVestibular ? { vestibularId: selectedVestibular.id } : {}),
                ...(effectiveFilters.subject ? { subjectId: effectiveFilters.subject } : {}),
              },
            },
          },
          orderBy: { name: "asc" },
          select: { id: true, name: true, subjectId: true },
        });
      const yearRows = await tx.question.findMany({
          where: {
            status: "PUBLISHED",
            reviewState: "APPROVED",
            ...(selectedVestibular ? { vestibularId: selectedVestibular.id } : {}),
          },
          distinct: ["year"],
          select: { year: true },
          orderBy: { year: "desc" },
        });
      const dayRows = await tx.question.findMany({
          where: {
            status: "PUBLISHED",
            reviewState: "APPROVED",
            day: { not: null },
            ...(selectedVestibular ? { vestibularId: selectedVestibular.id } : {}),
          },
          distinct: ["day"],
          select: { day: true },
          orderBy: { day: "asc" },
        });
      const areaRows = await tx.questionPedagogicalMetadata.findMany({
          where: {
            knowledgeArea: { not: null },
            question: {
              status: "PUBLISHED",
              reviewState: "APPROVED",
              ...(selectedVestibular ? { vestibularId: selectedVestibular.id } : {}),
            },
          },
          distinct: ["knowledgeArea"],
          select: { knowledgeArea: true },
          orderBy: { knowledgeArea: "asc" },
        });
      const total = await tx.question.count({ where });

      return {
        questions: questionRows,
        subjects: subjectRows,
        topics: topicRows,
        years: yearRows.map((item) => item.year),
        days: dayRows.flatMap((item) => (item.day ? [item.day] : [])),
        areas: areaRows.flatMap((item) =>
            item.knowledgeArea
              ? [{ value: item.knowledgeArea, label: knowledgeAreaLabel(item.knowledgeArea) }]
              : [],
          ),
        totalQuestions: total,
      };
    });
    questions = loaded.questions;
    subjects = loaded.subjects;
    topics = loaded.topics;
    years = loaded.years;
    days = loaded.days;
    areas = loaded.areas;
    totalQuestions = loaded.totalQuestions;
    favoriteIds = persistedUserId
      ? await db.questionFavorite
          .findMany({
            where: { userId: persistedUserId },
            select: { questionId: true },
          })
          .then((items) => items.map((item) => item.questionId))
          .catch(() => [])
      : [];
    answeredIds = persistedUserId
      ? await db.questionAttempt
          .findMany({
            where: {
              userId: persistedUserId,
              questionId: { in: questions.map((question) => question.id) },
            },
            distinct: ["questionId"],
            select: { questionId: true },
          })
          .then((items) => items.map((item) => item.questionId))
          .catch(() => [])
      : [];
  } catch {
    questions = [];
    subjects = [];
    topics = [];
    years = [];
    days = [];
    areas = [];
    answeredIds = [];
  }

  return (
    <div>
      <div className="hidden lg:block">
        <PageHeader
          eyebrow="Banco de questões"
          title={`Questões ${selectedVestibular.name}`}
          description="Entre direto no banco, filtre por ano, dia, matéria, conteúdo, área e dificuldade, e responda sem etapa de montagem de lista."
        />
      </div>

      <QuestionPractice
        selectedQuestionId={selectedQuestionId}
        selectedVestibularId={selectedVestibular?.id}
        selectedVestibularName={selectedVestibular?.name}
        contextualVestibular={Boolean(selectedVestibular)}
        errorMode={mode === "errors" || scope === "errors"}
        initialSearch={query}
        initialDay={filters.day}
        initialArea={filters.area}
        pagination={{
          page,
          pages: Math.max(1, Math.ceil(totalQuestions / pageSize)),
          total: totalQuestions,
          pageSize,
        }}
        favoriteIds={favoriteIds}
        answeredIds={answeredIds}
        questions={questions.map(toStudentQuestion)}
        vestibulares={vestibularRecords.map((item) => ({ id: item.id, name: item.name }))}
        subjects={subjects.map((item) => ({ id: item.id, name: item.name }))}
        topics={topics.map((item) => ({ id: item.id, name: item.name, subjectId: item.subjectId }))}
        years={years}
        days={days}
        areas={areas}
      />
    </div>
  );
}
