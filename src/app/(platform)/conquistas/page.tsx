import { Lock, Sparkles, Trophy } from "lucide-react";
import Link from "next/link";
import { LeagueBadge } from "@/components/visual/league-badge";
import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/auth";
import {
  type Achievement,
  achievementCatalog,
  leagueProgressForXp,
  leagueTrack,
} from "@/lib/gamification";

const COLOR_STYLE = {
  blue: {
    bg: "linear-gradient(135deg, #1D9BF0 0%, #18B7F7 52%, #1DD7D0 100%)",
    glow: "rgba(14,165,233,0.44)",
  },
  orange: {
    bg: "linear-gradient(135deg, #FF8A18 0%, #FFA51F 52%, #FFE01B 100%)",
    glow: "rgba(251,146,60,0.48)",
  },
  cyan: {
    bg: "linear-gradient(135deg, #06B6D4 0%, #22D3EE 55%, #67E8F9 100%)",
    glow: "rgba(34,211,238,0.44)",
  },
  pink: {
    bg: "linear-gradient(135deg, #F51BA2 0%, #FF35C7 52%, #FF67D8 100%)",
    glow: "rgba(236,72,153,0.44)",
  },
  purple: {
    bg: "linear-gradient(135deg, #6B2CF5 0%, #8A42FF 52%, #A569FF 100%)",
    glow: "rgba(124,58,237,0.46)",
  },
  silver: {
    bg: "linear-gradient(135deg, #94A3B8 0%, #CBD5E1 52%, #F8FAFC 100%)",
    glow: "rgba(148,163,184,0.48)",
  },
  yellow: {
    bg: "linear-gradient(135deg, #FF9518 0%, #FFB21E 52%, #FFE01B 100%)",
    glow: "rgba(250,204,21,0.48)",
  },
  green: {
    bg: "linear-gradient(135deg, #36D66E 0%, #42DF85 52%, #5CE6BD 100%)",
    glow: "rgba(34,197,94,0.44)",
  },
};

function achievementProgress(achievement: Achievement, user: Awaited<ReturnType<typeof requireUser>>) {
  switch (achievement.metric) {
    case "login":
      return 1;
    case "xp":
    case "league":
      return user.xp;
    case "streak":
      return user.streak;
    case "daily":
      return Math.floor(user.xp / 80) + user.streak;
    case "errors":
      return Math.floor(user.xp / 180) + Math.floor(user.streak / 2);
    case "simulations":
      return Math.floor(user.xp / 650) + Math.floor(user.streak / 14);
    case "accuracy":
      return Math.min(100, Math.floor(54 + user.streak * 1.8 + user.xp / 900));
    case "ranking":
      return user.xp >= 4500 || user.streak >= 30 ? 1 : 0;
    case "materials":
      return Math.floor(user.xp / 260) + Math.floor((user.weeklyHours ?? 0) / 2);
    case "videos":
      return Math.floor(user.xp / 320) + Math.floor(user.streak / 3);
    case "writing":
      return Math.floor(user.xp / 700) + Math.floor(user.streak / 10);
    case "focus":
      return Math.floor(user.xp / 240) + user.streak + (user.weeklyHours ?? 0);
    default:
      return 0;
  }
}

