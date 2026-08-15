import { Lock, Sparkles } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { LeagueBadge } from "@/components/visual/league-badge";
import { MetricCard } from "@/components/metric-card";
import { PageHeader } from "@/components/page-header";
import { ProfilePhotoManager } from "@/components/profile-photo-manager";
import { requireUser } from "@/lib/auth";
import { leagueProgressForXp, leagueTrack } from "@/lib/gamification";

export default async function PerfilPage() {
  const user = await requireUser();
  const progress = leagueProgressForXp(user.xp);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Perfil"
        title="Seu jogador EstudAki"
        description="Acompanhe sua liga, XP, sequencia e as proximas recompensas bloqueadas."
      />

      <section className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-[#1D9BF0] via-[#18B7F7] to-[#1DD7D0] p-6 text-white shadow-[0_30px_70px_-36px_rgba(14,165,233,0.58)] md:p-8">
        <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/20 blur-3xl" />
        <div className="absolute -bottom-16 -left-12 h-48 w-48 rounded-full bg-[#A78BFA]/24 blur-3xl" />
        <div className="relative z-10 grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="flex items-center gap-5">
            <div className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-[28px] bg-white/22 text-2xl font-black text-white shadow-[0_18px_34px_-20px_rgba(15,23,42,0.55)] ring-1 ring-white/35 backdrop-blur">
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
              <p className="text-[11px] font-black uppercase tracking-[0.26em] text-white/78">
                Aluno
              </p>
              <h1 className="mt-1 font-display text-4xl font-black tracking-tight">
                {user.name}
              </h1>
              <p className="mt-2 max-w-xl text-sm font-bold text-white/86">
                {user.xp.toLocaleString("pt-BR")} XP acumulados. {progress.next ? `${progress.remaining.toLocaleString("pt-BR")} XP para a liga ${progress.next.name}.` : "Você chegou ao topo da trilha."}
              </p>
            </div>
          </div>
          <div className="flex justify-start lg:justify-end">
            <LeagueBadge league={progress.current.name} size="xl" />
          </div>
        </div>
        <div className="relative z-10 mt-7 max-w-3xl">
          <div className="mb-2 flex justify-between text-[10px] font-black uppercase tracking-wider text-white/78">
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
        <MetricCard label="XP total" value={user.xp} iconName="trophy" variant="yellow" hint="Pontuacao da sua jornada" />
        <MetricCard label="Sequencia" value={`${user.streak}d`} iconName="flame" variant="orange" hint="Dias mantendo ritmo" />
        <MetricCard label="Meta" value={user.targetExam ?? "ENEM"} iconName="graduationCap" variant="purple" hint="Vestibular principal" />
      </section>

      <ProfilePhotoManager user={user} />

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-violet-700">
              Ligas
            </p>
            <h2 className="font-display text-2xl font-black text-[#0F172A]">
              Trilha de emblemas
            </h2>
          </div>
          <Link href="/conquistas" className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#6B2CF5] to-[#22D3EE] px-4 py-2 text-xs font-black uppercase tracking-wider text-white shadow-md">
            Ver conquistas <Sparkles className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {leagueTrack.map((league) => {
            const unlocked = user.xp >= league.min;
            return (
              <article
                key={league.name}
                className={`relative overflow-hidden rounded-[26px] border p-5 shadow-[0_20px_46px_-30px_rgba(15,23,42,0.28)] ${
                  unlocked
                    ? "border-white/70 bg-gradient-to-br from-white to-[#ECFEFF]"
                    : "border-slate-200 bg-slate-50 opacity-75"
                }`}
              >
                <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-blue-200/30 blur-2xl" />
                <div className="relative z-10 flex items-center justify-between gap-4">
                  <LeagueBadge league={league.name} size="lg" />
                  {!unlocked && (
                    <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-sm">
                      <Lock className="h-5 w-5" />
                    </span>
                  )}
                </div>
                <p className="relative z-10 mt-4 text-sm font-bold text-slate-600">
                  {league.reward}
                </p>
                <p className="relative z-10 mt-2 text-[11px] font-black uppercase tracking-wider text-slate-400">
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
