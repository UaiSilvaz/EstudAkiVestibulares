"use client";

import { motion, MotionConfig } from "framer-motion";
import {
  Crown,
  Gem,
  Medal,
  RefreshCcw,
  ShieldCheck,
  Sparkles,
  Target,
  Trophy,
  UserRound,
  Zap,
} from "lucide-react";
import Image from "next/image";
import { LeagueBadge } from "@/components/visual/league-badge";
import { cn } from "@/lib/utils";
import hoverAnimation from "./ranking-hover-animation.json";

export type RankingPlayer = {
  id: string;
  name: string;
  email: string;
  xp: number;
  league: string;
  avatarUrl: string | null;
  targetExam: string | null;
  rank: number;
};

type RankingLeaderboardProps = {
  players: RankingPlayer[];
  currentUserId: string;
  currentXp: number;
  currentLeague: string;
  myRank: number | null;
  totalUsers: number;
  xpToOvertake: number;
  nextName: string | null;
};

const LEAGUE_THEME: Record<
  string,
  {
    text: string;
    chip: string;
    glow: string;
  }
> = {
  Bronze: {
    text: "text-orange-700",
    chip: "from-[#FB923C] to-[#F97316]",
    glow: "rgba(251, 146, 60, 0.28)",
  },
  Prata: {
    text: "text-slate-700",
    chip: "from-[#94A3B8] to-[#CBD5E1]",
    glow: "rgba(148, 163, 184, 0.28)",
  },
  Ouro: {
    text: "text-amber-700",
    chip: "from-[#FACC15] to-[#F97316]",
    glow: "rgba(250, 204, 21, 0.32)",
  },
  Platina: {
    text: "text-blue-700",
    chip: "from-[#60A5FA] to-[#22D3EE]",
    glow: "rgba(96, 165, 250, 0.30)",
  },
  Esmeralda: {
    text: "text-emerald-700",
    chip: "from-[#22C55E] to-[#86EFAC]",
    glow: "rgba(34, 197, 94, 0.28)",
  },
  Diamante: {
    text: "text-violet-700",
    chip: "from-[#22D3EE] to-[#A78BFA]",
    glow: "rgba(103, 232, 249, 0.32)",
  },
};

const PODIUM_LAYOUT = {
  1: {
    wrapper: "order-2",
    pedestal: "h-44 sm:h-52",
    avatar: "h-20 w-20 sm:h-24 sm:w-24",
    lift: "pb-2",
    label: "1",
    icon: Crown,
    tone: "from-[#FACC15] via-[#FDE047] to-[#F97316]",
  },
  2: {
    wrapper: "order-1 mt-12 sm:mt-16",
    pedestal: "h-32 sm:h-40",
    avatar: "h-16 w-16 sm:h-20 sm:w-20",
    lift: "pb-0",
    label: "2",
    icon: Medal,
    tone: "from-[#BFDBFE] via-[#93C5FD] to-[#60A5FA]",
  },
  3: {
    wrapper: "order-3 mt-14 sm:mt-20",
    pedestal: "h-28 sm:h-36",
    avatar: "h-16 w-16 sm:h-20 sm:w-20",
    lift: "pb-0",
    label: "3",
    icon: Medal,
    tone: "from-[#FED7AA] via-[#FDBA74] to-[#FB923C]",
  },
} as const;

function formatNumber(value: number) {
  return value.toLocaleString("pt-BR");
}

function firstName(name: string) {
  return name.trim().split(" ").filter(Boolean)[0] ?? name;
}

function handleFor(player: Pick<RankingPlayer, "email" | "name">) {
  const raw = player.email.split("@")[0] || player.name;
  return `@${raw.replace(/[^\w.-]/g, "").slice(0, 18) || "aluno"}`;
}

function initials(name: string) {
  const value = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("");
  return (value || "EA").toUpperCase();
}

function themeFor(league: string) {
  return LEAGUE_THEME[league] ?? LEAGUE_THEME.Bronze;
}