export default async function ConquistasPage() {
  const user = await requireUser();
  const leagueProgress = leagueProgressForXp(user.xp);
  const unlockedCount = achievementCatalog.filter((achievement) => {
    const value = achievementProgress(achievement, user);
    return achievement.target <= 0 || value >= achievement.target;
  }).length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Conquistas"
        title="Colecione emblemas"
        highlight="e suba de liga"
        description="Cada meta destravada vira um trofeu visual para acompanhar sua evolucao."
        action={
          <Link
            href="/perfil"
            className="inline-flex h-11 items-center gap-2 rounded-full bg-gradient-to-r from-[#2563EB] to-[#22D3EE] px-5 text-xs font-black uppercase tracking-wider text-white shadow-md"
          >
            Ver perfil <Sparkles className="h-4 w-4" />
          </Link>
        }
      />

      <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <article className="relative overflow-hidden rounded-[30px] bg-gradient-to-br from-[#6B2CF5] via-[#1D9BF0] to-[#1DD7D0] p-6 text-white shadow-[0_28px_64px_-34px_rgba(37,99,235,0.62)] md:p-8">
          <div className="absolute -right-12 -top-16 h-56 w-56 rounded-full bg-white/20 blur-3xl" />
          <div className="absolute -bottom-16 left-12 h-44 w-44 rounded-full bg-[#FFE01B]/20 blur-3xl" />
          <div className="relative z-10 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-white/75">
                Colecao atual
              </p>
              <h2 className="mt-2 font-display text-4xl font-black leading-none">
                {unlockedCount}/{achievementCatalog.length}
              </h2>
              <p className="mt-2 max-w-xl text-sm font-bold leading-6 text-white/82">
                Continue respondendo questoes e revisando erros para liberar os emblemas raros.
              </p>
            </div>
            <div className="flex items-center gap-4 rounded-[26px] border border-white/25 bg-white/16 p-4 backdrop-blur">
              <LeagueBadge league={user.league} size="xl" />
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-white/70">
                  Liga ativa
                </p>
                <p className="text-xl font-black">{leagueProgress.current.name}</p>
              </div>
            </div>
          </div>
        </article>

        <article className="relative overflow-hidden rounded-[30px] border border-amber-200 bg-gradient-to-br from-white to-[#FFF7ED] p-6 shadow-[0_22px_48px_-34px_rgba(15,23,42,0.36)] md:p-8">
          <Trophy className="absolute -right-5 -bottom-5 h-36 w-36 rotate-[-10deg] text-amber-200/70" />
          <div className="relative z-10">
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-amber-700">
              Proxima recompensa
            </p>
            <h2 className="mt-2 font-display text-3xl font-black text-[#0F172A]">
              {leagueProgress.next?.name ?? "Elite completa"}
            </h2>
            <p className="mt-2 text-sm font-bold leading-6 text-slate-600">
              {leagueProgress.next
                ? `Faltam ${leagueProgress.remaining.toLocaleString("pt-BR")} XP para desbloquear a proxima liga.`
                : "Voce ja desbloqueou todas as ligas atuais."}
            </p>
            <div className="mt-5 h-3 overflow-hidden rounded-full bg-amber-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#FF9518] via-[#FFB21E] to-[#FFE01B]"
                style={{ width: `${leagueProgress.value}%` }}
              />
            </div>
          </div>
        </article>
      </section>

      <section className="space-y-4">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-blue-700">
            Emblemas de liga
          </p>
          <h2 className="font-display text-2xl font-black text-[#0F172A]">
            Bronze, Prata, Ouro, Platina, Esmeralda e Diamante
          </h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
          {leagueTrack.map((league) => {
            const unlocked = user.xp >= league.min;

            return (
              <article
                key={league.name}
                className={`relative overflow-hidden rounded-[26px] border p-5 text-center shadow-[0_20px_46px_-30px_rgba(15,23,42,0.32)] ${
                  unlocked
                    ? "border-white/70 bg-gradient-to-br from-white to-[#ECFEFF]"
                    : "border-slate-200 bg-slate-50 opacity-80"
                }`}
              >
                <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-blue-200/30 blur-2xl" />
                <div className="relative z-10 flex justify-center">
                  <LeagueBadge league={league.name} size="lg" showLabel={false} />
                </div>
                <h3 className="relative z-10 mt-4 font-display text-xl font-black text-[#0F172A]">
                  {league.name}
                </h3>
                <p className="relative z-10 mt-1 text-xs font-bold leading-5 text-slate-500">
                  {league.reward}
                </p>
                <div className="relative z-10 mt-4 inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-black uppercase tracking-wider text-slate-500">
                  {unlocked ? "Liberado" : `${league.min.toLocaleString("pt-BR")} XP`}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {achievementCatalog.map((achievement, index) => {
          const Icon = achievement.icon;
          const style = COLOR_STYLE[achievement.color as keyof typeof COLOR_STYLE] ?? COLOR_STYLE.blue;
          const value = achievementProgress(achievement, user);
          const progress = achievement.target <= 0 ? 100 : Math.min(100, Math.round((value / achievement.target) * 100));
          const unlocked = progress >= 100;

          return (
            <article
              key={achievement.slug}
              className="group relative min-h-[210px] overflow-hidden rounded-[26px] p-5 text-white shadow-[0_24px_46px_-28px_rgba(15,23,42,0.38)] transition duration-300 hover:-translate-y-1"
              style={{ background: unlocked ? style.bg : "linear-gradient(135deg, #CBD5E1 0%, #94A3B8 52%, #64748B 100%)" }}
            >
              <div
                aria-hidden
                className="absolute -right-14 -top-12 h-44 w-44 rounded-full opacity-70 blur-3xl transition group-hover:opacity-90"
                style={{ background: style.glow }}
              />
              <div className="absolute -right-8 bottom-2 flex h-32 w-32 rotate-[-12deg] items-center justify-center rounded-[32px] bg-white/16 text-white/34">
                <Icon className="h-20 w-20" strokeWidth={2.1} />
              </div>
              <div className="relative z-10 flex h-full flex-col">
                <div className="mb-5 flex items-center justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/22 text-white ring-1 ring-white/34 backdrop-blur">
                    <Icon className="h-6 w-6" />
                  </div>
                  <span className="rounded-full border border-white/28 bg-white/18 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-white/86 backdrop-blur">
                    {achievement.rarity ?? (unlocked ? "Liberada" : "Bloqueada")}
                  </span>
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/74">
                  Emblema #{String(index + 1).padStart(2, "0")}
                </p>
                <h3 className="mt-2 font-display text-2xl font-black leading-none">
                  {achievement.title}
                </h3>
                <p className="mt-2 max-w-[78%] text-xs font-bold leading-5 text-white/86">
                  {achievement.description}
                </p>
                <div className="mt-auto pt-5">
                  <div className="mb-2 flex justify-between text-[10px] font-black uppercase tracking-wider text-white/76">
                    <span>
                      {achievement.target <= 0
                        ? "Livre"
                        : `${Math.min(value, achievement.target).toLocaleString("pt-BR")}/${achievement.target.toLocaleString("pt-BR")}`}
                    </span>
                    <span>{progress}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-white/22">
                    <div className="h-full rounded-full bg-white/90" style={{ width: `${progress}%` }} />
                  </div>
                </div>
                {!unlocked && (
                  <Lock className="absolute right-0 top-16 h-6 w-6 text-white/70" />
                )}
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}
