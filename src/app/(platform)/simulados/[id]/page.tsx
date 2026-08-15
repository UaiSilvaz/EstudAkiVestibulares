import { CalendarClock, LockKeyhole } from "lucide-react";
import { notFound } from "next/navigation";
import { SimulationWorkspace } from "@/components/simulation-workspace";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { parseAnswerKey, resultIsReleased, simulationState } from "@/lib/exam-simulations";

export default async function SimulationPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const exam = await db.exam.findUnique({ where: { id }, include: { vestibular: true } });
  if (!exam || !exam.isSimulado || exam.status !== "PUBLISHED") notFound();
  const attempt = await db.examAttempt.findUnique({ where: { examId_userId: { examId: id, userId: user.id } } });
  const state = simulationState(exam);
  const released = Boolean(attempt?.submittedAt) && resultIsReleased(exam.resultsAt);

  if (!attempt && state !== "OPEN") {
    return <section className="mx-auto max-w-2xl rounded-[32px] border border-slate-200 bg-white p-8 text-center">
      {state === "SCHEDULED" ? <CalendarClock className="mx-auto h-12 w-12 text-orange-500" /> : <LockKeyhole className="mx-auto h-12 w-12 text-slate-400" />}
      <h1 className="mt-4 text-3xl font-black text-slate-950">{exam.title}</h1>
      <p className="mt-3 text-slate-600">{state === "SCHEDULED" ? `A prova abre em ${exam.startsAt?.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}.` : "A janela deste simulado foi encerrada."}</p>
    </section>;
  }

  return <SimulationWorkspace exam={{
    id: exam.id, title: exam.title, description: exam.description, instructions: exam.instructions,
    pdfUrl: exam.pdfUrl, answerKeyUrl: released ? exam.answerKeyUrl : null, questionCount: exam.questionCount,
    durationMinutes: exam.durationMinutes, startsAt: exam.startsAt?.toISOString() ?? null,
    endsAt: exam.endsAt?.toISOString() ?? null, resultsAt: exam.resultsAt?.toISOString() ?? null,
    vestibular: { name: exam.vestibular.name, color: exam.vestibular.color },
  }} initialAttempt={attempt ? {
    id: attempt.id, startedAt: attempt.startedAt.toISOString(), expiresAt: attempt.expiresAt.toISOString(),
    submittedAt: attempt.submittedAt?.toISOString() ?? null, responses: parseAnswerKey(attempt.responses),
    status: attempt.status, correctCount: released ? attempt.correctCount : null, score: released ? attempt.score : null,
  } : null} released={released} initialAnswerKey={released ? parseAnswerKey(exam.answerKey) : null} />;
}
