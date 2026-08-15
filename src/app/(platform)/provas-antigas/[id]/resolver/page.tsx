import { ArrowLeft, BookOpenText, Languages, TimerReset } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { OldExamProofWorkspace } from "@/components/old-exam-proof-workspace";
import { PageHeader } from "@/components/page-header";
import { QuestionPractice } from "@/components/question-practice";
import { getPersistedUserId, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { oldExamLanguageLabel } from "@/lib/old-exam-language";
import { toOldExamProofQuestion } from "@/lib/old-exam-proof";
import { loadStudentOldExam, requestedOldExamLanguage } from "@/lib/old-exam-student";

export default async function ResolveOldExamPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ idioma?: string | string[]; modo?: string | string[] }>;
}) {
  const user = await requireUser();
  const persistedUserId = await getPersistedUserId(user);
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const result = await loadStudentOldExam(id, requestedOldExamLanguage(query.idioma));
  if (!result) notFound();
  const { exam, questions, availableLanguages, selectedLanguage } = result;
  const rawMode = Array.isArray(query.modo) ? query.modo[0] : query.modo;
  const mode = rawMode === "prova" ? "prova" : "estudo";
  const subjectMap = new Map(
    questions.map((question) => [
      question.subject.id,
      { id: question.subject.id, name: question.subject.name },
    ]),
  );
  const topicMap = new Map(
    questions
      .filter((question) => question.topic)
      .map((question) => [
        question.topic!.id,
        {
          id: question.topic!.id,
          name: question.topic!.name,
          subjectId: question.topic!.subjectId,
        },
      ]),
  );
  const favoriteIds = mode === "estudo" && persistedUserId
    ? await db.questionFavorite
        .findMany({
          where: {
            userId: persistedUserId,
            questionId: { in: questions.map((question) => question.id) },
          },
          select: { questionId: true },
        })
        .then((items) => items.map((item) => item.questionId))
    : [];

  return (
    <div>
      <div className="mb-4">
        <Link href={`/provas-antigas/${exam.id}`} className="estudaki-button estudaki-button-ghost">
          <ArrowLeft className="h-4 w-4" />Voltar para a prova
        </Link>
      </div>
      <PageHeader
        eyebrow={`${exam.vestibular} · ${exam.ano} · ${exam.dia ?? "dia único"}`}
        title={`Resolver ${exam.titulo}`}
        description={`${questions.length} questão(ões) publicadas e revisadas disponíveis nesta prova.`}
      />
      <nav className="mb-5 grid gap-2 rounded-[24px] border border-slate-200 bg-white p-2 shadow-sm sm:grid-cols-2" aria-label="Modo de resolução">
        <Link
          href={`/provas-antigas/${exam.id}/resolver?modo=estudo${selectedLanguage ? `&idioma=${selectedLanguage}` : ""}`}
          aria-current={mode === "estudo" ? "page" : undefined}
          className={`flex items-start gap-3 rounded-[18px] p-4 transition ${
            mode === "estudo" ? "bg-blue-600 text-white shadow-md" : "bg-slate-50 text-slate-700 hover:bg-blue-50"
          }`}
        >
          <BookOpenText className="mt-0.5 h-5 w-5 shrink-0" />
          <span><strong className="block">Modo estudo</strong><small className="mt-1 block opacity-80">Corrija cada questão logo após responder.</small></span>
        </Link>
        <Link
          href={`/provas-antigas/${exam.id}/resolver?modo=prova${selectedLanguage ? `&idioma=${selectedLanguage}` : ""}`}
          aria-current={mode === "prova" ? "page" : undefined}
          className={`flex items-start gap-3 rounded-[18px] p-4 transition ${
            mode === "prova" ? "bg-orange-500 text-white shadow-md" : "bg-slate-50 text-slate-700 hover:bg-orange-50"
          }`}
        >
          <TimerReset className="mt-0.5 h-5 w-5 shrink-0" />
          <span><strong className="block">Modo prova</strong><small className="mt-1 block opacity-80">Cronômetro, cartão-resposta e correção só na entrega.</small></span>
        </Link>
      </nav>
      {availableLanguages.length > 0 && (
        <section className="mb-5 rounded-[24px] border border-blue-100 bg-white p-4 shadow-[0_18px_44px_-34px_rgba(15,23,42,0.32)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <Languages className="mt-0.5 h-5 w-5 shrink-0 text-blue-700" />
              <div>
                <h2 className="font-black text-slate-950">Escolha a língua estrangeira</h2>
                <p className="mt-1 text-xs font-semibold text-slate-500">
                  As demais questões do caderno permanecem iguais; somente a variante de língua é trocada.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Idioma das questões de língua estrangeira">
              {availableLanguages.map((language) => (
                <Link
                  key={language}
                  href={`/provas-antigas/${exam.id}/resolver?modo=${mode}&idioma=${language}`}
                  aria-current={selectedLanguage === language ? "page" : undefined}
                  className={`rounded-full px-4 py-2 text-sm font-black transition ${
                    selectedLanguage === language
                      ? "bg-blue-600 text-white shadow-md"
                      : "bg-blue-50 text-blue-800 hover:bg-blue-100"
                  }`}
                >
                  {oldExamLanguageLabel(language)}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
      {mode === "prova" ? (
        <OldExamProofWorkspace
          key={`${exam.id}:${selectedLanguage ?? "NONE"}`}
          exam={exam}
          questions={questions.map(toOldExamProofQuestion)}
          selectedLanguage={selectedLanguage}
        />
      ) : (
      <QuestionPractice
        contextualVestibular
        selectedVestibularId={questions[0]?.vestibular.id}
        selectedVestibularName={exam.vestibular}
        questions={questions}
        vestibulares={
          questions[0]
            ? [{ id: questions[0].vestibular.id, name: questions[0].vestibular.name }]
            : []
        }
        subjects={[...subjectMap.values()]}
        topics={[...topicMap.values()]}
        years={[exam.ano]}
        pagination={{
          page: 1,
          pages: 1,
          total: questions.length,
          pageSize: Math.max(1, questions.length),
        }}
        favoriteIds={favoriteIds}
      />
      )}
    </div>
  );
}