function JsonHoverAnimation({ compact = false }: { compact?: boolean }) {
  return (
    <motion.span
      aria-hidden
      className={cn(
        "pointer-events-none absolute left-1/2 top-1/2 z-20 block -translate-x-1/2 -translate-y-1/2",
        compact ? "h-14 w-14" : "h-24 w-24",
      )}
      variants={{
        idle: { opacity: 0 },
        hover: { opacity: 1 },
      }}
    >
      {hoverAnimation.rings.map((ring, index) => (
        <motion.span
          key={`${hoverAnimation.name}-ring-${index}`}
          className="absolute inset-0 rounded-full border"
          style={{ borderColor: ring.color }}
          variants={{
            idle: { opacity: 0, scale: 0.72 },
            hover: {
              opacity: [0, 0.82, 0],
              scale: [0.72, ring.scale, ring.scale + 0.1],
            },
          }}
          transition={{
            duration: 0.95,
            delay: ring.delay,
            repeat: Infinity,
            repeatDelay: 0.55,
            ease: [0.22, 1, 0.36, 1],
          }}
        />
      ))}
      {hoverAnimation.particles.map((particle, index) => {
        const size = compact ? particle.size * 0.72 : particle.size;
        return (
          <motion.span
            key={`${hoverAnimation.name}-particle-${index}`}
            className="absolute left-1/2 top-1/2 rounded-[3px]"
            style={{
              width: size,
              height: size,
              marginLeft: size / -2,
              marginTop: size / -2,
              background: particle.color,
            }}
            variants={{
              idle: { opacity: 0, x: 0, y: 0, rotate: 0, scale: 0.35 },
              hover: {
                opacity: [0, 1, 0],
                x: [0, particle.x, particle.x * 1.16],
                y: [0, particle.y, particle.y * 1.16],
                rotate: [0, particle.rotate, particle.rotate * 1.6],
                scale: [0.35, 1, 0.2],
              },
            }}
            transition={{
              duration: 0.82,
              delay: particle.delay,
              repeat: Infinity,
              repeatDelay: 0.7,
              ease: [0.22, 1, 0.36, 1],
            }}
          />
        );
      })}
    </motion.span>
  );
}

function PlayerAvatar({
  player,
  className,
  priority = false,
}: {
  player: RankingPlayer;
  className: string;
  priority?: boolean;
}) {
  const theme = themeFor(player.league);

  return (
    <span
      className={cn(
        "relative isolate flex shrink-0 items-center justify-center overflow-hidden rounded-[30%] bg-gradient-to-br text-sm font-black text-white shadow-[0_18px_32px_-22px_rgba(15,23,42,0.55)] ring-4 ring-white",
        theme.chip,
        className,
      )}
    >
      {player.avatarUrl ? (
        <Image
          src={player.avatarUrl}
          alt={player.name}
          fill
          sizes="96px"
          className="object-cover"
          priority={priority}
        />
      ) : (
        <span className="relative z-10">{initials(player.name)}</span>
      )}
      <span className="absolute inset-0 rounded-[30%] ring-1 ring-white/45" />
    </span>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: typeof Trophy;
  label: string;
  value: string;
  hint: string;
  tone: string;
}) {
  return (
    <motion.div
      initial="idle"
      whileHover="hover"
      className="relative isolate overflow-hidden rounded-[24px] border border-white/80 bg-white/90 p-4 shadow-[0_18px_42px_-28px_rgba(15,23,42,0.28)]"
    >
      <div className={cn("mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-md", tone)}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p className="mt-1 font-display text-3xl font-black leading-none text-[#0F172A]">{value}</p>
      <p className="mt-2 text-xs font-bold leading-5 text-slate-500">{hint}</p>
      <JsonHoverAnimation compact />
    </motion.div>
  );
}

