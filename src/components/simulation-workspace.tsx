"use client";

import { CheckCircle2, Clock3, FileText, LockKeyhole, Send, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useFeedback } from "@/components/feedback/feedback-provider";

type Answers = Record<string, string>;
type Attempt = {
  id: string; startedAt: string; expiresAt: string; submittedAt: string | null;
  responses: Answers; status: string; correctCount: number | null; score: number | null;
};
type Exam = {
  id: string; title: string; description: string | null; instructions: string | null;
  pdfUrl: string | null; answerKeyUrl: string | null; questionCount: number | null;
  durationMinutes: number | null; startsAt: string | null; endsAt: string | null; resultsAt: string | null;
  vestibular: { name: string; color: string };
};
type AchievementResult = {
  id: string; slug?: string; title: string; description: string; xpReward: number;
  icon?: string | null; iconKey?: string | null; iconDescription?: string | null;
  rarity?: string | null; category?: string | null; color?: string | null;
};

export function SimulationWorkspace({ exam, initialAttempt, released, initialAnswerKey }: {
  exam: Exam; initialAttempt: Attempt | null; released: boolean; initialAnswerKey: Answers | null;
}) {
  const { notify, celebrate } = useFeedback();
  const router = useRouter();
  const [attempt, setAttempt] = useState(initialAttempt);
  const [responses, setResponses] = useState<Answers>(initialAttempt?.responses ?? {});
  const [answerKey, setAnswerKey] = useState<Answers | null>(initialAnswerKey);
  const [resultReleased, setResultReleased] = useState(released);
  const [now, setNow] = useState(initialAttempt ? new Date(initialAttempt.startedAt).getTime() : 0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const count = exam.questionCount ?? 0;
  const submitted = Boolean(attempt?.submittedAt);
  const remaining = attempt ? Math.max(0, new Date(attempt.expiresAt).getTime() - now) : 0;

  const saveOrSubmit = useCallback(async (submit: boolean) => {
    if (!attempt || attempt.submittedAt || busy) return;
    setBusy(true);
    const response = await fetch(`/api/simulados/${exam.id}/attempt`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ responses, submit }),
    });
    const data = await response.json().catch(() => null) as {
      error?: string; attempt?: Attempt; released?: boolean; answerKey?: Answers | null;
      achievements?: AchievementResult[];
    } | null;
    setBusy(false);
    if (!response.ok || !data?.attempt) {
      const error = data?.error ?? "Não foi possível salvar.";
      setMessage(error);
      notify({ tone: "error", title: "Simulado não atualizado", message: error });
      return;
    }
    setAttempt(data.attempt);
    if (data.released !== undefined) setResultReleased(data.released);
    if (data.answerKey) setAnswerKey(data.answerKey);
    if (data.attempt.submittedAt) {
      setMessage("Simulado entregue com sucesso.");
      notify({
        tone: "success",
        title: "Simulado finalizado!",
        message: "Suas respostas foram entregues e seu progresso foi salvo.",
      });
      for (const achievement of data.achievements ?? []) {
        celebrate({
          id: achievement.id,
          title: achievement.title,
          message: achievement.description,
          xp: achievement.xpReward,
          badge: "Conquista de simulado",
          icon: achievement.icon,
          iconKey: achievement.iconKey ?? achievement.slug ?? achievement.id,
          iconDescription: achievement.iconDescription,
          rarity: achievement.rarity,
          category: achievement.category,
          color: achievement.color,
          actionLabel: "Ver meu resultado",
          onContinue: () => router.refresh(),
        });
      }
    } else {
      setMessage("Respostas salvas.");
    }
  }, [attempt, busy, celebrate, exam.id, notify, responses, router]);

  useEffect(() => {
    if (!attempt || submitted) return;
    const timer = window.setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (current >= new Date(attempt.expiresAt).getTime()) void saveOrSubmit(true);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [attempt, saveOrSubmit, submitted]);

  useEffect(() => {
    if (!attempt || submitted) return;
    const timer = window.setInterval(() => void saveOrSubmit(false), 30_000);
    return () => window.clearInterval(timer);
  }, [attempt, saveOrSubmit, submitted]);

  async function start() {
    setBusy(true); setMessage("");
    const response = await fetch(`/api/simulados/${exam.id}/attempt`, { method: "POST" });
    const data = await response.json().catch(() => null) as { error?: string; attempt?: Attempt } | null;
    setBusy(false);
    if (!response.ok || !data?.attempt) {
      const error = data?.error ?? "Não foi possível iniciar.";
      setMessage(error);
      notify({ tone: "error", title: "Simulado não iniciado", message: error });
      return;
    }
    setAttempt(data.attempt); setResponses(data.attempt.responses); setNow(new Date(data.attempt.startedAt).getTime());
    notify({
      tone: "info",
      title: "Simulado iniciado",
      message: "O cronômetro está valendo. Suas respostas serão salvas automaticamente.",
    });
  }

  const timeText = useMemo(() => {
    const total = Math.ceil(remaining / 1000);
    return `${String(Math.floor(total / 3600)).padStart(2, "0")}:${String(Math.floor((total % 3600) / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
  }, [remaining]);

  if (!attempt) {
    return (
      <section className="mx-auto max-w-3xl rounded-[32px] border border-orange-100 bg-white p-7 shadow-sm">
        <span className="inline-flex rounded-full bg-orange-50 px-3 py-1 text-xs font-black uppercase text-orange-700">{exam.vestibular.name}</span>
        <h1 className="mt-4 text-3xl font-black text-slate-950">{exam.title}</h1>
        <p className="mt-3 leading-7 text-slate-600">{exam.description || "Simulado oficial em PDF com tempo controlado."}</p>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <Stat label="Questões" value={String(count)} />
          <Stat label="Tempo" value={`${exam.durationMinutes ?? 0} min`} />
          <Stat label="Encerra" value={exam.endsAt ? new Date(exam.endsAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "Livre"} />
        </div>
        <div className="mt-6 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-600"><strong className="text-slate-900">Antes de iniciar:</strong> o cronômetro não pausa. O PDF e a folha de respostas serão liberados juntos.</div>
        <button disabled={busy} onClick={start} className="estudaki-button estudaki-button-primary mt-5 w-full"><ShieldCheck className="h-4 w-4" />{busy ? "Preparando..." : "Iniciar tentativa"}</button>
        {message && <p className="mt-3 text-sm font-bold text-red-600">{message}</p>}
      </section>
    );
  }

  return (
    <div>
      <header className="sticky top-3 z-30 mb-4 flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-slate-200 bg-white/95 p-4 shadow-lg backdrop-blur">
        <div><p className="text-xs font-black uppercase text-orange-600">{submitted ? "Tentativa entregue" : "Simulado em andamento"}</p><h1 className="font-black text-slate-950">{exam.title}</h1></div>
        <div className="flex items-center gap-3">
          <span className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2 font-mono text-lg font-black ${remaining < 600_000 && !submitted ? "bg-red-50 text-red-700" : "bg-slate-950 text-white"}`}><Clock3 className="h-4 w-4" />{submitted ? "ENTREGUE" : timeText}</span>
          {!submitted && <button disabled={busy} onClick={() => void saveOrSubmit(true)} className="estudaki-button estudaki-button-primary"><Send className="h-4 w-4" />Entregar</button>}
        </div>
      </header>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white">
          {exam.pdfUrl ? <iframe title={exam.title} src={exam.pdfUrl} className="h-[calc(100vh-170px)] min-h-[680px] w-full" /> : <div className="p-12 text-center text-slate-500"><FileText className="mx-auto mb-3 h-10 w-10" />PDF indisponível.</div>}
        </section>
        <aside className="xl:sticky xl:top-28 xl:self-start">
          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between"><h2 className="text-xl font-black text-slate-950">Folha de respostas</h2><span className="text-sm font-bold text-slate-500">{Object.keys(responses).length}/{count}</span></div>
            <div className="thin-scrollbar mt-4 max-h-[58vh] space-y-2 overflow-y-auto pr-1">
              {Array.from({ length: count }, (_, index) => String(index + 1)).map((question) => (
                <div key={question} className="flex items-center gap-2 rounded-xl bg-slate-50 p-2">
                  <strong className="w-7 text-center text-sm">{question}</strong>
                  {["A", "B", "C", "D", "E"].map((letter) => {
                    const correct = submitted && resultReleased && answerKey?.[question] === letter;
                    const wrong = submitted && resultReleased && responses[question] === letter && !correct;
                    return <button key={letter} disabled={submitted} onClick={() => setResponses((current) => ({ ...current, [question]: letter }))} className={`h-8 flex-1 rounded-lg text-xs font-black transition ${correct ? "bg-emerald-500 text-white" : wrong ? "bg-red-500 text-white" : responses[question] === letter ? "bg-blue-600 text-white" : "bg-white text-slate-600"}`}>{letter}</button>;
                  })}
                </div>
              ))}
            </div>
            {message && <p className="mt-3 text-center text-xs font-bold text-slate-500">{message}</p>}
          </div>
          {submitted && <ResultCard attempt={attempt} released={resultReleased} resultsAt={exam.resultsAt} answerKeyUrl={exam.answerKeyUrl} />}
        </aside>
      </div>
    </div>
  );
}

