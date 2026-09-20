"use client";

import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Download,
  Flag,
  Heart,
  Lock,
  MessageCircle,
  Send,
  Sparkles,
  Star,
  ThumbsUp,
  Trophy,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { FastLink } from "@/components/fast-link";
import { cn } from "@/lib/utils";
import type { LessonCommentDTO, LessonPageDTO, LessonQuestionDTO } from "@/lib/courses/types";
import { formatCourseDuration, formatTimestamp } from "./format";
import { PurchaseModal } from "./purchase-modal";
import { VideoPlayer } from "./video-player";

type Props = {
  data: LessonPageDTO;
};

type Tab = "sobre" | "duvidas" | "discussao" | "material" | "questoes";

export function LessonPageClient({ data }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>(data.lesson.type === "QUESTIONS" || data.lesson.type === "CHECKPOINT" ? "questoes" : "sobre");
  const [currentTime, setCurrentTime] = useState(data.lesson.progress.positionSeconds);
  const [liked, setLiked] = useState(data.lesson.liked);
  const [likesCount, setLikesCount] = useState(data.lesson.likesCount);
  const [favorite, setFavorite] = useState(data.lesson.favorite);
  const [xpToast, setXpToast] = useState<string | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [completionOpen, setCompletionOpen] = useState(false);

  async function saveProgress(payload: { positionSeconds: number; watchedSeconds: number; percentage: number }) {
    await fetch(`/api/lessons/${data.lesson.id}/progress`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  }

  async function complete() {
    const response = await fetch(`/api/lessons/${data.lesson.id}/complete`, { method: "POST" });
    if (response.ok) {
      setXpToast(`+${data.lesson.xpReward} XP`);
      setCompletionOpen(true);
      router.refresh();
    }
  }

  async function toggleLike() {
    const response = await fetch(`/api/lessons/${data.lesson.id}/like`, { method: "POST" });
    const payload = (await response.json()) as { liked?: boolean; likesCount?: number };
    if (response.ok) {
      setLiked(Boolean(payload.liked));
      setLikesCount(payload.likesCount ?? likesCount);
    }
  }

  async function toggleFavorite() {
    const response = await fetch(`/api/lessons/${data.lesson.id}/favorite`, { method: "POST" });
    const payload = (await response.json()) as { favorite?: boolean };
    if (response.ok) setFavorite(Boolean(payload.favorite));
  }

  if (data.accessDenied) {
    return (
      <div className="mx-auto max-w-3xl space-y-5">
        <FastLink href={`/cursos/${data.course.slug}`} className="inline-flex h-10 items-center gap-2 rounded-full border border-blue-100 bg-white px-4 text-sm font-black text-blue-700">
          <ArrowLeft className="h-4 w-4" />
          Voltar para trilha
        </FastLink>
        <section className="rounded-[32px] border border-amber-100 bg-white p-8 text-center shadow-[0_24px_64px_-44px_rgba(15,23,42,0.42)]">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[28px] bg-amber-50 text-amber-600">
            <Lock className="h-9 w-9" />
          </div>
          <h1 className="mt-5 font-display text-3xl font-black text-slate-950">
            {data.deniedReason === "purchase" ? "Aula exclusiva deste curso" : "Atividade ainda bloqueada"}
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm font-semibold leading-6 text-slate-600">
            {data.deniedReason === "purchase" ? "Compre o curso para liberar as aulas premium. O backend bloqueou video, materiais e questoes desta aula." : "Conclua a atividade anterior para continuar a trilha sequencial."}
          </p>
          <div className="mt-6 flex justify-center gap-3">
            {data.deniedReason === "purchase" && <button type="button" onClick={() => setCheckoutOpen(true)} className="h-12 rounded-full bg-blue-600 px-5 text-sm font-black text-white">Comprar curso</button>}
            <FastLink href={`/cursos/${data.course.slug}`} className="inline-flex h-12 items-center rounded-full border border-slate-200 px-5 text-sm font-black text-slate-700">Ver trilha</FastLink>
          </div>
        </section>
        <PurchaseModal courseId={data.course.id} courseSlug={data.course.slug} title={data.course.title} priceCents={data.course.priceCents} open={checkoutOpen} onClose={() => setCheckoutOpen(false)} />
      </div>
    );
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
      <main className="min-w-0 space-y-5">
        <FastLink href={`/cursos/${data.course.slug}`} className="inline-flex h-10 items-center gap-2 rounded-full border border-blue-100 bg-white px-4 text-sm font-black text-blue-700">
          <ArrowLeft className="h-4 w-4" />
          Trilha do curso
        </FastLink>
        <VideoPlayer
          src={data.lesson.videoUrl}
          title={data.lesson.title}
          initialPosition={data.lesson.progress.positionSeconds}
          onProgress={(payload) => void saveProgress(payload)}
          onComplete={() => void complete()}
          onTimeChange={setCurrentTime}
        />
        <section className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-700">{data.course.title}</p>
              <h1 className="mt-1 font-display text-3xl font-black text-slate-950">{data.lesson.title}</h1>
              <p className="mt-2 text-sm font-semibold text-slate-600">{data.course.teacherName} - {formatCourseDuration(data.lesson.durationSeconds)}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <ActionButton active={liked} onClick={() => void toggleLike()} label={`${likesCount.toLocaleString("pt-BR")} curtidas`} icon={<ThumbsUp className="h-4 w-4" />} />
              <ActionButton active={favorite} onClick={() => void toggleFavorite()} label={favorite ? "Salva" : "Salvar"} icon={<Heart className={cn("h-4 w-4", favorite && "fill-current")} />} />
              {data.lesson.allowManualCompletion && <ActionButton active={data.lesson.progress.completed} onClick={() => void complete()} label="Concluir" icon={<CheckCircle2 className="h-4 w-4" />} />}
            </div>
          </div>
          <div className="mt-4 h-2 rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-gradient-to-r from-blue-600 to-cyan-400" style={{ width: `${data.lesson.progress.percentage}%` }} />
          </div>
        </section>

        <section className="overflow-hidden rounded-[28px] border border-slate-100 bg-white shadow-sm">
          <div className="flex gap-1 overflow-x-auto border-b border-slate-100 p-2">
            {[
              ["sobre", "Conteudo"],
              ["duvidas", "Duvidas"],
              ["discussao", "Discussao"],
              ["material", "Material"],
              ["questoes", "Questoes"],
            ].map(([id, label]) => (
              <button key={id} type="button" onClick={() => setTab(id as Tab)} className={cn("h-10 whitespace-nowrap rounded-full px-4 text-xs font-black transition", tab === id ? "bg-blue-600 text-white" : "text-slate-500 hover:bg-slate-50")}>
                {label}
              </button>
            ))}
          </div>
          <div className="p-5">
            {tab === "sobre" && <AboutTab data={data} />}
            {tab === "duvidas" && <CommentsTab lessonId={data.lesson.id} kind="QUESTION" currentTime={currentTime} endpoint="questions" />}
            {tab === "discussao" && <CommentsTab lessonId={data.lesson.id} kind="DISCUSSION" currentTime={currentTime} endpoint="comments" />}
            {tab === "material" && <MaterialsTab resources={data.lesson.resources} />}
            {tab === "questoes" && <QuestionsTab lessonId={data.lesson.id} questions={data.lesson.questions} simulation={data.lesson.simulation} />}
          </div>
        </section>
      </main>

      <LessonSidebar data={data} />

      {xpToast && <div className="fixed right-5 top-24 z-[110] rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-5 py-3 text-sm font-black text-white shadow-xl animate-[estudaki-fast-pop_180ms_ease-out]">{xpToast}</div>}
      {completionOpen && (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[30px] border border-white/80 bg-white p-6 text-center shadow-2xl">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[28px] bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-10 w-10" />
            </div>
            <h2 className="mt-4 font-display text-3xl font-black text-slate-950">Muito bem!</h2>
            <p className="mt-2 text-sm font-bold text-slate-600">+{data.lesson.xpReward} XP. Proxima atividade liberada.</p>
            <div className="mt-5 flex justify-center gap-3">
              {data.nextNode ? <FastLink href={data.nextNode.href} className="inline-flex h-12 items-center gap-2 rounded-full bg-blue-600 px-5 text-sm font-black text-white">Continuar <ArrowRight className="h-4 w-4" /></FastLink> : <FastLink href={`/cursos/${data.course.slug}`} className="inline-flex h-12 items-center rounded-full bg-blue-600 px-5 text-sm font-black text-white">Voltar para trilha</FastLink>}
              <button type="button" onClick={() => setCompletionOpen(false)} className="h-12 rounded-full border border-slate-200 px-5 text-sm font-black text-slate-700">Fechar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ActionButton({ active, onClick, label, icon }: { active: boolean; onClick: () => void; label: string; icon: React.ReactNode }) {
  return <button type="button" onClick={onClick} className={cn("inline-flex h-11 items-center gap-2 rounded-full border px-4 text-sm font-black transition", active ? "border-blue-200 bg-blue-50 text-blue-700" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50")}>{icon}{label}</button>;
}

function AboutTab({ data }: { data: LessonPageDTO }) {
  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_280px]">
      <div>
        <h2 className="font-display text-xl font-black text-slate-950">Resumo da aula</h2>
        <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">{data.lesson.description}</p>
        <div className="mt-5">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-700">Voce aprendera</p>
          <ul className="mt-3 space-y-2">
            {data.lesson.outcomes.map((item) => <li key={item} className="flex gap-2 text-sm font-bold text-slate-700"><CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600" />{item}</li>)}
          </ul>
        </div>
      </div>
      <NotesBox lessonId={data.lesson.id} initialContent={data.lesson.noteContent} currentTime={data.lesson.progress.positionSeconds} />
    </div>
  );
}

function NotesBox({ lessonId, initialContent, currentTime }: { lessonId: string; initialContent: string; currentTime: number }) {
  const [content, setContent] = useState(initialContent);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (!content.trim()) return;
      void fetch(`/api/lessons/${lessonId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, positionSeconds: currentTime }),
      }).then(() => setSaved(true));
    }, 1800);
    return () => window.clearTimeout(timeout);
  }, [content, currentTime, lessonId]);

  return (
    <div className="rounded-[22px] border border-slate-100 bg-slate-50 p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Minhas anotacoes</p>
      <textarea value={content} onChange={(event) => {
        setSaved(false);
        setContent(event.target.value);
      }} placeholder="Escreva suas anotacoes..." className="mt-3 min-h-36 w-full resize-none rounded-2xl border border-slate-100 bg-white p-3 text-sm font-semibold outline-none focus:border-blue-200" />
      <p className="mt-2 text-xs font-bold text-slate-400">{saved ? "Salvo automaticamente" : "Autosave ativo"}</p>
    </div>
  );
}

function CommentsTab({ lessonId, kind, currentTime, endpoint }: { lessonId: string; kind: "QUESTION" | "DISCUSSION"; currentTime: number; endpoint: "questions" | "comments" }) {
  const [comments, setComments] = useState<LessonCommentDTO[]>([]);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const response = await fetch(`/api/lessons/${lessonId}/comments?kind=${kind}`);
    if (response.ok) {
      const payload = (await response.json()) as { comments: LessonCommentDTO[] };
      setComments(payload.comments);
    }
    setLoading(false);
  }, [kind, lessonId]);

  async function send() {
    if (!body.trim()) return;
    const response = await fetch(`/api/lessons/${lessonId}/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body, kind, positionSeconds: currentTime }),
    });
    if (response.ok) {
      setBody("");
      await load();
    }
  }

  useEffect(() => {
    let active = true;
    fetch(`/api/lessons/${lessonId}/comments?kind=${kind}`)
      .then(async (response) => {
        if (!response.ok) return;
        const payload = (await response.json()) as { comments: LessonCommentDTO[] };
        if (active) setComments(payload.comments);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [kind, lessonId]);

  return (
    <div className="space-y-4">
      <div className="rounded-[22px] border border-slate-100 bg-slate-50 p-3">
        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-blue-700">
          <MessageCircle className="h-4 w-4" />
          Timestamp atual {formatTimestamp(currentTime)}
        </div>
        <textarea value={body} onChange={(event) => setBody(event.target.value)} placeholder={kind === "QUESTION" ? "Qual sua duvida?" : "Comente sobre esta aula..."} className="mt-3 min-h-24 w-full resize-none rounded-2xl border border-slate-100 bg-white p-3 text-sm font-semibold outline-none focus:border-blue-200" />
        <button type="button" onClick={() => void send()} className="mt-3 inline-flex h-10 items-center gap-2 rounded-full bg-blue-600 px-4 text-sm font-black text-white"><Send className="h-4 w-4" />Enviar</button>
      </div>
      {loading ? <p className="text-sm font-bold text-slate-500">Carregando...</p> : comments.length === 0 ? <p className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-500">{kind === "QUESTION" ? "Alguma parte ficou confusa? Envie sua duvida." : "Seja o primeiro a comentar nesta aula."}</p> : comments.map((comment) => <CommentCard key={comment.id} comment={comment} />)}
    </div>
  );
}

function CommentCard({ comment }: { comment: LessonCommentDTO }) {
  return (
    <article className="rounded-[22px] border border-slate-100 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-black text-slate-950">{comment.user.name} {comment.user.role === "TEACHER" && <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-black uppercase text-blue-700">Professor</span>}</p>
          <p className="mt-1 text-xs font-bold text-slate-400">{new Date(comment.createdAt).toLocaleString("pt-BR")}</p>
        </div>
        {comment.positionSeconds !== null && (
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent("estudaki:seek-video", { detail: { seconds: comment.positionSeconds ?? 0 } }))}
            className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-black text-blue-700"
          >
            {formatTimestamp(comment.positionSeconds)}
          </button>
        )}
      </div>
      <p className="mt-3 text-sm font-semibold leading-6 text-slate-700">{comment.body}</p>
      <div className="mt-3 flex gap-2 text-xs font-black text-slate-400">
        <span>{comment.likesCount} likes</span>
        {comment.helpful && <span className="text-emerald-600">util</span>}
      </div>
      {comment.replies.length > 0 && <div className="mt-3 space-y-2 border-l border-blue-100 pl-3">{comment.replies.map((reply) => <CommentCard key={reply.id} comment={reply} />)}</div>}
    </article>
  );
}

function MaterialsTab({ resources }: { resources: Array<{ title: string; type: string; href: string }> }) {
  if (resources.length === 0) return <p className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-500">Nenhum material complementar nesta aula.</p>;
  return <div className="grid gap-3 md:grid-cols-2">{resources.map((resource) => <a key={resource.title} href={resource.href} className="flex items-center gap-3 rounded-[22px] border border-slate-100 bg-slate-50 p-4 transition hover:bg-blue-50"><Download className="h-5 w-5 text-blue-700" /><span><span className="block font-black text-slate-950">{resource.title}</span><span className="text-xs font-bold text-slate-500">{resource.type}</span></span></a>)}</div>;
}

function QuestionsTab({ lessonId, questions, simulation }: { lessonId: string; questions: LessonQuestionDTO[]; simulation: LessonPageDTO["lesson"]["simulation"] }) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [results, setResults] = useState<Record<string, { correct: boolean; correctAlternative: string; explanation: string; xpAwarded: number }>>({});
  const [simResult, setSimResult] = useState<string | null>(null);

  async function answer(question: LessonQuestionDTO) {
    const selectedAlternative = answers[question.questionId];
    if (!selectedAlternative) return;
    const response = await fetch(`/api/lessons/${lessonId}/question-attempt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionId: question.questionId, selectedAlternative }),
    });
    const payload = (await response.json()) as { correct: boolean; correctAlternative: string; explanation: string; xpAwarded: number };
    if (response.ok) setResults((current) => ({ ...current, [question.questionId]: payload }));
  }

  async function finishSim() {
    if (!simulation) return;
    const response = await fetch(`/api/simulations/${simulation.id}/finish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ responses: answers, timeSeconds: simulation.durationMinutes * 60 }),
    });
    const payload = (await response.json()) as { score?: number; correctCount?: number; totalQuestions?: number; passed?: boolean; xpAwarded?: number };
    if (response.ok) setSimResult(`${payload.correctCount}/${payload.totalQuestions} - ${payload.score}% ${payload.passed ? `+${payload.xpAwarded} XP` : "Revise antes de continuar."}`);
  }

  if (questions.length === 0) return <p className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-500">As questoes desta aula aparecerao aqui quando forem cadastradas.</p>;

  return (
    <div className="space-y-4">
      {simulation && <div className="rounded-[22px] border border-amber-100 bg-amber-50 p-4 text-amber-800"><p className="flex items-center gap-2 font-black"><Trophy className="h-5 w-5" />{simulation.title}</p><p className="mt-1 text-sm font-bold">{simulation.durationMinutes} min - {simulation.passingScore}% necessario</p></div>}
      {questions.map((question, index) => {
        const result = results[question.questionId];
        return (
          <article key={question.id} className="rounded-[24px] border border-slate-100 bg-white p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-blue-700">Questao {index + 1} - +{question.xpReward} XP</p>
            <h3 className="mt-2 text-base font-black leading-6 text-slate-950">{question.statement}</h3>
            <div className="mt-4 grid gap-2">
              {question.alternatives.map((alternative) => (
                <button key={alternative.key} type="button" onClick={() => setAnswers((current) => ({ ...current, [question.questionId]: alternative.key }))} className={cn("flex min-h-11 items-center gap-3 rounded-2xl border px-3 text-left text-sm font-bold transition", answers[question.questionId] === alternative.key ? "border-blue-300 bg-blue-50 text-blue-800" : "border-slate-100 bg-slate-50 text-slate-700")}>
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-white text-xs font-black">{alternative.key}</span>
                  {alternative.text}
                </button>
              ))}
            </div>
            <button type="button" onClick={() => void answer(question)} className="mt-3 h-10 rounded-full bg-slate-950 px-4 text-sm font-black text-white">Responder</button>
            {result && <div className={cn("mt-3 rounded-2xl p-4 text-sm font-bold", result.correct ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700")}><p>{result.correct ? `Correto! +${result.xpAwarded} XP` : `Ainda nao. Alternativa correta: ${result.correctAlternative}`}</p><p className="mt-1 text-slate-600">{result.explanation}</p></div>}
          </article>
        );
      })}
      {simulation && <button type="button" onClick={() => void finishSim()} className="inline-flex h-12 items-center gap-2 rounded-full bg-amber-500 px-5 text-sm font-black text-white"><Flag className="h-4 w-4" />Finalizar simulado</button>}
      {simResult && <p className="rounded-2xl bg-blue-50 p-4 text-sm font-black text-blue-700">{simResult}</p>}
    </div>
  );
}

function LessonSidebar({ data }: { data: LessonPageDTO }) {
  return (
    <aside className="space-y-3 xl:sticky xl:top-24">
      {data.modules.map((module) => (
        <section key={module.id} className="rounded-[24px] border border-slate-100 bg-white p-4 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-700">{module.eyebrow}</p>
          <h2 className="mt-1 font-black text-slate-950">{module.title}</h2>
          <div className="mt-3 space-y-2">
            {module.nodes.map((node) => (
              <FastLink key={node.id} href={node.href} className={cn("flex items-center gap-3 rounded-2xl p-2 text-sm font-bold", node.id === data.lesson.id ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-50", node.state === "locked" && "pointer-events-none opacity-50")}>
                {node.state === "locked" ? <Lock className="h-4 w-4" /> : node.state === "completed" || node.state === "perfect" ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <Sparkles className="h-4 w-4" />}
                <span className="min-w-0 flex-1 truncate">{node.title}</span>
                {node.stars > 0 && <Star className="h-3.5 w-3.5 fill-current text-amber-400" />}
              </FastLink>
            ))}
          </div>
        </section>
      ))}
    </aside>
  );
}
