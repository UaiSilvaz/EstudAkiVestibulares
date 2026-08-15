import { Crown, Medal, TrendingUp } from "lucide-react";
import { LeagueBadge } from "@/components/visual/league-badge";
import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { leagueForXp } from "@/lib/utils";
import type { User } from "@prisma/client";

const LEAGUE_STYLE: Record<string, { ring: string; bg: string; text: string; icon: string; chip: string }> = {
  Diamante:  { ring: "from-[#67E8F9] to-[#A78BFA]", bg: "from-[#ECFEFF] to-[#F5F3FF]", text: "text-violet-700", icon: "from-[#22D3EE] to-[#A78BFA]", chip: "from-[#22D3EE] to-[#A78BFA]" },
  Esmeralda: { ring: "from-[#22C55E] to-[#86EFAC]", bg: "from-[#ECFDF5] to-[#D1FAE5]", text: "text-emerald-700", icon: "from-[#22C55E] to-[#86EFAC]", chip: "from-[#22C55E] to-[#86EFAC]" },
  Platina:   { ring: "from-[#60A5FA] to-[#A5F3FC]", bg: "from-[#EFF6FF] to-[#ECFEFF]", text: "text-cyan-700",   icon: "from-[#3B82F6] to-[#22D3EE]", chip: "from-[#3B82F6] to-[#22D3EE]" },
  Ouro:      { ring: "from-[#FACC15] to-[#FDE047]", bg: "from-[#FEFCE8] to-[#FEF3C7]", text: "text-amber-700",  icon: "from-[#FACC15] to-[#F97316]", chip: "from-[#FACC15] to-[#F97316]" },
  Prata:     { ring: "from-[#94A3B8] to-[#CBD5E1]", bg: "from-[#F1F5F9] to-[#E2E8F0]", text: "text-slate-700",  icon: "from-[#94A3B8] to-[#CBD5E1]", chip: "from-[#94A3B8] to-[#CBD5E1]" },
  Bronze:    { ring: "from-[#FB923C] to-[#FDBA74]", bg: "from-[#FFF7ED] to-[#FFEDD5]", text: "text-orange-700", icon: "from-[#FB923C] to-[#F97316]", chip: "from-[#FB923C] to-[#F97316]" },
};

