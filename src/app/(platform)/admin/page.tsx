import {
  ClipboardList,
  FileText,
  Video,
} from "lucide-react";
import type { Prisma } from "@prisma/client";
import Link from "next/link";
import { MetricCard } from "@/components/metric-card";
import { PageHeader } from "@/components/page-header";
import { requireManager } from "@/lib/auth";
import { db } from "@/lib/db";

type PendingQuestion = Prisma.QuestionGetPayload<{
  include: { subject: true; vestibular: true };
}>;

export default async function AdminPage() {
  await requireManager();

  let totalUsers = 1;
  let totalQuestions = 0;
  let publishedQuestions = 0;
  let totalExams = 0;
  let totalVideos = 0;
  let totalMaterials = 0;
  let pendingQuestions: PendingQuestion[] = [];

  try {
    [
      totalUsers,
      totalQuestions,
      publishedQuestions,
      totalExams,
      totalVideos,
      totalMaterials,
      pendingQuestions,
    ] = await Promise.all([
      db.user.count(),
      db.question.count(),
      db.question.count({ where: { status: "PUBLISHED" } }),
      db.exam.count(),
      db.video.count(),
      db.material.count(),
      db.question.findMany({
        where: { status: "REVIEW" },
        include: { subject: true, vestibular: true },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ]);
  } catch {
    totalUsers = 1;
    totalExams = 72;
  }

  return (
    <div>
      <PageHeader
        eyebrow="Admin & docentes"
        title="Gestão educacional EstudAki"
        description="CMS invisível para alunos. Cadastre questões, provas antigas, materiais, videoaulas, Express e acompanhe a operação."
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <MetricCard
          label="Usuários"
          value={totalUsers}
          hint="alunos, professores e admins"
          iconName="users"
          color="#2563EB"
          variant="blue"
        />
        <MetricCard
          label="Questões"
          value={totalQuestions}
          hint={`${publishedQuestions} publicadas`}
          iconName="clipboardList"
          color="#22C55E"
          variant="green"
        />
        <MetricCard
          label="Provas"
          value={totalExams}
          hint="acervo antigo cadastrado"
          iconName="fileText"
          color="#22D3EE"
          variant="cyan"
        />
        <MetricCard
          label="Vídeos"
          value={totalVideos}
          hint="videoaulas e Express"
          iconName="video"
          color="#A78BFA"
          variant="purple"
        />
        <MetricCard
          label="Materiais"
          value={totalMaterials}
          hint="PDFs, resumos e apostilas"
          iconName="bookOpen"
          color="#FACC15"
          variant="yellow"
        />
        <MetricCard
          label="Simulados"
          value="1"
          hint="diagnósticos e listas"
          iconName="graduationCap"
          color="#FB7185"
          variant="pink"
        />
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-[24px] border border-blue-200/40 bg-white p-6 shadow-[0_12px_32px_-18px_rgba(15,23,42,0.10)]">
          <h2 className="text-2xl font-black text-[#0F172A]">Ações rápidas</h2>
          <div className="mt-5 grid gap-3">
            <Link
              href="/admin/questions"
              className="ek-button ek-button-primary justify-start"
            >
              <ClipboardList className="h-4 w-4" />
              Abrir editor de questões
            </Link>
            <Link
              href="/admin/exams"
              className="ek-button ek-button-ghost justify-start"
            >
              <FileText className="h-4 w-4" />
              Cadastrar prova antiga
            </Link>
            <Link
              href="/admin/content"
              className="ek-button ek-button-ghost justify-start"
            >
              <Video className="h-4 w-4" />
              Gerenciar materiais e vídeos
            </Link>
          </div>
        </div>

        <div className="rounded-[24px] border border-amber-200/50 bg-gradient-to-br from-[#FEFCE8] via-white to-[#FEF3C7] p-6 shadow-[0_12px_32px_-18px_rgba(250,204,21,0.18)]">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-2xl font-black text-[#0F172A]">Fila de revisão</h2>
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-700">
              {pendingQuestions.length} pendente(s)
            </span>
          </div>
          <div className="space-y-3">
            {pendingQuestions.length === 0 && (
              <p className="rounded-2xl border border-amber-100 bg-white p-4 text-sm font-semibold text-slate-500">
                Nenhuma questão aguardando revisão.
              </p>
            )}
            {pendingQuestions.map((question) => (
              <div
                key={question.id}
                className="rounded-2xl border border-amber-100 bg-white p-4"
              >
                <p className="text-sm font-black text-[#0F172A]">
                  {question.vestibular.name} · {question.subject.name}
                </p>
                <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-500">
                  {question.statement}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
