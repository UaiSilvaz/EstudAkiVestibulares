"use client";

import { Bookmark, Trophy } from "@/components/visual/aicon-icons";
import { ArrowLeft, ArrowRight, CheckCircle2, Download, Flag, Lock, MessageCircle, Send, Sparkles, Star, ThumbsUp } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
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
  const [completed, setCompleted] = useState(data.lesson.progress.completed);
  const [likePending, setLikePending] = useState(false);
  const [favoritePending, setFavoritePending] = useState(false);
  const [completionPending, setCompletionPending] = useState(false);
  const likeRequest = useRef(0);
  const favoriteRequest = useRef(0);
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
    if (completionPending || completed) return;
    setCompletionPending(true);
    setCompleted(true);
    try {
      const response = await fetch(`/api/lessons/${data.lesson.id}/complete`, { method: "POST" });
      if (!response.ok) throw new Error("Falha ao concluir a aula.");
      setXpToast(`+${data.lesson.xpReward} XP`);
      setCompletionOpen(true);
      router.refresh();
    } catch {
      setCompleted(false);
    } finally {
      setCompletionPending(false);
    }
  }

  async function toggleLike() {
    if (likePending) return;
    const requestId = likeRequest.current + 1;
    likeRequest.current = requestId;
    const previousLiked = liked;
    const previousCount = likesCount;
    const nextLiked = !previousLiked;
    setLiked(nextLiked);
    setLikesCount(Math.max(0, previousCount + (nextLiked ? 1 : -1)));
    setLikePending(true);
    try {
      const response = await fetch(`/api/lessons/${data.lesson.id}/like`, { method: "POST" });
      const payload = (await response.json()) as { liked?: boolean; likesCount?: number };
      if (!response.ok) throw new Error("Falha ao curtir.");
      if (likeRequest.current === requestId) {
        setLiked(Boolean(payload.liked));
        setLikesCount(payload.likesCount ?? previousCount);
      }
    } catch {
      if (likeRequest.current === requestId) {
        setLiked(previousLiked);
        setLikesCount(previousCount);
      }
    } finally {
      if (likeRequest.current === requestId) setLikePending(false);
    }
  }

  async function toggleFavorite() {
    if (favoritePending) return;
    const requestId = favoriteRequest.current + 1;
    favoriteRequest.current = requestId;
    const previous = favorite;
    setFavorite(!previous);
    setFavoritePending(true);
    try {
      const response = await fetch(`/api/lessons/${data.lesson.id}/favorite`, { method: "POST" });
      const payload = (await response.json()) as { favorite?: boolean };
      if (!response.ok) throw new Error("Falha ao salvar.");
      if (favoriteRequest.current === requestId) setFavorite(Boolean(payload.favorite));
    } catch {
      if (favoriteRequest.current === requestId) setFavorite(previous);
    } finally {
      if (favoriteRequest.current === requestId) setFavoritePending(false);
    }
  }

  if (data.accessDenied) {
    return (
      <div className="mx-auto max-w-3xl space-y-5">
        <FastLink href={`/cursos/${data.course.slug}`} className="inline-flex h-10 items-center gap-2 rounded-full border border-blue-100 bg-white px-4 text-sm font-semibold text-blue-700">
          <ArrowLeft className="h-4 w-4" />
          Voltar para trilha
        </FastLink>
        <section className="rounded-[18px] border border-amber-100 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[18px] bg-amber-50 text-amber-600">
            <Lock className="h-9 w-9" />
          </div>
          <h1 className="mt-5 font-display text-3xl font-semibold text-slate-950">
            {data.deniedReason === "purchase" ? "Aula exclusiva deste curso" : "Atividade ainda bloqueada"}
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm font-semibold leading-6 text-slate-600">
            {data.deniedReason === "purchase" ? "Compre o curso para liberar as aulas premium. O backend bloqueou vídeo, materiais e questões desta aula." : "Conclua a atividade anterior para continuar a trilha sequencial."}
          </p>
          <div className="mt-6 flex justify-center gap-3">
            {data.deniedReason === "purchase" && <button type="button" onClick={() => setCheckoutOpen(true)} className="h-12 rounded-full bg-blue-600 px-5 text-sm font-semibold text-white">Comprar curso</button>}
            <FastLink href={`/cursos/${data.course.slug}`} className="inline-flex h-12 items-center rounded-full border border-slate-200 px-5 text-sm font-semibold text-slate-700">Ver trilha</FastLink>
          </div>
        </section>
        <PurchaseModal courseId={data.course.id} courseSlug={data.course.slug} title={data.course.title} priceCents={data.course.priceCents} open={checkoutOpen} onClose={() => setCheckoutOpen(false)} />
      </div>
    );
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
      <main className="min-w-0 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <FastLink href={`/cursos/${data.course.slug}`} className="inline-flex h-10 items-center gap-2 rounded-full border border-blue-100 bg-white px-4 text-sm font-semibold text-blue-700">
            <ArrowLeft className="h-4 w-4" />
            Trilha do curso
          </FastLink>
          <FastLink href="/favoritos" className="inline-flex h-10 items-center gap-2 rounded-full border border-pink-100 bg-white px-4 text-sm font-semibold text-pink-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-pink-50">
            <Bookmark className="h-4 w-4 fill-current" />
            Minhas aulas salvas
          </FastLink>
        </div>
        <VideoPlayer
          src={data.lesson.videoUrl}
          title={data.lesson.title}
          poster={data.lesson.thumbnailUrl}
          initialPosition={data.lesson.progress.positionSeconds}
          onProgress={(payload) => void saveProgress(payload)}
          onComplete={() => void complete()}
          onTimeChange={setCurrentTime}
        />
        <section className="rounded-[18px] border border-slate-100 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-blue-700">{data.course.title}</p>
              <h1 className="mt-1 font-display text-3xl font-semibold text-slate-950">{data.lesson.title}</h1>
              <p className="mt-2 text-sm font-semibold text-slate-600">{data.course.teacherName} - {formatCourseDuration(data.lesson.durationSeconds)}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <ActionButton active={liked} disabled={likePending} onClick={() => void toggleLike()} label={`${likesCount.toLocaleString("pt-BR")} ${likesCount === 1 ? "curtida" : "curtidas"}`} icon={<ThumbsUp className={cn("h-4 w-4", liked && "fill-current animate-[estudaki-fast-pop_180ms_ease-out]")} />} />
              <ActionButton active={favorite} disabled={favoritePending} tone="pink" onClick={() => void toggleFavorite()} label={favorite ? "Aula salva" : "Salvar aula"} icon={<Bookmark className={cn("h-4 w-4", favorite && "fill-current")} />} />
            </div>
          </div>
          {data.lesson.allowManualCompletion && (
            <button
              type="button"
              disabled={completionPending || completed}
              onClick={() => void complete()}
              className={cn(
                "mt-5 inline-flex min-h-14 w-full items-center justify-center gap-3 rounded-2xl px-7 text-base font-semibold text-white shadow-lg transition duration-300 sm:w-auto sm:min-w-64",
                completed ? "bg-emerald-600 shadow-emerald-200 animate-[estudaki-fast-pop_180ms_ease-out]" : "bg-red-600 shadow-red-200 hover:-translate-y-0.5 hover:bg-red-700",
              )}
            >
              {completionPending ? <LoaderCircle /> : <CheckCircle2 className={cn("h-6 w-6", completed && "fill-white/20")} />}
              {completed ? "Aula concluída" : "Concluir aula"}
            </button>
          )}
          <div className="mt-4 h-2 rounded-full bg-slate-100">
            <div className="h-full rounded-full    professional-neutral" style={{ width: `${data.lesson.progress.percentage}%` }} />
          </div>
        </section>

        <section className="overflow-hidden rounded-[18px] border border-slate-100 bg-white shadow-sm">
          <div className="flex gap-1 overflow-x-auto border-b border-slate-100 p-2">
            {[
              ["sobre", "Conteúdo"],
              ["duvidas", "Dúvidas"],
              ["discussao", "Discussão"],
              ["material", "Material"],
              ["questoes", "Questões"],
            ].map(([id, label]) => (
              <button key={id} type="button" onClick={() => setTab(id as Tab)} className={cn("h-10 whitespace-nowrap rounded-full px-4 text-xs font-semibold transition", tab === id ? "bg-blue-600 text-white" : "text-slate-500 hover:bg-slate-50")}>
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

      {xpToast && <div className="fixed right-5 top-24 z-[110] rounded-full    px-5 py-3 text-sm font-semibold text-[color:var(--theme-text)] shadow-xl animate-[estudaki-fast-pop_180ms_ease-out] professional-neutral">{xpToast}</div>}
      {completionOpen && (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[18px] border border-white/80 bg-white p-6 text-center shadow-2xl">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[18px] bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-10 w-10" />
            </div>
            <h2 className="mt-4 font-display text-3xl font-semibold text-slate-950">Muito bem!</h2>
            <p className="mt-2 text-sm font-bold text-slate-600">+{data.lesson.xpReward} XP. Próxima atividade liberada.</p>
            <div className="mt-5 flex justify-center gap-3">
              {data.nextNode ? <FastLink href={data.nextNode.href} className="inline-flex h-12 items-center gap-2 rounded-full bg-blue-600 px-5 text-sm font-semibold text-white">Continuar <ArrowRight className="h-4 w-4" /></FastLink> : <FastLink href={`/cursos/${data.course.slug}`} className="inline-flex h-12 items-center rounded-full bg-blue-600 px-5 text-sm font-semibold text-white">Voltar para trilha</FastLink>}
              <button type="button" onClick={() => setCompletionOpen(false)} className="h-12 rounded-full border border-slate-200 px-5 text-sm font-semibold text-slate-700">Fechar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ActionButton({ active, disabled, onClick, label, icon, tone = "blue" }: { active: boolean; disabled?: boolean; onClick: () => void; label: string; icon: React.ReactNode; tone?: "blue" | "pink" }) {
  return <button type="button" disabled={disabled} aria-pressed={active} data-active={active} data-tone={tone} onClick={onClick} className={cn("lesson-social-action relative inline-flex h-11 items-center gap-2 overflow-visible rounded-full border px-4 text-sm font-semibold transition duration-200 active:scale-90 disabled:cursor-wait", active ? tone === "pink" ? "border-pink-200 bg-pink-50 text-pink-700" : "border-blue-200 bg-blue-50 text-blue-700" : "border-slate-200 bg-white text-slate-600 hover:-translate-y-0.5 hover:bg-slate-50")}><span className="lesson-social-action__icon relative z-10">{icon}</span><span className="relative z-10">{label}</span><span aria-hidden className="lesson-social-action__spark" /></button>;
}

function LoaderCircle() {
  return <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />;
}

function AboutTab({ data }: { data: LessonPageDTO }) {
  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_280px]">
      <div>
        <h2 className="font-display text-xl font-semibold text-slate-950">Resumo da aula</h2>
        <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">{data.lesson.description}</p>
        <div className="mt-5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-blue-700">Você aprenderá</p>
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
    <div className="rounded-[18px] border border-slate-100 bg-slate-50 p-4">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Minhas anotações</p>
      <textarea value={content} onChange={(event) => {
        setSaved(false);
        setContent(event.target.value);
      }} placeholder="Escreva suas anotações..." className="mt-3 min-h-36 w-full resize-none rounded-2xl border border-slate-100 bg-white p-3 text-sm font-semibold outline-none focus:border-blue-200" />
      <p className="mt-2 text-xs font-bold text-slate-400">{saved ? "Salvo automaticamente" : "Autosave ativo"}</p>
    </div>
  );
}

function CommentsTab({ lessonId, kind, currentTime, endpoint }: { lessonId: string; kind: "QUESTION" | "DISCUSSION"; currentTime: number; endpoint: "questions" | "comments" }) {
  const [comments, setComments] = useState<LessonCommentDTO[]>([]);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    const response = await fetch(`/api/lessons/${lessonId}/comments?kind=${kind}`);
    if (response.ok) {
      const payload = (await response.json()) as { comments: LessonCommentDTO[] };
      setComments(payload.comments);
    }
    setLoading(false);
  }, [kind, lessonId]);

  async function send() {
    if (!body.trim() || sending) return;
    setSending(true);
    const response = await fetch(`/api/lessons/${lessonId}/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body, kind, positionSeconds: currentTime }),
    });
    if (response.ok) {
      setBody("");
      await load();
    }
    setSending(false);
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
    return () => { active = false; };
  }, [kind, lessonId]);

  return (
    <div>
      <div className="mb-7 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">{comments.length} {comments.length === 1 ? "coment?rio" : "coment?rios"}</h2>
          <p className="mt-1 text-xs font-semibold text-slate-500">Converse sobre a aula e marque o momento exato do v?deo.</p>
        </div>
        <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">{formatTimestamp(currentTime)}</span>
      </div>

      <div className="mb-8 flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full    text-[color:var(--theme-text)] professional-neutral"><MessageCircle className="h-4 w-4" /></div>
        <div className="min-w-0 flex-1">
          <textarea value={body} onChange={(event) => setBody(event.target.value)} placeholder={kind === "QUESTION" ? "Escreva sua d?vida..." : "Adicione um coment?rio..."} className="min-h-12 w-full resize-none border-0 border-b-2 border-slate-200 bg-transparent px-0 py-2 text-sm font-semibold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-slate-900" />
          <div className="mt-2 flex justify-end gap-2">
            {body && <button type="button" onClick={() => setBody("")} className="h-9 rounded-full px-4 text-xs font-semibold text-slate-600 hover:bg-slate-100">Cancelar</button>}
            <button type="button" disabled={!body.trim() || sending} onClick={() => void send()} className="inline-flex h-9 items-center gap-2 rounded-full bg-blue-600 px-4 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"><Send className="h-3.5 w-3.5" />{sending ? "Enviando..." : "Comentar"}</button>
          </div>
        </div>
      </div>

      {loading ? <p className="py-6 text-sm font-bold text-slate-500">Carregando coment?rios...</p> : comments.length === 0 ? <p className="rounded-2xl bg-slate-50 p-5 text-sm font-bold text-slate-500">{kind === "QUESTION" ? "Alguma parte ficou confusa? Envie sua d?vida." : "Seja o primeiro a comentar nesta aula."}</p> : <div className="space-y-7">{comments.map((comment) => <CommentCard key={comment.id} lessonId={lessonId} comment={comment} onChanged={load} />)}</div>}
    </div>
  );
}

function CommentCard({ lessonId, comment, onChanged, nested = false }: { lessonId: string; comment: LessonCommentDTO; onChanged: () => Promise<void>; nested?: boolean }) {
  const [liked, setLiked] = useState(comment.liked);
  const [likesCount, setLikesCount] = useState(comment.likesCount);
  const [likePending, setLikePending] = useState(false);
  const [replying, setReplying] = useState(false);
  const [reply, setReply] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const teacher = ["TEACHER", "ADMIN"].includes(comment.user.role);

  async function toggleCommentLike() {
    if (likePending) return;
    const previousLiked = liked;
    const previousCount = likesCount;
    const nextLiked = !liked;
    setLiked(nextLiked);
    setLikesCount(Math.max(0, previousCount + (nextLiked ? 1 : -1)));
    setLikePending(true);
    const response = await fetch(`/api/lessons/${lessonId}/comments`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ commentId: comment.id, action: "like" }),
    });
    if (!response.ok) {
      setLiked(previousLiked);
      setLikesCount(previousCount);
    }
    setLikePending(false);
  }

  async function sendReply() {
    if (!reply.trim() || sendingReply) return;
    setSendingReply(true);
    const response = await fetch(`/api/lessons/${lessonId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: reply, kind: "ANSWER", parentId: comment.id }),
    });
    if (response.ok) {
      setReply("");
      setReplying(false);
      await onChanged();
    }
    setSendingReply(false);
  }

  return (
    <article className={cn("flex items-start gap-3", nested && "mt-4")}>
      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full    professional-neutral">
        {comment.user.avatarUrl ? <Image src={comment.user.avatarUrl} alt="" fill unoptimized className="object-cover" sizes="40px" /> : <span className="grid h-full w-full place-items-center text-sm font-semibold text-slate-600">{comment.user.name.slice(0, 1).toUpperCase()}</span>}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold text-slate-950">{comment.user.name}</p>
          {teacher && <span className="rounded bg-slate-900 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white">Professor</span>}
          <span className="text-xs font-semibold text-slate-400">{relativeCommentDate(comment.createdAt)}</span>
          {comment.positionSeconds !== null && <button type="button" onClick={() => window.dispatchEvent(new CustomEvent("estudaki:seek-video", { detail: { seconds: comment.positionSeconds ?? 0 } }))} className="rounded bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 hover:bg-blue-100">{formatTimestamp(comment.positionSeconds)}</button>}
        </div>
        <p className="mt-1.5 whitespace-pre-wrap text-sm font-medium leading-6 text-slate-700">{comment.body}</p>
        <div className="mt-2 flex items-center gap-1">
          <button type="button" disabled={likePending} onClick={() => void toggleCommentLike()} className={cn("inline-flex h-8 items-center gap-1.5 rounded-full px-2 text-xs font-bold transition active:scale-90", liked ? "bg-blue-50 text-blue-700" : "text-slate-500 hover:bg-slate-100")}><ThumbsUp className={cn("h-3.5 w-3.5", liked && "fill-current animate-[estudaki-fast-pop_180ms_ease-out]")} />{likesCount > 0 && likesCount}</button>
          {!nested && <button type="button" onClick={() => setReplying((value) => !value)} className="h-8 rounded-full px-3 text-xs font-semibold text-slate-600 hover:bg-slate-100">Responder</button>}
          {comment.helpful && <span className="ml-1 text-xs font-semibold text-emerald-600">Resposta ?til</span>}
        </div>
        {replying && (
          <div className="mt-3 flex gap-2">
            <input autoFocus value={reply} onChange={(event) => setReply(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void sendReply(); } }} placeholder={`Responder a ${comment.user.name}`} className="h-10 min-w-0 flex-1 border-0 border-b-2 border-slate-200 bg-transparent text-sm font-semibold outline-none focus:border-blue-600" />
            <button type="button" disabled={!reply.trim() || sendingReply} onClick={() => void sendReply()} className="h-10 rounded-full bg-blue-600 px-4 text-xs font-semibold text-white disabled:bg-slate-200">{sendingReply ? "Enviando..." : "Responder"}</button>
          </div>
        )}
        {comment.replies.length > 0 && <div className="mt-3 border-l-2 border-slate-100 pl-3">{comment.replies.map((item) => <CommentCard key={item.id} lessonId={lessonId} comment={item} onChanged={onChanged} nested />)}</div>}
      </div>
    </article>
  );
}

