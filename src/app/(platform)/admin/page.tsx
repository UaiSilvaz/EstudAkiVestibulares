import { BookOpen, FileText, Users } from "@/components/visual/aicon-icons";
import { ClipboardList } from "lucide-react";
import type { Prisma } from "@prisma/client";
import Link from "next/link";
import { redirect } from "next/navigation";
import { MetricCard } from "@/components/metric-card";
import { PageHeader } from "@/components/page-header";
import { requireManager } from "@/lib/auth";
import { db } from "@/lib/db";

type PendingQuestion = Prisma.QuestionGetPayload<{
  include: { subject: true; vestibular: true };
}>;

export default async function AdminPage() {
  const user = await requireManager();
  if (user.role !== "ADMIN") redirect("/professor/alunos");

  let totalUsers = 0;
  let totalSimulados = 0;
  let loadError = false;
  let totalQuestions = 0;
  let publishedQuestions = 0;
  let totalExams = 0;
  let totalMaterials = 0;
  let pendingQuestions: PendingQuestion[] = [];

  try {
    [totalUsers, totalQuestions, publishedQuestions, totalExams, totalMaterials, pendingQuestions, totalSimulados] =
      await Promise.all([
        db.user.count(),
        db.question.count(),
        db.question.count({ where: { status: "PUBLISHED" } }),
        db.exam.count(),
        db.material.count(),
        db.question.findMany({
          where: { status: "REVIEW" },
          include: { subject: true, vestibular: true },
          orderBy: { createdAt: "desc" },
          take: 5,
        }),
        Promise.all([db.simulado.count(), db.simulation.count()]).then(counts => counts.reduce((sum, count) => sum + count, 0)),
      ]);
  } catch {
    loadError = true;
  }

  return (
    <div>
      <PageHeader
        eyebrow="Admin & docentes"
        title="Gestão educacional Norte Preparatórios"
        description="Área administrativa restrita. Cadastre questões, provas antigas e materiais, além de acompanhar a operação."
      />

      {loadError && <p role="alert" className="mb-4 rounded-xl bg-amber-50 p-4 text-amber-800">Não foi possível consultar os indicadores. Tente novamente.</p>}
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <MetricCard
          label="Usuários"
          href="/admin/users"
          value={totalUsers}
          hint="alunos, professores e administradores"
          iconName="users"
          color="#2563EB"
          variant="blue"
        />
        <MetricCard
          label="Questões"
          href="/admin/questions"
          value={totalQuestions}
          hint={`${publishedQuestions} publicadas`}
          iconName="clipboardList"
          color="#22C55E"
          variant="green"
        />
        <MetricCard
          label="Provas"
          href="/admin/exams"
          value={totalExams}
          hint="acervo antigo cadastrado"
          iconName="fileText"
          color="#22D3EE"
          variant="cyan"
        />
        <MetricCard
          label="Materiais"
          href="/admin/content"
          value={totalMaterials}
          hint="PDFs, resumos e apostilas"
          iconName="bookOpen"
          color="#FACC15"
          variant="yellow"
        />
        <MetricCard
          label="Simulados"
          href="/admin/simulados"
          value={totalSimulados}
          hint="diagnósticos e listas"
          iconName="graduationCap"
          color="#FB7185"
          variant="pink"
        />
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-[18px] border border-blue-200/40 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-semibold text-[#0F172A]">Ações rápidas</h2>
          <div className="mt-5 grid gap-3">
            <Link href="/admin/questions" className="ek-button ek-button-primary justify-start">
              <ClipboardList className="h-4 w-4" />
              Abrir editor de questões
            </Link>
            <Link href="/admin/courses" className="ek-button ek-button-ghost justify-start">
              <BookOpen className="h-4 w-4" />
              Montar cursos e aulas
            </Link>
            <Link href="/admin/users" className="ek-button ek-button-ghost justify-start">
              <Users className="h-4 w-4" />
              Gerenciar usuários e PDFs
            </Link>
            <Link href="/admin/provas-antigas" className="ek-button ek-button-ghost justify-start">
              <FileText className="h-4 w-4" />
              Gerenciar provas antigas
            </Link>
            <Link href="/admin/exams" className="ek-button ek-button-ghost justify-start">
              <FileText className="h-4 w-4" />
              Cadastrar prova antiga
            </Link>
            <Link href="/admin/content" className="ek-button ek-button-ghost justify-start">
              <FileText className="h-4 w-4" />
              Gerenciar materiais
            </Link>
          </div>
        </div>

        <div className="rounded-[18px] border border-amber-200/50     p-6 shadow-sm professional-neutral">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-[#0F172A]">Fila de revisão</h2>
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
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
              <div key={question.id} className="rounded-2xl border border-amber-100 bg-white p-4">
                <p className="text-sm font-semibold text-[#0F172A]">
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
