export { achievementCatalog } from "@/lib/achievement-catalog";

export const leagueTrack = [
  { name: "Bronze", min: 0, color: "#D0925B", reward: "Primeiros passos" },
  { name: "Prata", min: 1000, color: "#94A3B8", reward: "Ritmo consistente" },
  { name: "Ouro", min: 2500, color: "#FACC15", reward: "Meta diaria forte" },
  { name: "Platina", min: 4500, color: "#60A5FA", reward: "Simulados avancados" },
  { name: "Esmeralda", min: 7000, color: "#22C55E", reward: "Dominio por assunto" },
  { name: "Diamante", min: 10000, color: "#67E8F9", reward: "Elite EstudAki" },
];

export function nextLeagueForXp(xp: number) {
  return leagueTrack.find((league) => xp < league.min) ?? null;
}

export function leagueProgressForXp(xp: number) {
  const currentIndex = Math.max(
    0,
    leagueTrack.findIndex((league, index) => {
      const next = leagueTrack[index + 1];
      return xp >= league.min && (!next || xp < next.min);
    }),
  );
  const current = leagueTrack[currentIndex] ?? leagueTrack[0];
  const next = leagueTrack[currentIndex + 1] ?? null;
  if (!next) return { current, next, value: 100, remaining: 0 };
  const value = ((xp - current.min) / (next.min - current.min)) * 100;
  return {
    current,
    next,
    value: Math.max(0, Math.min(100, value)),
    remaining: Math.max(0, next.min - xp),
  };
}