function relativeCommentDate(value: string) {
  const elapsed = Math.max(0, Date.now() - new Date(value).getTime());
  const minutes = Math.floor(elapsed / 60_000);
  if (minutes < 1) return "agora";
  if (minutes < 60) return `h? ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `h? ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `h? ${days} ${days === 1 ? "dia" : "dias"}`;
  return new Date(value).toLocaleDateString("pt-BR");
}

function MaterialsTab({ resources }: { resources: Array<{ title: string; type: string; href: string }> }) {
  if (resources.length === 0) return <p className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-500">Nenhum material complementar nesta aula.</p>;
  return <div className="grid gap-3 md:grid-cols-2">{resources.map((resource) => <a key={`${resource.title}-${resource.href}`} href={resource.href} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-[18px] border border-slate-100 bg-slate-50 p-4 transition hover:-translate-y-0.5 hover:border-blue-100 hover:bg-blue-50"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-red-50 text-red-600"><Download className="h-5 w-5" /></span><span><span className="block font-semibold text-slate-950">{resource.title}</span><span className="text-xs font-bold text-slate-500">Abrir {resource.type}</span></span></a>)}</div>;
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

  if (questions.length === 0) return <p className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-500">As questões desta aula aparecerão aqui quando forem cadastradas.</p>;

  return (
    <div className="space-y-4">
      {simulation && <div className="rounded-[18px] border border-amber-100 bg-amber-50 p-4 text-amber-800"><p className="flex items-center gap-2 font-semibold"><Trophy className="h-5 w-5" />{simulation.title}</p><p className="mt-1 text-sm font-bold">{simulation.durationMinutes} min - {simulation.passingScore}% necessario</p></div>}
      {questions.map((question, index) => {
        const result = results[question.questionId];
        return (
          <article key={question.id} className="rounded-[18px] border border-slate-100 bg-white p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-blue-700">Questão {index + 1} - +{question.xpReward} XP</p>
            <h3 className="mt-2 text-base font-semibold leading-6 text-slate-950">{question.statement}</h3>
            <div className="mt-4 grid gap-2">
              {question.alternatives.map((alternative) => (
                <button key={alternative.key} type="button" onClick={() => setAnswers((current) => ({ ...current, [question.questionId]: alternative.key }))} className={cn("flex min-h-11 items-center gap-3 rounded-2xl border px-3 text-left text-sm font-bold transition", answers[question.questionId] === alternative.key ? "border-blue-300 bg-blue-50 text-blue-800" : "border-slate-100 bg-slate-50 text-slate-700")}>
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-white text-xs font-semibold">{alternative.key}</span>
                  {alternative.text}
                </button>
              ))}
            </div>
            <button type="button" onClick={() => void answer(question)} className="mt-3 h-10 rounded-full bg-slate-950 px-4 text-sm font-semibold text-white">Responder</button>
            {result && <div className={cn("mt-3 rounded-2xl p-4 text-sm font-bold", result.correct ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700")}><p>{result.correct ? `Correto! +${result.xpAwarded} XP` : `Ainda não. Alternativa correta: ${result.correctAlternative}`}</p><p className="mt-1 text-slate-600">{result.explanation}</p></div>}
          </article>
        );
      })}
      {simulation && <button type="button" onClick={() => void finishSim()} className="inline-flex h-12 items-center gap-2 rounded-full bg-amber-500 px-5 text-sm font-semibold text-white"><Flag className="h-4 w-4" />Finalizar simulado</button>}
      {simResult && <p className="rounded-2xl bg-blue-50 p-4 text-sm font-semibold text-blue-700">{simResult}</p>}
    </div>
  );
}

function LessonSidebar({ data }: { data: LessonPageDTO }) {
  return (
    <aside className="space-y-3 xl:sticky xl:top-24">
      {data.modules.map((module) => (
        <section key={module.id} className="rounded-[18px] border border-slate-100 bg-white p-4 shadow-sm">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-blue-700">{module.eyebrow}</p>
          <h2 className="mt-1 font-semibold text-slate-950">{module.title}</h2>
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
