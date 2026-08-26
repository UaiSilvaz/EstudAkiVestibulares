"use client";

import { ArrowRight, CalendarCheck2, Clock3, Power, Zap } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type MouseEvent } from "react";
import type { StudyNowBlock, StudyNowSession } from "@/lib/learning/study-session-planner";

type Props = {
  initialSession: StudyNowSession;
};

const DAILY_OFFENSIVE_STORAGE_KEY = "estudaki:daily-offensive-started-at";
const DAILY_OFFENSIVE_DURATION_MS = 24 * 60 * 60 * 1000;

function xpLabel(blocks: StudyNowBlock[]) {
  const xp = blocks.reduce((sum, block) => sum + block.xpEstimate, 0);
  return xp > 0 ? `até +${xp} XP` : "sem XP direto";
}

export function StudyNowCard({ initialSession }: Props) {
  const nextBlock = initialSession.blocks[0];
  const router = useRouter();
  const navigationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const offensiveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [isDailyOffensiveActive, setIsDailyOffensiveActive] = useState(false);

  const clearOffensiveTimer = useCallback(() => {
    if (offensiveTimerRef.current) {
      clearTimeout(offensiveTimerRef.current);
      offensiveTimerRef.current = null;
    }
  }, []);

  const activateDailyOffensive = useCallback(
    (startedAt: number) => {
      const activeFor = startedAt + DAILY_OFFENSIVE_DURATION_MS - Date.now();

      clearOffensiveTimer();

      if (activeFor <= 0) {
        setIsDailyOffensiveActive(false);
        try {
          window.localStorage.removeItem(DAILY_OFFENSIVE_STORAGE_KEY);
        } catch {
          // Storage can be unavailable in private or restricted browser contexts.
        }
        return;
      }

      setIsDailyOffensiveActive(true);
      offensiveTimerRef.current = setTimeout(() => {
        setIsDailyOffensiveActive(false);
        try {
          window.localStorage.removeItem(DAILY_OFFENSIVE_STORAGE_KEY);
        } catch {
          // Storage can be unavailable in private or restricted browser contexts.
        }
      }, activeFor);
    },
    [clearOffensiveTimer],
  );

  useEffect(() => {
    const hydrationTimer = setTimeout(() => {
      try {
        const storedStartedAt = window.localStorage.getItem(DAILY_OFFENSIVE_STORAGE_KEY);
        const startedAt = storedStartedAt ? Number(storedStartedAt) : NaN;

        if (Number.isFinite(startedAt)) {
          activateDailyOffensive(startedAt);
        }
      } catch {
        // Storage can be unavailable in private or restricted browser contexts.
      }
    }, 0);

    return () => {
      clearTimeout(hydrationTimer);
      if (navigationTimerRef.current) {
        clearTimeout(navigationTimerRef.current);
      }
      clearOffensiveTimer();
    };
  }, [activateDailyOffensive, clearOffensiveTimer]);

  function handleStartClick(event: MouseEvent<HTMLAnchorElement>) {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    event.preventDefault();

    if (isStarting) {
      return;
    }

    const startedAt = Date.now();
    try {
      window.localStorage.setItem(DAILY_OFFENSIVE_STORAGE_KEY, String(startedAt));
    } catch {
      // Storage can be unavailable in private or restricted browser contexts.
    }

    activateDailyOffensive(startedAt);
    setIsStarting(true);
    navigationTimerRef.current = setTimeout(() => {
      router.push(initialSession.startHref);
    }, 1550);
  }

  const isButtonActive = isStarting || isDailyOffensiveActive;

  const cardClasses = [
    "group relative min-w-0 overflow-hidden rounded-[32px] border p-5 text-[#0F172A] shadow-[0_28px_64px_-34px_rgba(15,23,42,0.35)] transition-colors duration-500 sm:p-6 md:p-7",
    isButtonActive
      ? "border-emerald-200/90 bg-[linear-gradient(135deg,#FFFFFF_0%,#F0FDF4_44%,#DCFCE7_100%)]"
      : "border-red-100/80 bg-[linear-gradient(135deg,#FFFFFF_0%,#FFF7F7_44%,#FFE4E6_100%)]",
  ].join(" ");

  const surfaceGlowClasses = [
    "pointer-events-none absolute -inset-px rounded-[32px] transition-colors duration-500",
    isButtonActive
      ? "bg-[radial-gradient(circle_at_18%_16%,rgba(52,211,153,0.18),transparent_30%),radial-gradient(circle_at_86%_18%,rgba(255,255,255,0.88),transparent_22%),linear-gradient(135deg,rgba(255,255,255,0.76),transparent_46%)]"
      : "bg-[radial-gradient(circle_at_18%_16%,rgba(248,113,113,0.18),transparent_30%),radial-gradient(circle_at_86%_18%,rgba(255,255,255,0.86),transparent_22%),linear-gradient(135deg,rgba(255,255,255,0.72),transparent_46%)]",
  ].join(" ");

  const accentColorClasses = isButtonActive ? "text-emerald-700" : "text-red-700";
  const dividerClasses = isButtonActive ? "bg-emerald-500/40" : "bg-red-500/40";
  const chipClasses = isButtonActive
    ? "bg-white/82 text-emerald-700 ring-emerald-100"
    : "bg-white/80 text-red-700 ring-red-100";
  const neutralChipClasses = isButtonActive
    ? "bg-white/82 text-slate-700 ring-emerald-100"
    : "bg-white/80 text-slate-700 ring-red-100";
  const panelClasses = [
    "relative z-10 flex min-w-[250px] flex-col items-center gap-3 rounded-[28px] border bg-white/90 p-4 text-center shadow-[0_22px_50px_-30px_rgba(15,23,42,0.46)] backdrop-blur transition-colors duration-500",
    isButtonActive ? "border-emerald-100" : "border-red-100",
  ].join(" ");

  const startButtonClasses = [
    "group/start relative mt-1 flex h-32 w-32 items-center justify-center rounded-full transition duration-300 hover:scale-[1.03] focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-4 sm:h-36 sm:w-36",
    isButtonActive
      ? "bg-[radial-gradient(circle_at_50%_42%,#A7F3D0_0%,#34D399_34%,#16A34A_68%,#065F46_100%)] shadow-[0_24px_46px_-18px_rgba(22,163,74,0.9),0_0_0_10px_rgba(255,255,255,0.66),0_0_42px_rgba(34,197,94,0.46),inset_0_8px_16px_rgba(255,255,255,0.38),inset_0_-12px_20px_rgba(6,95,70,0.48)] focus-visible:outline-emerald-200"
      : "bg-[radial-gradient(circle_at_50%_42%,#FF6A5F_0%,#F32018_42%,#C8120D_72%,#850806_100%)] shadow-[0_24px_42px_-18px_rgba(239,31,22,0.86),0_0_0_10px_rgba(255,255,255,0.58),inset_0_8px_16px_rgba(255,255,255,0.34),inset_0_-12px_20px_rgba(127,9,8,0.46)] focus-visible:outline-red-200",
  ].join(" ");

  return (
    <section className={cardClasses}>
      <div aria-hidden className={surfaceGlowClasses} />
      <Power
        aria-hidden
        className={`pointer-events-none absolute -right-8 bottom-0 h-32 w-32 rotate-[-8deg] transition duration-500 group-hover:scale-105 sm:h-48 sm:w-48 ${
          isButtonActive ? "text-emerald-500/12" : "text-red-500/10"
        }`}
        strokeWidth={1.8}
      />

      <div className="relative z-10 grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className={`inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] sm:text-[11px] ${accentColorClasses}`}>
              <CalendarCheck2 className="h-4 w-4" />
              Plano de hoje
            </p>
            <span
              className={`inline-flex rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] shadow-sm ring-1 ${
                isButtonActive
                  ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
                  : "bg-red-50 text-red-700 ring-red-100"
              }`}
            >
              {isButtonActive ? "Ofensiva 24h" : "Pronto para iniciar"}
            </span>
          </div>
          <div className={`mt-2 h-0.5 w-7 rounded-full ${dividerClasses}`} />
          <h2 className="mt-3 font-display text-2xl font-extrabold leading-tight text-[#0F172A] sm:text-3xl">
            {isButtonActive ? "Ofensiva diária ativa" : "Comece agora"}
          </h2>
          <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-600">
            {isButtonActive
              ? `Seu plano de ${initialSession.totalMinutes} minutos está ligado. Volte quando quiser para continuar de onde parou.`
              : `${initialSession.summary} Separei um plano direto de ${initialSession.totalMinutes} minutos para você entrar em ritmo sem escolher demais.`}
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px] font-black uppercase tracking-wider">
            <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 shadow-sm ring-1 ${chipClasses}`}>
              <Clock3 className="h-3.5 w-3.5" />
              {initialSession.totalMinutes} min
            </span>
            <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 shadow-sm ring-1 ${chipClasses}`}>
              <Zap className="h-3.5 w-3.5" />
              {xpLabel(initialSession.blocks)}
            </span>
            <span className={`rounded-full px-3 py-1.5 shadow-sm ring-1 ${neutralChipClasses}`}>
              {initialSession.confidenceLabel}
            </span>
          </div>
        </div>

        <div className={panelClasses}>
          {nextBlock && (
            <div className="w-full text-left">
              <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${isButtonActive ? "text-emerald-600" : "text-red-600"}`}>
                Primeiro passo
              </p>
              <p className="mt-1 text-base font-extrabold leading-snug text-[#0F172A]">
                {nextBlock.title}
              </p>
              <p className="mt-1 line-clamp-2 text-xs font-semibold leading-5 text-slate-500">
                {nextBlock.description}
              </p>
            </div>
          )}
          <Link
            href={initialSession.startHref}
            onClick={handleStartClick}
            aria-label="Começar agora"
            aria-pressed={isButtonActive}
            title={isButtonActive ? "Ofensiva ativa" : "Começar agora"}
            className={startButtonClasses}
          >
            <span
              aria-hidden
              className={`absolute -inset-8 rounded-full border bg-[radial-gradient(circle,rgba(255,255,255,0.28),transparent_68%)] transition ${
                isButtonActive ? "border-emerald-200/60" : "border-red-200/45"
              }`}
            />
            <span
              aria-hidden
              className="absolute -inset-3 rounded-full border border-white/70 bg-white/18 transition group-hover/start:bg-white/24"
            />
            <span
              aria-hidden
              className="absolute inset-2 rounded-full bg-[linear-gradient(180deg,rgba(255,255,255,0.22),transparent_42%)]"
            />
            <Power
              aria-hidden
              className="relative h-14 w-14 text-white drop-shadow-[0_3px_5px_rgba(127,9,8,0.38)] transition group-hover/start:scale-105"
              strokeWidth={2.8}
            />
          </Link>
          <p className={`text-sm font-black transition ${isButtonActive ? "text-emerald-700" : "text-red-700"}`}>
            {isButtonActive ? "Ofensiva ativa" : "Começar agora"}
          </p>
          <Link
            href="/cronograma"
            className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-full border bg-white/78 px-4 text-xs font-black uppercase tracking-wider transition hover:-translate-y-0.5 ${
              isButtonActive
                ? "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                : "border-red-200 text-red-700 hover:bg-red-50"
            }`}
          >
            Ver plano de hoje
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {isStarting && (
        <div
          role="status"
          aria-live="polite"
          className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden bg-emerald-950 text-white"
        >
          <div
            aria-hidden
            className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(52,211,153,0.98)_0%,rgba(22,163,74,0.96)_42%,rgba(6,78,59,0.99)_100%)]"
          />
          <div
            aria-hidden
            className="absolute h-[34rem] w-[34rem] rounded-full border border-white/16 animate-ping [animation-duration:1.45s]"
          />
          <div
            aria-hidden
            className="absolute h-[78vmax] w-[78vmax] rounded-full border-[18px] border-white/8 animate-pulse"
          />
          <div
            aria-hidden
            className="absolute h-72 w-72 rounded-full bg-white/18 blur-3xl animate-pulse"
          />
          <div className="relative flex max-w-lg flex-col items-center px-6 text-center">
            <div className="relative flex h-36 w-36 items-center justify-center rounded-full bg-[radial-gradient(circle_at_50%_42%,#C8FFE2_0%,#4ADE80_34%,#16A34A_70%,#064E3B_100%)] shadow-[0_24px_70px_-22px_rgba(255,255,255,0.72),0_0_0_14px_rgba(255,255,255,0.18),inset_0_10px_18px_rgba(255,255,255,0.42),inset_0_-14px_24px_rgba(6,78,59,0.48)] animate-bounce">
              <span aria-hidden className="absolute -inset-7 rounded-full border border-white/24" />
              <Power className="h-16 w-16 text-white drop-shadow-[0_4px_8px_rgba(6,78,59,0.42)]" strokeWidth={2.9} />
            </div>
            <p className="mt-9 text-[11px] font-black uppercase tracking-[0.28em] text-white/74">
              Ofensiva diária ativa
            </p>
            <h3 className="mt-2 font-display text-4xl font-extrabold leading-tight text-white sm:text-5xl">
              Plano iniciado
            </h3>
            <p className="mt-3 max-w-sm text-sm font-semibold leading-6 text-white/78">
              Boa. Seu ritmo de hoje foi ligado e a sessão está sendo preparada.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
