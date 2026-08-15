import { Role } from "@prisma/client";
import { ArrowLeft, Languages, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { OldExamProofWorkspace } from "@/components/old-exam-proof-workspace";
import { PageHeader } from "@/components/page-header";
import { requireManager } from "@/lib/auth";
import { loadEnemReviewPreview } from "@/lib/enem-review-preview";
import { oldExamLanguageLabel, parseOldExamLanguage } from "@/lib/old-exam-language";
import { toOldExamProofQuestion } from "@/lib/old-exam-proof";

export const dynamic = "force-dynamic";

export default async function EnemImportPreviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ jobId: string }>;
  searchParams: Promise<{ idioma?: string | string[] }>;
}) {
  const user = await requireManager();
  if (user.role !== Role.ADMIN) redirect("/admin");
  const [{ jobId }, query] = await Promise.all([params, searchParams]);
  const preview = await loadEnemReviewPreview(jobId, parseOldExamLanguage(query.idioma));
  if (!preview) notFound();

  const { job, exam, questions, availableLanguages, selectedLanguage } = preview;
  const proofQuestions = questions.map((question) => ({
    ...toOldExamProofQuestion(question),
    adminOriginalPageUrl: question.adminOriginalPageUrl,
  }));

  return (
    <div>
      <div className="mb-4">
        <Link href="/admin/importacoes-enem" className="estudaki-button estudaki-button-ghost">
          <ArrowLeft className="h-4 w-4" /> Voltar às importações
        </Link>
      </div>
      <PageHeader
        eyebrow={`Admin · ${exam.vestibular} · ${exam.ano} · ${exam.dia ?? "dia único"}`}
        title={`Prévia em REVIEW — ${exam.titulo}`}
        description={`${questions.length} questões da variante selecionada. Fonte congelada ${job.sourceJsonSha256.slice(0, 12)}…`}
      />
      <section className="mb-5 flex items-start gap-3 rounded-[24px] border border-amber-200 bg-amber-50 p-4 text-amber-950">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" />
        <div>
          <h2 className="font-black">Prévia administrativa sem publicação</h2>
          <p className="mt-1 text-sm leading-6">
            As questões permanecem em REVIEW. A entrega abaixo não cria tentativa, não concede XP e só libera gabarito e resolução nesta sessão autenticada.
          </p>
        </div>
      </section>
      {availableLanguages.length > 0 && (
        <section className="mb-5 rounded-[24px] border border-blue-100 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <Languages className="mt-0.5 h-5 w-5 shrink-0 text-blue-700" />
              <div>
                <h2 className="font-black text-slate-950">Variante de língua estrangeira</h2>
                <p className="mt-1 text-xs font-semibold text-slate-500">
                  Cada idioma mantém cinco ocorrências próprias e compartilha as demais questões do caderno.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Idioma da prévia administrativa">
              {availableLanguages.map((language) => (
                <Link
                  key={language}
                  href={`/admin/importacoes-enem/${job.id}/preview?idioma=${language}`}
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
      <OldExamProofWorkspace
        key={`${job.id}:${selectedLanguage ?? "NONE"}`}
        exam={{ ...exam, id: `preview-${job.id}` }}
        questions={proofQuestions}
        selectedLanguage={selectedLanguage}
        attemptUrl={`/api/admin/importacoes-enem/${job.id}/preview/attempt`}
        reviewPreview
      />
    </div>
  );
}