function ResultCard({ attempt, released, resultsAt, answerKeyUrl }: { attempt: Attempt; released: boolean; resultsAt: string | null; answerKeyUrl: string | null }) {
  return <div className="mt-4 rounded-[28px] border border-slate-200 bg-white p-5">{released ? <><CheckCircle2 className="h-8 w-8 text-emerald-500" /><h2 className="mt-2 text-2xl font-black text-slate-950">{attempt.score?.toFixed(1)}%</h2><p className="text-sm text-slate-600">{attempt.correctCount} acertos. As alternativas corretas estao em verde.</p>{answerKeyUrl && <a className="estudaki-button estudaki-button-ghost mt-4 w-full" href={answerKeyUrl} target="_blank" rel="noreferrer">Abrir gabarito em PDF</a>}</> : <><LockKeyhole className="h-8 w-8 text-orange-500" /><h2 className="mt-2 font-black text-slate-950">Resultado programado</h2><p className="mt-1 text-sm text-slate-600">Seu envio foi salvo. O gabarito abre {resultsAt ? new Date(resultsAt).toLocaleString("pt-BR") : "em breve"}.</p></>}</div>;
}

function Stat({ label, value }: { label: string; value: string }) { return <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs font-bold uppercase text-slate-400">{label}</p><p className="mt-1 font-black text-slate-950">{value}</p></div>; }