export default async function RankingPage() {
  const currentUser = await requireUser();
  let users: Pick<User, "id" | "name" | "email" | "xp" | "league">[] = [];

  try {
    users = await db.user.findMany({
      orderBy: { xp: "desc" },
      take: 20,
      select: { id: true, name: true, email: true, xp: true, league: true },
    });
  } catch {
    users = [
      {
        id: currentUser.id,
        name: currentUser.name,
        email: currentUser.email,
        xp: currentUser.xp,
        league: currentUser.league,
      },
      { id: "local-ranking-1", name: "Ana ENEM", email: "ana@example.local", xp: 9600, league: "Diamante" },
      { id: "local-ranking-2", name: "Lucas FUVEST", email: "lucas@example.local", xp: 7850, league: "Platina" },
      { id: "local-ranking-3", name: "Marina UNICAMP", email: "marina@example.local", xp: 6420, league: "Ouro" },
    ].sort((a, b) => b.xp - a.xp);
  }

  const rankedUsers = users.map((u) => ({ ...u, league: leagueForXp(u.xp) }));
  const currentLeague = leagueForXp(currentUser.xp);
  const myIndex = rankedUsers.findIndex((u) => u.id === currentUser.id);
  const myRank = myIndex >= 0 ? myIndex + 1 : null;
  const next = myRank && myRank > 1 ? rankedUsers[myRank - 2] : null;
  const xpToOvertake = next ? Math.max(0, next.xp - currentUser.xp + 1) : 0;

  const podium = rankedUsers.slice(0, 3);
  const rest = rankedUsers.slice(3);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Ranking"
        title="Ligas e XP"
        description="Competição saudável por constância, questões resolvidas, revisões e desafios. A liga é a sua turma, o XP é o seu ritmo."
      />

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-blue-100 bg-gradient-to-br from-[#EFF6FF] to-white p-5 shadow-[0_18px_40px_-22px_rgba(15,23,42,0.10)]">
          <p className="text-[10px] font-black uppercase tracking-wider text-blue-700">Sua posição</p>
          <p className="mt-1 font-display text-3xl font-extrabold text-[#0F172A]">
            {myRank ? `#${myRank}` : "—"}
          </p>
          <p className="mt-1 text-xs font-semibold text-slate-500">de {rankedUsers.length} alunos</p>
        </div>
        <div className="rounded-3xl border border-amber-100 bg-gradient-to-br from-[#FEFCE8] to-white p-5 shadow-[0_18px_40px_-22px_rgba(15,23,42,0.10)]">
          <p className="text-[10px] font-black uppercase tracking-wider text-amber-700">Seu XP</p>
          <p className="mt-1 font-display text-3xl font-extrabold text-[#0F172A]">
            {currentUser.xp.toLocaleString("pt-BR")}
          </p>
          <div className="mt-2">
            <LeagueBadge league={currentLeague} size="sm" />
          </div>
        </div>
        <div className="rounded-3xl border border-emerald-100 bg-gradient-to-br from-[#ECFDF5] to-white p-5 shadow-[0_18px_40px_-22px_rgba(15,23,42,0.10)]">
          <p className="text-[10px] font-black uppercase tracking-wider text-emerald-700">Próxima posição</p>
          <p className="mt-1 font-display text-3xl font-extrabold text-[#0F172A]">
            {xpToOvertake > 0 ? `+${xpToOvertake} XP` : "Top 1!"}
          </p>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            {next ? `Para ultrapassar ${next.name.split(" ")[0]}` : "Você está no topo"}
          </p>
        </div>
      </section>

      {/* Pódio */}
      {podium.length > 0 && (
        <section className="rounded-[28px] border border-slate-100 bg-white p-6 shadow-[0_18px_40px_-22px_rgba(15,23,42,0.10)] md:p-7">
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-amber-700">
            Pódio da liga
          </p>
          <h2 className="mt-1 font-display text-xl font-extrabold text-[#0F172A]">
            Top 3 da semana
          </h2>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {podium.map((u, idx) => {
              const league = LEAGUE_STYLE[u.league] ?? LEAGUE_STYLE.Bronze;
              const heights = ["md:mt-8", "md:mt-0", "md:mt-12"];
              return (
                <div
                  key={u.id}
                  className={`relative overflow-hidden rounded-3xl border border-slate-100 bg-gradient-to-br p-5 shadow-[0_18px_40px_-22px_rgba(15,23,42,0.10)] ${league.bg} ${heights[idx]}`}
                >
                  <div
                    aria-hidden
                    className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-30 blur-2xl"
                    style={{ background: "linear-gradient(135deg, #FACC15, #FB7185)" }}
                  />
                  <div className="relative flex items-center gap-3">
                    <LeagueBadge league={u.league} size="md" showLabel={false} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-extrabold text-[#0F172A]">{u.name}</p>
                      <p className={`text-[10px] font-black uppercase tracking-wider ${league.text}`}>
                        #{idx + 1} · Liga {u.league}
                      </p>
                    </div>
                    {idx === 0 && <Crown className="h-5 w-5 shrink-0 text-amber-500" />}
                    <span
                      className={`rounded-full bg-gradient-to-r px-2.5 py-1 text-[10px] font-black text-white ${league.chip}`}
                    >
                      {u.xp} XP
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Lista completa */}
      <section className="rounded-[28px] border border-slate-100 bg-white p-6 shadow-[0_18px_40px_-22px_rgba(15,23,42,0.10)] md:p-7">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[#FACC15] via-[#FDE047] to-[#F97316] text-white shadow-md">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-amber-700">
              Classificação geral
            </p>
            <h2 className="font-display text-xl font-extrabold text-[#0F172A]">
              Top 20 do EstudAki
            </h2>
          </div>
        </div>
        <div className="space-y-2">
          {rest.map((u, index) => {
            const realIndex = index + 3;
            const isMe = u.id === currentUser.id;
            const league = LEAGUE_STYLE[u.league] ?? LEAGUE_STYLE.Bronze;
            return (
              <div
                key={u.id}
                className={`flex items-center gap-4 rounded-2xl border p-3.5 transition ${
                  isMe
                    ? "border-blue-200 bg-gradient-to-r from-[#EFF6FF] to-white shadow-[0_10px_24px_-12px_rgba(37,99,235,0.30)]"
                    : "border-slate-100 bg-white"
                }`}
              >
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-2xl font-black ring-1 ring-slate-100 ${
                    isMe
                      ? "bg-gradient-to-br from-[#2563EB] to-[#22D3EE] text-white"
                      : "bg-slate-50 text-slate-700"
                  }`}
                >
                  {realIndex + 1}
                </div>
                <LeagueBadge league={u.league} size="sm" showLabel={false} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-extrabold text-[#0F172A]">{u.name}</p>
                    {isMe && (
                      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-blue-700">
                        você
                      </span>
                    )}
                  </div>
                  <p className={`text-[11px] font-bold ${league.text}`}>Liga {u.league}</p>
                </div>
                <div className="flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1.5 text-xs font-black text-slate-700">
                  <Medal className="h-3.5 w-3.5 text-amber-500" />
                  {u.xp.toLocaleString("pt-BR")} XP
                </div>
              </div>
            );
          })}
          {rest.length === 0 && (
            <p className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-center text-sm text-slate-500">
              Ainda não há mais jogadores no ranking.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
