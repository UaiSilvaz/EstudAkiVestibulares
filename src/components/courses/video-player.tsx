"use client";

import { Maximize, Pause, PictureInPicture, Play, RotateCcw, RotateCw, Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { formatTimestamp } from "./format";

type Props = {
  src: string | null;
  title: string;
  initialPosition: number;
  onProgress: (payload: { positionSeconds: number; watchedSeconds: number; percentage: number }) => void;
  onComplete: () => void;
  onTimeChange?: (seconds: number) => void;
};

export function VideoPlayer({ src, title, initialPosition, onProgress, onComplete, onTimeChange }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const lastSaveRef = useRef(0);
  const completedRef = useRef(false);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(0.9);
  const [speed, setSpeed] = useState(1);
  const [current, setCurrent] = useState(initialPosition);
  const [duration, setDuration] = useState(0);
  const [resumeOpen, setResumeOpen] = useState(initialPosition > 15);

  function emitProgress(force = false) {
    const video = videoRef.current;
    if (!video || !Number.isFinite(video.duration) || video.duration <= 0) return;
    const now = Date.now();
    if (!force && now - lastSaveRef.current < 12000) return;
    lastSaveRef.current = now;
    const percentage = Math.min(100, (video.currentTime / video.duration) * 100);
    onProgress({
      positionSeconds: video.currentTime,
      watchedSeconds: video.currentTime,
      percentage,
    });
    if (percentage >= 90 && !completedRef.current) {
      completedRef.current = true;
      onComplete();
    }
  }

  function seek(delta: number) {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.max(0, Math.min(video.duration || 0, video.currentTime + delta));
  }

  function togglePlay() {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) void video.play();
    else video.pause();
  }

  useEffect(() => {
    const onSeekRequest = (event: Event) => {
      const detail = (event as CustomEvent<{ seconds?: number }>).detail;
      const seconds = detail?.seconds;
      if (typeof seconds !== "number" || !videoRef.current) return;
      videoRef.current.currentTime = Math.max(0, Math.min(videoRef.current.duration || seconds, seconds));
      void videoRef.current.play();
    };
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.tagName === "INPUT" || target?.tagName === "TEXTAREA") return;
      if (event.code === "Space") {
        event.preventDefault();
        togglePlay();
      }
      if (event.key === "ArrowLeft") seek(-10);
      if (event.key === "ArrowRight") seek(10);
      if (event.key.toLowerCase() === "f") void videoRef.current?.requestFullscreen();
    };
    window.addEventListener("estudaki:seek-video", onSeekRequest);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("estudaki:seek-video", onSeekRequest);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  useEffect(() => {
    const flush = () => emitProgress(true);
    document.addEventListener("visibilitychange", flush);
    window.addEventListener("beforeunload", flush);
    return () => {
      document.removeEventListener("visibilitychange", flush);
      window.removeEventListener("beforeunload", flush);
    };
  });

  if (!src) {
    return (
      <div className="grid aspect-video place-items-center rounded-[28px] bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 p-6 text-center text-white shadow-2xl">
        <div>
          <Play className="mx-auto h-14 w-14" />
          <h2 className="mt-4 font-display text-2xl font-black">{title}</h2>
          <p className="mt-2 max-w-lg text-sm font-semibold text-white/70">Nao ha video demo no projeto ainda. Quando um arquivo for colocado em public/demo, as aulas demo podem apontar para ele sem duplicacao.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-[28px] bg-slate-950 shadow-2xl">
      <video
        ref={videoRef}
        src={src}
        className="aspect-video w-full bg-black"
        playsInline
        onLoadedMetadata={(event) => {
          setDuration(event.currentTarget.duration || 0);
        }}
        onTimeUpdate={(event) => {
          setCurrent(event.currentTarget.currentTime);
          onTimeChange?.(event.currentTarget.currentTime);
          emitProgress(false);
        }}
        onPlay={() => setPlaying(true)}
        onPause={() => {
          setPlaying(false);
          emitProgress(true);
        }}
        onEnded={() => {
          emitProgress(true);
          onComplete();
        }}
      />
      {resumeOpen && (
        <div className="absolute inset-0 grid place-items-center bg-slate-950/72 p-4 text-white backdrop-blur-sm">
          <div className="max-w-sm rounded-[24px] border border-white/15 bg-white/10 p-5 text-center shadow-2xl">
            <p className="font-display text-xl font-black">Continuar de {formatTimestamp(initialPosition)}?</p>
            <div className="mt-4 flex justify-center gap-3">
              <button type="button" onClick={() => {
                if (videoRef.current) videoRef.current.currentTime = initialPosition;
                setResumeOpen(false);
                void videoRef.current?.play();
              }} className="h-11 rounded-full bg-white px-4 text-sm font-black text-slate-950">Continuar</button>
              <button type="button" onClick={() => {
                if (videoRef.current) videoRef.current.currentTime = 0;
                setResumeOpen(false);
              }} className="h-11 rounded-full border border-white/25 px-4 text-sm font-black text-white">Recomecar</button>
            </div>
          </div>
        </div>
      )}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950 via-slate-950/78 to-transparent p-3 pt-14 text-white">
        <input
          type="range"
          min={0}
          max={Math.max(duration, 1)}
          value={Math.min(current, Math.max(duration, 1))}
          onChange={(event) => {
            const value = Number(event.target.value);
            if (videoRef.current) videoRef.current.currentTime = value;
            setCurrent(value);
          }}
          aria-label="Progresso do video"
          className="w-full accent-cyan-400"
        />
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <IconButton label={playing ? "Pausar" : "Reproduzir"} onClick={togglePlay}>{playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 fill-current" />}</IconButton>
            <IconButton label="Voltar 10s" onClick={() => seek(-10)}><RotateCcw className="h-4 w-4" /></IconButton>
            <IconButton label="Avancar 10s" onClick={() => seek(10)}><RotateCw className="h-4 w-4" /></IconButton>
            <button type="button" onClick={() => {
              const next = !muted;
              setMuted(next);
              if (videoRef.current) videoRef.current.muted = next;
            }} className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 transition hover:bg-white/18" aria-label={muted ? "Ativar som" : "Mutar"}>
              {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={volume}
              aria-label="Volume"
              onChange={(event) => {
                const value = Number(event.target.value);
                setVolume(value);
                if (videoRef.current) videoRef.current.volume = value;
              }}
              className="hidden w-20 accent-cyan-400 sm:block"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-black">{formatTimestamp(current)} / {formatTimestamp(duration || 0)}</span>
            <select value={speed} onChange={(event) => {
              const value = Number(event.target.value);
              setSpeed(value);
              if (videoRef.current) videoRef.current.playbackRate = value;
            }} className="h-9 rounded-xl border border-white/10 bg-white/10 px-2 text-xs font-black outline-none">
              {[0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map((item) => <option key={item} value={item}>{item}x</option>)}
            </select>
            <IconButton label="Picture in picture" onClick={() => void videoRef.current?.requestPictureInPicture?.()}><PictureInPicture className="h-4 w-4" /></IconButton>
            <IconButton label="Tela cheia" onClick={() => void videoRef.current?.requestFullscreen()}><Maximize className="h-4 w-4" /></IconButton>
          </div>
        </div>
      </div>
    </div>
  );
}

function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" title={label} aria-label={label} onClick={onClick} className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 transition hover:bg-white/18">{children}</button>;
}
