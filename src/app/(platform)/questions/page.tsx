import { Difficulty, Prisma } from "@prisma/client";
import { PageHeader } from "@/components/page-header";
import { QuestionPractice } from "@/components/question-practice";
import { VestibularPicker } from "@/components/vestibular-picker";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { parseJson } from "@/lib/utils";

export default async function QuestionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const vestibular = typeof params.vestibular === "string" ? params.vestibular : undefined;
  const subject = typeof params.subject === "string" ? params.subject : undefined;
  const difficulty = typeof params.difficulty === "string" ? params.difficulty : undefined;
  const mode = typeof params.mode === "string" ? params.mode : undefined;
  const selectedQuestionId = typeof params.question === "string" ? params.question : undefined;
  const allMode = params.all === "true";

  const vestibularRecords = await db.vestibular.findMany({
    include: {
      questions: {
        where: { status: "PUBLISHED" },
        select: { subjectId: true },
      },
    },
    orderBy: { name: "asc" },
  });

  const selectedVestibular = vestibular
    ? vestibularRecords.find((item) => item.id === vestibular || item.slug === vestibular)
    : null;

  if (!allMode && !vestibular && mode !== "errors" && !selectedQuestionId) {
    return (
      <div>
        <PageHeader
          eyebrow="Banco de questões"
          title="Escolha seu vestibular"
          description="Comece por ENEM, ETEC, FATEC, FUVEST, UNESP ou UNICAMP. Cada card abre a lista de questões com a identidade visual da prova."
        />
        <VestibularPicker
          vestibulares={vestibularRecords.map((item) => ({
            id: item.id,
            slug: item.slug,
            name: item.name,
            color: item.color,
            description: item.description,
            questionCount: item.questions.length,
            subjectCount: new Set(item.questions.map((question) => question.subjectId)).size,
          }))}
        />
      </div>
    );
  }

  const where: Prisma.QuestionWhereInput = {
    status: "PUBLISHED",
    ...(selectedVestibular ? { vestibularId: selectedVestibular.id } : {}),
    ...(subject ? { subjectId: subject } : {}),
    ...(difficulty &&
    [Difficulty.EASY, Difficulty.MEDIUM, Difficulty.HARD].includes(difficulty as Difficulty)
      ? { difficulty: difficulty as Difficulty }
      : {}),
  };

  if (mode === "errors") {
    const wrongAttempts = await db.questionAttempt.findMany({
      where: { userId: user.id, correct: false, reviewed: false },
      select: { questionId: true },
    });
    where.id = { in: Array.from(new Set(wrongAttempts.map((attempt) => attempt.questionId))) };
  }

  const [questions, vestibulares, subjects] = await Promise.all([
    db.question.findMany({
      where,
      include: {
        subject: true,
        topic: true,
        vestibular: true,
      },
      orderBy: [{ year: "desc" }, { createdAt: "desc" }],
    }),
    Promise.resolve(vestibularRecords),
    db.subject.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div>
      <PageHeader
        eyebrow="Banco de questoes"
        title={selectedVestibular ? `Questões ${selectedVestibular.name}` : "Pratique com foco"}
        description="Filtre por vestibular, matéria, dificuldade e revise erros. Cada resposta alimenta seu plano inteligente."
      />

      <QuestionPractice
        selectedQuestionId={selectedQuestionId}
        errorMode={mode === "errors"}
        questions={questions.map((question) => ({
          ...question,
          alternatives: parseJson<Array<{ key: string; text: string }>>(
            question.alternatives,
            [],
          ),
        }))}
        vestibulares={vestibulares.map((item) => ({ id: item.id, name: item.name }))}
        subjects={subjects.map((item) => ({ id: item.id, name: item.name }))}
      />
    </div>
  );
}