function PodiumSpot({
  player,
  position,
}: {
  player: RankingPlayer;
  position: 1 | 2 | 3;
}) {
  const layout = PODIUM_LAYOUT[position];
  const Icon = layout.icon;
  const theme = themeFor(player.league);

  return (
    <motion.article
      initial="idle"
      animate="idle"
      whileHover="hover"
      className={cn("group relative min-w-0", layout.wrapper)}
      whileTap={{ scale: 0.99 }}
    >
      <div className={cn("relative z-10 flex flex-col items-center text-center", layout.lift)}>
        <div className="relative">
          <JsonHoverAnimation />
          <motion.span
            aria-hidden
            className="absolute inset-0 rounded-[30%] opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-100"
            style={{ background: theme.glow }}
          />
          <PlayerAvatar player={player} className={layout.avatar} priority={position === 1} />
          <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-white text-amber-500 shadow-md ring-1 ring-amber-100">
            <Sparkles className="h-3.5 w-3.5" />
          </span>
        </div>
        <p className="mt-3 max-w-full truncate px-1 text-sm font-black text-[#0F172A] sm:text-base">
          {firstName(player.name)}
        </p>
        <p className="max-w-full truncate px-1 text-[11px] font-bold text-slate-400">
          {handleFor(player)}
        </p>
        <div className="mt-2 flex min-w-0 items-center justify-center gap-1.5">
          <LeagueBadge league={player.league} size="sm" showLabel={false} />
          <span className={cn("truncate text-[10px] font-black uppercase tracking-wider", theme.text)}>
            {player.league}
          </span>
        </div>
      </div>

      <motion.div
        variants={{
          idle: { y: 0 },
          hover: { y: -8 },
        }}
        transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
        className={cn(
          "relative mt-4 overflow-hidden rounded-t-[24px] border border-white/65 bg-gradient-to-b shadow-[0_24px_44px_-28px_rgba(15,23,42,0.34)]",
          layout.pedestal,
          layout.tone,
        )}
      >
        <div className="absolute inset-x-0 top-0 h-8 bg-white/36" />
        <div className="absolute inset-x-4 top-3 h-px bg-white/55" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.10),rgba(255,255,255,0.54))]" />
        <div className="relative flex h-full flex-col items-center justify-center text-white">
          <Icon className="mb-1 h-5 w-5 drop-shadow" />
          <span className="font-display text-5xl font-black leading-none drop-shadow-sm sm:text-6xl">
            {layout.label}
          </span>
          <span className="mt-2 rounded-full bg-white/26 px-3 py-1 text-[10px] font-black uppercase tracking-wider">
            {formatNumber(player.xp)} XP
          </span>
        </div>
      </motion.div>
    </motion.article>
  );
}

function RankingRow({ player, currentUserId }: { player: RankingPlayer; currentUserId: string }) {
  const isMe = player.id === currentUserId;
  const theme = themeFor(player.league);

  return (
    <motion.article
      initial="idle"
      animate="idle"
      whileHover="hover"
      whileTap={{ scale: 0.995 }}
      className={cn(
        "group relative isolate flex min-h-[76px] items-center gap-3 overflow-hidden rounded-[22px] border p-3 transition-colors sm:gap-4",
        isMe
          ? "border-blue-200 bg-gradient-to-r from-[#EFF6FF] via-white to-[#ECFEFF] shadow-[0_18px_38px_-28px_rgba(37,99,235,0.44)]"
          : "border-slate-100 bg-white/92 shadow-[0_14px_32px_-28px_rgba(15,23,42,0.28)]",
      )}
    >
      <motion.span
        aria-hidden
        className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: `radial-gradient(420px circle at 82% 50%, ${theme.glow}, transparent 55%)`,
        }}
      />
      <div className="relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-50 font-black text-slate-700 ring-1 ring-slate-100">
        {player.rank <= 6 ? <Medal className="h-4 w-4 text-amber-500" /> : null}
        <span className={cn(player.rank <= 6 && "sr-only")}>{player.rank}</span>
      </div>
      <div className="relative z-10">
        <PlayerAvatar player={player} className="h-12 w-12 rounded-[24%] text-xs" />
        <JsonHoverAnimation compact />
      </div>
      <div className="relative z-10 min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2">
          <p className="truncate text-sm font-black text-[#0F172A]">{player.name}</p>
          {isMe && (
            <span className="shrink-0 rounded-full bg-blue-100 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-blue-700">
              voce
            </span>
          )}
        </div>
        <div className="mt-1 flex min-w-0 flex-wrap items-center gap-1.5">
          <span className={cn("text-[11px] font-black uppercase tracking-wider", theme.text)}>
            Liga {player.league}
          </span>
          <span className="h-1 w-1 rounded-full bg-slate-300" />
          <span className="truncate text-[11px] font-bold text-slate-400">
            {player.targetExam ?? "ENEM"}
          </span>
        </div>
      </div>
      <div className="relative z-10 flex shrink-0 flex-col items-end">
        <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-3 py-1.5 text-xs font-black text-slate-700 ring-1 ring-slate-100">
          <Gem className="h-3.5 w-3.5 text-cyan-500" />
          {formatNumber(player.xp)}
        </span>
        <span className="mt-1 hidden text-[10px] font-black uppercase tracking-wider text-slate-400 sm:block">
          XP
        </span>
      </div>
    </motion.article>
  );
}

