export type ProgressionKind =
  | "vestibular"
  | "juridica"
  | "policial"
  | "concurso"
  | "militar"
  | "default";

export type ProgressionRank = {
  name: string;
  min: number;
  color: string;
  reward: string;
};

export const progressionTracks: Record<ProgressionKind, ProgressionRank[]> = {
  vestibular: [
    { name: "Aluno", min: 0, color: "#2563EB", reward: "Primeiros blocos" },
    { name: "Aplicado", min: 1000, color: "#16803D", reward: "Rotina em dia" },
    { name: "Inteligente", min: 2500, color: "#0EA5E9", reward: "Listas consistentes" },
    { name: "Crânio", min: 4500, color: "#155EEF", reward: "Simulados avançados" },
    { name: "Gênio", min: 7000, color: "#0B1F51", reward: "Domínio por área" },
    { name: "Aprovado", min: 10000, color: "#F59E0B", reward: "Elite EstudAki" },
  ],
  juridica: [
    { name: "Cidadão", min: 0, color: "#2563EB", reward: "Base jurídica" },
    { name: "Bacharelando", min: 1000, color: "#16803D", reward: "Doutrina essencial" },
    { name: "Estagiário", min: 2500, color: "#0EA5E9", reward: "Questões por disciplina" },
    { name: "Advogado", min: 4500, color: "#155EEF", reward: "Peças e simulados" },
    { name: "Juiz", min: 7000, color: "#0B1F51", reward: "Alta performance" },
    { name: "Desembargador", min: 10000, color: "#F59E0B", reward: "Excelencia juridica" },
  ],
  policial: [
    { name: "Soldado", min: 0, color: "#2563EB", reward: "Base operacional" },
    { name: "Cabo", min: 1000, color: "#16803D", reward: "Ritmo de treino" },
    { name: "Sargento", min: 2500, color: "#0EA5E9", reward: "Questões por banca" },
    { name: "Tenente", min: 4500, color: "#155EEF", reward: "Simulados táticos" },
    { name: "Capitão", min: 7000, color: "#0B1F51", reward: "Domínio do edital" },
    { name: "Comandante", min: 10000, color: "#F59E0B", reward: "Pronto para a prova" },
  ],
  concurso: [
    { name: "Candidato", min: 0, color: "#2563EB", reward: "Edital mapeado" },
    { name: "Nomeado", min: 1000, color: "#16803D", reward: "Base consolidada" },
    { name: "Servidor", min: 2500, color: "#0EA5E9", reward: "Banca dominada" },
    { name: "Analista", min: 4500, color: "#155EEF", reward: "Simulados avançados" },
    { name: "Especialista", min: 7000, color: "#0B1F51", reward: "Alta consistência" },
    { name: "Aprovado", min: 10000, color: "#F59E0B", reward: "Pronto para nomeação" },
  ],
  militar: [
    { name: "Recruta", min: 0, color: "#2563EB", reward: "Base de marcha" },
    { name: "Soldado", min: 1000, color: "#16803D", reward: "Rotina firme" },
    { name: "Cabo", min: 2500, color: "#0EA5E9", reward: "Conteudo essencial" },
    { name: "Sargento", min: 4500, color: "#155EEF", reward: "Treino por prova" },
    { name: "Tenente", min: 7000, color: "#0B1F51", reward: "Domínio estratégico" },
    { name: "Capitão", min: 10000, color: "#F59E0B", reward: "Pronto para incorporação" },
  ],
  default: [
    { name: "Bronze", min: 0, color: "#D0925B", reward: "Primeiros passos" },
    { name: "Prata", min: 1000, color: "#94A3B8", reward: "Ritmo consistente" },
    { name: "Ouro", min: 2500, color: "#FACC15", reward: "Meta diaria forte" },
    { name: "Platina", min: 4500, color: "#60A5FA", reward: "Simulados avançados" },
    { name: "Esmeralda", min: 7000, color: "#22C55E", reward: "Dominio por assunto" },
    { name: "Diamante", min: 10000, color: "#67E8F9", reward: "Elite EstudAki" },
  ],
};

function normalizeObjective(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function progressionKindForObjective(
  objective: string | null | undefined,
): ProgressionKind {
  const normalized = normalizeObjective(objective);

  if (
    normalized.includes("oab") ||
    normalized.includes("direito") ||
    normalized.includes("advoc") ||
    normalized.includes("juiz") ||
    normalized.includes("magistr") ||
    normalized.includes("promotor")
  ) {
    return "juridica";
  }

  if (
    normalized.includes("policia") ||
    normalized.includes("policial") ||
    normalized.includes("pm ") ||
    normalized.includes("guarda") ||
    normalized.includes("soldado") ||
    normalized.includes("delegado") ||
    normalized.includes("investigador") ||
    normalized.includes("escrivao")
  ) {
    return "policial";
  }

  if (
    normalized.includes("esa") ||
    normalized.includes("espcex") ||
    normalized.includes("afa") ||
    normalized.includes("eear") ||
    normalized.includes("epcar") ||
    normalized.includes("militar") ||
    normalized.includes("ime") ||
    normalized.includes("ita")
  ) {
    return "militar";
  }

  if (
    normalized.includes("concurso") ||
    normalized.includes("tribunal") ||
    normalized.includes("tj") ||
    normalized.includes("trf") ||
    normalized.includes("fiscal") ||
    normalized.includes("vunesp") ||
    normalized.includes("cespe") ||
    normalized.includes("cebraspe")
  ) {
    return "concurso";
  }

  if (
    normalized.includes("enem") ||
    normalized.includes("vestibular") ||
    normalized.includes("fuvest") ||
    normalized.includes("unesp") ||
    normalized.includes("unicamp") ||
    normalized.includes("etec") ||
    normalized.includes("fatec") ||
    normalized.includes("medicina") ||
    normalized.includes("provao")
  ) {
    return "vestibular";
  }

  return objective ? "vestibular" : "default";
}

export function rankTrackForObjective(objective: string | null | undefined) {
  return progressionTracks[progressionKindForObjective(objective)];
}

export function progressionLabelForObjective(
  objective: string | null | undefined,
) {
  const kind = progressionKindForObjective(objective);
  if (kind === "policial" || kind === "militar") return "Patente";
  if (kind === "juridica") return "Carreira";
  if (kind === "concurso") return "Etapa";
  if (kind === "vestibular") return "Evolução";
  return "Liga";
}

export function rankForXp(xp: number, objective?: string | null) {
  const track = rankTrackForObjective(objective);
  return (
    [...track].reverse().find((rank) => xp >= rank.min)?.name ?? track[0].name
  );
}

export function nextRankForXp(xp: number, objective?: string | null) {
  return rankTrackForObjective(objective).find((rank) => xp < rank.min) ?? null;
}

export function rankProgressForXp(xp: number, objective?: string | null) {
  const track = rankTrackForObjective(objective);
  const currentIndex = Math.max(
    0,
    track.findIndex((rank, index) => {
      const next = track[index + 1];
      return xp >= rank.min && (!next || xp < next.min);
    }),
  );
  const current = track[currentIndex] ?? track[0];
  const next = track[currentIndex + 1] ?? null;
  if (!next) return { current, next, value: 100, remaining: 0, track };

  const value = ((xp - current.min) / (next.min - current.min)) * 100;
  return {
    current,
    next,
    value: Math.max(0, Math.min(100, value)),
    remaining: Math.max(0, next.min - xp),
    track,
  };
}
