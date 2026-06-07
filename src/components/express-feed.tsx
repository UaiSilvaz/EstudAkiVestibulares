"use client";

import {
  Bookmark,
  Heart,
  MessageCircle,
  Play,
  Send,
  Share2,
} from "lucide-react";
import { useState } from "react";
import { cn, formatDuration } from "@/lib/utils";

type ExpressComment = {
  id: string;
  body: string;
  userName: string;
  createdAt: string;
};

type ExpressVideo = {
  id: string;
  title: string;
  description: string;
  durationSeconds: number;
  videoUrl: string | null;
  subjectName: string;
  topicName: string;
  liked: boolean;
  saved: boolean;
  likesCount: number;
  savesCount: number;
  comments: ExpressComment[];
};

export function ExpressFeed({ initialVideos }: { initialVideos: ExpressVideo[] }) {
  const [videos, setVideos] = useState(initialVideos);
  const [commentText, setCommentText] = useState<Record<string, string>>({});

  function updateVideo(id: string, updater: (video: ExpressVideo) => ExpressVideo) {
    setVideos((current) => current.map((video) => (video.id === id ? updater(video) : video)));
  }

  async function toggleLike(videoId: string) {
    const response = await fetch(`/api/videos/${videoId}/like`, { method: "POST" });
    const data = (await response.json()) as { liked: boolean; likesCount: number };
    updateVideo(videoId, (video) => ({ ...video, liked: data.liked, likesCount: data.likesCount }));
  }

  async function toggleSave(videoId: string) {
    const response = await fetch(`/api/videos/${videoId}/save`, { method: "POST" });
    const data = (await response.json()) as { saved: boolean; savesCount: number };
    updateVideo(videoId, (video) => ({ ...video, saved: data.saved, savesCount: data.savesCount }));
  }

  async function addComment(videoId: string) {
    const body = commentText[videoId]?.trim();
    if (!body) return;

    const response = await fetch(`/api/videos/${videoId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    });
    const data = (await response.json()) as { comment: ExpressComment };

    updateVideo(videoId, (video) => ({
      ...video,
      comments: [data.comment, ...video.comments],
    }));
    setCommentText((current) => ({ ...current, [videoId]: "" }));
  }

  if (videos.length === 0) {
    return (
      <div className="estudaki-card rounded-[30px] p-8 text-center">
        <p className="text-xl font-black text-slate-950">Nenhum Express publicado ainda.</p>
        <p className="mt-2 text-sm text-slate-500">
          Cadastre videos no painel de conteudos para montar o feed.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto grid max-w-6xl gap-5 lg:grid-cols-[minmax(320px,520px)_1fr]">
      <section className="thin-scrollbar max-h-[calc(100vh-150px)] snap-y snap-mandatory overflow-y-auto rounded-[34px] bg-slate-950 p-3">
        <div className="space-y-4">
          {videos.map((video) => (
            <article
              key={video.id}
              className="relative min-h-[720px] snap-start overflow-hidden rounded-[30px] bg-gradient-to-br from-blue-700 via-blue-600 to-cyan-500 text-white shadow-2xl"
            >
              {video.videoUrl ? (
                <video
                  src={video.videoUrl}
                  controls
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="flex h-24 w-24 items-center justify-center rounded-full bg-white/20 backdrop-blur-xl">
                    <Play className="h-11 w-11 fill-white" />
                  </div>
                </div>
              )}

              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent" />

              <div className="absolute right-4 top-1/2 z-20 flex -translate-y-1/2 flex-col gap-4">
                <button
                  type="button"
                  onClick={() => toggleLike(video.id)}
                  className="flex flex-col items-center gap-1"
                  title="Curtir"
                >
                  <span
                    className={cn(
                      "flex h-12 w-12 items-center justify-center rounded-full bg-white/16 backdrop-blur transition",
                      video.liked && "bg-red-500 text-white",
                    )}
                  >
                    <Heart className={cn("h-6 w-6", video.liked && "fill-white")} />
                  </span>
                  <span className="text-xs font-black">{video.likesCount}</span>
                </button>

                <a href={`#comments-${video.id}`} className="flex flex-col items-center gap-1" title="Comentarios">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/16 backdrop-blur">
                    <MessageCircle className="h-6 w-6" />
                  </span>
                  <span className="text-xs font-black">{video.comments.length}</span>
                </a>

                <button
                  type="button"
                  onClick={() => toggleSave(video.id)}
                  className="flex flex-col items-center gap-1"
                  title="Salvar"
                >
                  <span
                    className={cn(
                      "flex h-12 w-12 items-center justify-center rounded-full bg-white/16 backdrop-blur transition",
                      video.saved && "bg-amber-400 text-slate-950",
                    )}
                  >
                    <Bookmark className={cn("h-6 w-6", video.saved && "fill-slate-950")} />
                  </span>
                  <span className="text-xs font-black">{video.savesCount}</span>
                </button>

                <button type="button" className="flex flex-col items-center gap-1" title="Compartilhar">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/16 backdrop-blur">
                    <Share2 className="h-6 w-6" />
                  </span>
                </button>
              </div>

              <div className="absolute bottom-0 left-0 right-16 z-10 p-6">
                <div className="mb-3 inline-flex rounded-full bg-white/16 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] backdrop-blur">
                  {video.subjectName} · {formatDuration(video.durationSeconds)}
                </div>
                <h2 className="text-3xl font-black leading-tight">{video.title}</h2>
                <p className="mt-3 max-w-md text-sm font-semibold leading-6 text-white/82">
                  {video.description}
                </p>
                <p className="mt-3 text-xs font-black uppercase tracking-[0.16em] text-cyan-100">
                  #{video.topicName.replaceAll(" ", "")}
                </p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <aside className="space-y-5">
        {videos.map((video) => (
          <section id={`comments-${video.id}`} key={video.id} className="estudaki-card rounded-[30px] p-5">
            <div className="mb-4">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">
                Comentarios
              </p>
              <h3 className="mt-1 text-xl font-black text-slate-950">{video.title}</h3>
            </div>

            <div className="mb-4 flex gap-2">
              <input
                className="estudaki-input"
                placeholder="Escreva um comentario..."
                value={commentText[video.id] ?? ""}
                onChange={(event) =>
                  setCommentText((current) => ({ ...current, [video.id]: event.target.value }))
                }
              />
              <button
                type="button"
                onClick={() => addComment(video.id)}
                className="estudaki-button estudaki-button-primary px-4"
                title="Enviar comentario"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-72 space-y-3 overflow-y-auto pr-1 thin-scrollbar">
              {video.comments.length === 0 && (
                <p className="rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-slate-500">
                  Seja o primeiro comentario deste Express.
                </p>
              )}
              {video.comments.map((comment) => (
                <div key={comment.id} className="rounded-2xl bg-white p-4">
                  <p className="text-sm font-black text-slate-950">{comment.userName}</p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">{comment.body}</p>
                </div>
              ))}
            </div>
          </section>
        ))}
      </aside>
    </div>
  );
}
