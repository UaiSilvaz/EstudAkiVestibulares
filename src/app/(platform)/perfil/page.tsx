import { Lock, Sparkles } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { AppearanceSettings } from "@/components/appearance-settings";
import { LeagueBadge } from "@/components/visual/league-badge";
import { MetricCard } from "@/components/metric-card";
import { PageHeader } from "@/components/page-header";
import { ProfilePhotoManager } from "@/components/profile-photo-manager";
import { getPersistedUserId, requireUser } from "@/lib/auth";
import { getActivePreparationContext } from "@/lib/preparations";
import { rankProgressForXp, rankTrackForObjective } from "@/lib/progression";

export default async function PerfilPage() {
  const user = await requireUser();
  const persistedUserId = await getPersistedUserId(user);
  const preparationContext = persistedUserId ? await getActivePreparationContext(persistedUserId) : null;
  const activeVertical = preparationContext?.active?.vertical.slug ?? "vestibular";
  const progress = rankProgressForXp(user.xp);
  const leagueTrack = rankTrackForObjective(undefined);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Perfil"
        title="Seu jogador Norte Preparatórios"
        description="Acompanhe sua liga, XP, sequência e as próximas recompensas bloqueadas."
      />

      <section className="theme-focus-panel relative overflow-hidden rounded-[18px] p-6 text-white shadow-sm md:p-8" style={{ background: "var(--theme-gradient-stat)" }}>
        <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/20 blur-3xl" />
        <div className="absolute -bottom-16 -left-12 h-48 w-48 rounded-full bg-[#A78BFA]/24 blur-3xl" />
        <div className="relative z-10 grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="flex items-center gap-5">
            <div className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-[18px] bg-white/22 text-2xl font-semibold text-white shadow-sm ring-1 ring-white/35 backdrop-blur">
              {user.avatarUrl ? (
                <Image
                  src={user.avatarUrl}
                  alt={user.name}
                  width={160}
                  height={160}
                  className="h-full w-full object-cover"
                  priority
                />
              ) : (
                user.name.slice(0, 2).toUpperCase()
              )}
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-white/78">
                Aluno
              </p>
              <h1 className="mt-1 font-display text-4xl font-semibold tracking-tight">
                {user.name}
              </h1>
              <p className="mt-2 max-w-xl text-sm font-bold text-white/86">
                {user.xp.toLocaleString("pt-BR")} XP acumulados. {progress.next ? `${progress.remaining.toLocaleString("pt-BR")} XP para a liga ${progress.next.name}.` : "Você chegou ao topo da trilha."}
              </p>
            </div>
          </div>
          <div className="flex justify-start lg:justify-end">
            <LeagueBadge league={progress.current.name} xp={user.xp} size="xl" />
          </div>
        </div>
        <div className="relative z-10 mt-7 max-w-3xl">
          <div className="mb-2 flex justify-between text-[10px] font-semibold uppercase tracking-wider text-white/78">
            <span>{progress.current.name}</span>
            <span>{progress.next?.name ?? "Maximo"}</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-white/24">
            <div
              className="h-full rounded-full bg-white/90"
              style={{ width: `${progress.value}%` }}
            />
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard label="XP total" value={user.xp} iconName="trophy" variant="yellow" hint="Pontuação da sua jornada" />
        <MetricCard label="Sequência" value={`${user.streak}d`} iconName="flame" variant="orange" hint="Dias mantendo ritmo" />
        <MetricCard label="Meta" value={user.targetExam ?? "ENEM"} iconName="graduationCap" variant="purple" hint="Vestibular principal" />
      </section>

      <ProfilePhotoManager user={user} />

      <AppearanceSettings verticalSlug={activeVertical} />

      <section id="ligas" className="scroll-mt-24 space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-violet-700">
              Ligas
            </p>
            <h2 className="font-display text-2xl font-semibold text-[#0F172A]">
              Trilha de emblemas
            </h2>
          </div>
          <Link href="/conquistas" className="inline-flex items-center gap-2 rounded-full    px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white shadow-md professional-action">
            Ver conquistas <Sparkles className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {leagueTrack.map((league) => {
            const unlocked = user.xp >= league.min;
            return (
              <article
                key={league.name}
                className={`relative overflow-hidden rounded-[18px] border p-5 shadow-sm ${
                  unlocked
                    ? "border-white/70    professional-neutral"
                    : "border-slate-200 bg-slate-50 opacity-75"
                }`}
              >
                <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-blue-200/30 blur-2xl" />
                <div className="relative z-10 flex items-center justify-between gap-4">
                  <LeagueBadge league={league.name} xp={league.min} size="lg" />
                  {!unlocked && (
                    <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-sm">
                      <Lock className="h-5 w-5" />
                    </span>
                  )}
                </div>
                <p className="relative z-10 mt-4 text-sm font-bold text-slate-600">
                  {league.reward}
                </p>
                <p className="relative z-10 mt-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  {league.min.toLocaleString("pt-BR")} XP
                </p>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