export function RankingLeaderboard({
  players,
  currentUserId,
  currentXp,
  currentLeague,
  myRank,
  totalUsers,
  xpToOvertake,
  nextName,
}: RankingLeaderboardProps) {
  const podium = [
    players[1] ? { player: players[1], position: 2 as const } : null,
    players[0] ? { player: players[0], position: 1 as const } : null,
    players[2] ? { player: players[2], position: 3 as const } : null,
  ].filter((item): item is { player: RankingPlayer; position: 1 | 2 | 3 } => Boolean(item));
  const rest = players.slice(3);

  return (
    <MotionConfig reducedMotion="user">
      <div className="space-y-6">
        <section className="grid gap-3 md:grid-cols-3">
          <StatCard
            icon={Trophy}
            label="Sua posicao"
            value={myRank ? `#${myRank}` : "Top 20+"}
            hint={`${formatNumber(totalUsers)} alunos na disputa`}
            tone="from-[#2563EB] to-[#22D3EE]"
          />
          <StatCard
            icon={Zap}
            label="Seu XP"
            value={formatNumber(currentXp)}
            hint={`Liga ${currentLeague}`}
            tone="from-[#FACC15] via-[#F97316] to-[#FB7185]"
          />
          <StatCard
            icon={Target}
            label="Proxima posicao"
            value={xpToOvertake > 0 ? `+${formatNumber(xpToOvertake)}` : "Top 1"}
            hint={nextName ? `Para ultrapassar ${firstName(nextName)}` : "Voce esta no topo"}
            tone="from-[#22C55E] to-[#86EFAC]"
          />
        </section>

        {podium.length > 0 && (
          <section className="relative isolate overflow-hidden rounded-[32px] border border-white/80 bg-[linear-gradient(180deg,#FFFFFF_0%,#FFF7ED_46%,#EFF6FF_100%)] px-4 pb-6 pt-6 shadow-[0_26px_64px_-40px_rgba(15,23,42,0.32)] sm:px-6 md:px-8">
            <div
              aria-hidden
              className="absolute inset-0 opacity-70"
              style={{
                background:
                  "repeating-conic-gradient(from 4deg at 50% 34%, rgba(250,204,21,0.16) 0deg, rgba(250,204,21,0.16) 4deg, transparent 4deg, transparent 12deg)",
                maskImage: "radial-gradient(circle at 50% 35%, #000 0%, transparent 62%)",
                WebkitMaskImage: "radial-gradient(circle at 50% 35%, #000 0%, transparent 62%)",
              }}
            />
            <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[#FACC15]/24 blur-3xl" />
            <div className="absolute -bottom-20 -left-16 h-52 w-52 rounded-full bg-[#22D3EE]/22 blur-3xl" />

            <div className="relative z-10 flex flex-col gap-3 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white text-amber-500 shadow-[0_14px_30px_-20px_rgba(15,23,42,0.5)] ring-1 ring-amber-100">
                <Crown className="h-6 w-6" />
              </div>
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-amber-700">
                  Podio da liga
                </p>
                <h2 className="mt-1 font-display text-2xl font-black text-[#0F172A] md:text-3xl">
                  Top 3 da semana
                </h2>
              </div>
              <div className="mx-auto mt-1 inline-flex items-center gap-2 rounded-full bg-white/78 px-3 py-1.5 text-[11px] font-bold text-slate-500 shadow-sm ring-1 ring-white">
                <RefreshCcw className="h-3.5 w-3.5 text-cyan-500" />
                Ranking atualizado agora
              </div>
            </div>

            <div className="relative z-10 mt-6 grid grid-cols-[0.82fr_1fr_0.82fr] items-end gap-1 sm:gap-4">
              {podium.map(({ player, position }) => (
                <PodiumSpot key={player.id} player={player} position={position} />
              ))}
            </div>
          </section>
        )}

        <section className="relative overflow-hidden rounded-[30px] border border-white/80 bg-white/88 p-4 shadow-[0_24px_56px_-38px_rgba(15,23,42,0.28)] backdrop-blur md:p-6">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#2563EB] to-[#22D3EE] text-white shadow-md">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-blue-700">
                  Classificacao geral
                </p>
                <h2 className="font-display text-xl font-black text-[#0F172A]">
                  Top 20 do EstudAki
                </h2>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-full bg-slate-50 px-3 py-2 text-xs font-black text-slate-500 ring-1 ring-slate-100">
              <UserRound className="h-4 w-4 text-blue-500" />
              Fotos, ligas e XP
            </div>
          </div>

          <div className="space-y-2.5">
            {rest.map((player) => (
              <RankingRow key={player.id} player={player} currentUserId={currentUserId} />
            ))}
            {rest.length === 0 && (
              <p className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-center text-sm font-bold text-slate-500">
                Ainda nao ha mais jogadores no ranking.
              </p>
            )}
          </div>
        </section>
      </div>
    </MotionConfig>
  );
}
