import type { OldExamRecord } from "@/lib/old-exams";

export type OldExamDocumentKind = "prova" | "gabarito";

type EnemDay = 1 | 2;
type RemoteDocumentPair = Record<OldExamDocumentKind, string>;
type VestibularLookup = string | { name?: string | null; slug?: string | null } | null | undefined;

export type OldExamDocumentLookup = {
  id?: string | null;
  slug?: string | null;
  vestibular?: VestibularLookup;
  ano?: number | null;
  year?: number | null;
  titulo?: string | null;
  title?: string | null;
  fase?: string | null;
  phase?: string | null;
  dia?: string | null;
  day?: string | null;
};

const oldEnemBase = "https://download.inep.gov.br/educacao_basica/enem";
const newEnemBase = "https://download.inep.gov.br/enem/provas_e_gabaritos";

const enemRemoteDocuments: Record<number, Record<EnemDay, RemoteDocumentPair>> = {
  2009: {
    1: {
      prova: `${oldEnemBase}/provas/2009/dia1_caderno1_azul.pdf`,
      gabarito: `${oldEnemBase}/gabaritos/2009/gabarito_dia1.pdf`,
    },
    2: {
      prova: `${oldEnemBase}/provas/2009/dia2_caderno7_azul.pdf`,
      gabarito: `${oldEnemBase}/gabaritos/2009/gabarito_dia2.pdf`,
    },
  },
  2010: {
    1: {
      prova: `${oldEnemBase}/provas/2010/dia1_caderno1_azul.pdf`,
      gabarito: `${oldEnemBase}/provas/2010/dia1_caderno1_azul_com_gab.pdf`,
    },
    2: {
      prova: `${oldEnemBase}/provas/2010/dia2_caderno5_amarelo.pdf`,
      gabarito: `${oldEnemBase}/provas/2010/dia2_caderno5_amarelo_com_gab.pdf`,
    },
  },
  2011: {
    1: {
      prova: `${oldEnemBase}/provas/2011/dia1_caderno1_azul.pdf`,
      gabarito: `${oldEnemBase}/gabaritos/2011/01_AZUL_GABARITO.pdf`,
    },
    2: {
      prova: `${oldEnemBase}/provas/2011/05_AMARELO.pdf`,
      gabarito: `${oldEnemBase}/gabaritos/2011/05_AMARELO_GABARITO.pdf`,
    },
  },
  2012: {
    1: {
      prova: `${oldEnemBase}/provas/2012/dia1_caderno1_azul.pdf`,
      gabarito: `${oldEnemBase}/gabaritos/2012/dia1_azul.pdf`,
    },
    2: {
      prova: `${oldEnemBase}/provas/2012/dia2_caderno5_amarelo.pdf`,
      gabarito: `${oldEnemBase}/gabaritos/2012/dia2_amarelo.pdf`,
    },
  },
  2013: {
    1: {
      prova: `${oldEnemBase}/provas/2013/dia1_caderno1_azul.pdf`,
      gabarito: `${oldEnemBase}/gabaritos/2013/dia1_azul.pdf`,
    },
    2: {
      prova: `${oldEnemBase}/provas/2013/dia2_caderno5_amarelo.pdf`,
      gabarito: `${oldEnemBase}/gabaritos/2013/dia2_amarelo.pdf`,
    },
  },
  2014: {
    1: {
      prova: `${oldEnemBase}/provas/2014/2014_PV_impresso_D1_CD1.pdf`,
      gabarito: `${oldEnemBase}/gabaritos/2014/CADERNO_1_AZUL_SABADO.pdf`,
    },
    2: {
      prova: `${oldEnemBase}/provas/2014/2014_PV_impresso_D2_CD5.pdf`,
      gabarito: `${oldEnemBase}/gabaritos/2014/CADERNO_5_AMARELO_DOMINGO.pdf`,
    },
  },
  2015: {
    1: {
      prova: `${oldEnemBase}/provas/2015/2015_PV_impresso_D1_CD1.pdf`,
      gabarito: `${oldEnemBase}/gabaritos/2015/CADERNO_1_AZUL_SABADO.pdf`,
    },
    2: {
      prova: `${oldEnemBase}/provas/2015/2015_PV_impresso_D2_CD5.pdf`,
      gabarito: `${oldEnemBase}/gabaritos/2015/CADERNO_5_AMARELO_DOMINGO.pdf`,
    },
  },
  2016: {
    1: {
      prova: `${oldEnemBase}/provas/2016/2016_PV_impresso_D1_CD1.pdf`,
      gabarito: `${oldEnemBase}/gabaritos/2016/GAB_ENEM_2016_DIA_1_01_AZUL.pdf`,
    },
    2: {
      prova: `${oldEnemBase}/provas/2016/2016_PV_impresso_D2_CD5.pdf`,
      gabarito: `${oldEnemBase}/gabaritos/2016/GAB_ENEM_2016_DIA_2_05_AMARELO.pdf`,
    },
  },
  2017: {
    1: {
      prova: `${oldEnemBase}/provas/2017/2017_PV_impresso_D1_CD4.pdf`,
      gabarito: `${oldEnemBase}/gabaritos/2017/cad_4_gabarito_rosa_5112017.pdf`,
    },
    2: {
      prova: `${oldEnemBase}/provas/2017/2017_PV_impresso_D2_CD7.pdf`,
      gabarito: `${oldEnemBase}/gabaritos/2017/cad_7_gabarito_azul_12112017.pdf`,
    },
  },
  2018: {
    1: {
      prova: `${oldEnemBase}/provas/2018/2018_PV_impresso_D1_CD1.pdf`,
      gabarito: `${oldEnemBase}/gabaritos/2018/GAB_ENEM_2018_DIA_1_AZUL.pdf`,
    },
    2: {
      prova: `${oldEnemBase}/provas/2018/2DIA_05_AMARELO_BAIXA.pdf`,
      gabarito: `${oldEnemBase}/gabaritos/2018/GAB_ENEM_2018_DIA_2_AMARELO.pdf`,
    },
  },
  2019: {
    1: {
      prova: `${oldEnemBase}/provas/2019/2019_PV_impresso_D1_CD1.pdf`,
      gabarito: `${oldEnemBase}/gabaritos/2019/gabarito_1_dia_caderno_1_azul_aplicacao_regular.pdf`,
    },
    2: {
      prova: `${oldEnemBase}/provas/2019/2019_PV_impresso_D2_CD5.pdf`,
      gabarito: `${oldEnemBase}/gabaritos/2019/gabarito_2_dia_caderno_5_amarelo_aplicacao_regular.pdf`,
    },
  },
  2020: makeNewEnemYear(2020),
  2021: makeNewEnemYear(2021),
  2022: makeNewEnemYear(2022),
  2023: {
    1: {
      prova: `${newEnemBase}/2023_PV_impresso_D1_CD2.pdf`,
      gabarito: `${newEnemBase}/2023_GB_impresso_D1_CD2.pdf`,
    },
    2: {
      prova: `${newEnemBase}/2023_PV_impresso_D2_CD5.pdf`,
      gabarito: `${newEnemBase}/2023_GB_impresso_D2_CD5.pdf`,
    },
  },
  2024: makeNewEnemYear(2024),
  2025: makeNewEnemYear(2025),
};

const fuvestRemoteDocuments: Record<number, RemoteDocumentPair> = {
  2023: {
    prova: "https://www.fuvest.br/wp-content/uploads/fuvest2023_primeira_fase_prova_V.pdf",
    gabarito: "https://www.fuvest.br/wp-content/uploads/fuvest2023_gabarito_primeira_fase.pdf",
  },
  2024: {
    prova: "https://www.fuvest.br/wp-content/uploads/fuvest2024_primeira_fase_prova_V.pdf",
    gabarito: "https://www.fuvest.br/wp-content/uploads/fuvest2024_gabarito_primeira_fase_retificado_2023-11-24.pdf",
  },
  2025: {
    prova: "https://www.fuvest.br/wp-content/uploads/fuvest2025_primeira_fase_prova_V1.pdf",
    gabarito: "https://www.fuvest.br/wp-content/uploads/fuvest2025_gabarito_primeira_fase.pdf",
  },
};

const unicampRemoteDocuments: Record<number, RemoteDocumentPair> = {
  2024: {
    prova: "https://www.comvest.unicamp.br/vest2024/F1/f12024Q_Y.pdf",
    gabarito: "https://www.comvest.unicamp.br/wp-content/uploads/2023/10/Q_Y.pdf",
  },
  2025: {
    prova: "https://www.comvest.unicamp.br/vest2025/F1/f12025Q_Z.pdf",
    gabarito: "https://www.comvest.unicamp.br/wp-content/uploads/2024/10/QZ_gabarito_2025_FINAL_site.pdf",
  },
};

function normalizeLookupText(...values: Array<string | null | undefined>) {
  return values
    .filter((value): value is string => Boolean(value))
    .join(" ")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function getLookupYear(input: OldExamDocumentLookup) {
  return input.ano ?? input.year ?? null;
}

function getLookupVestibular(input: OldExamDocumentLookup) {
  const vestibular = input.vestibular;
  if (!vestibular) return "";
  if (typeof vestibular === "string") return normalizeLookupText(vestibular);
  return normalizeLookupText(vestibular.slug, vestibular.name);
}

function getLookupTitle(input: OldExamDocumentLookup) {
  return normalizeLookupText(input.titulo, input.title, input.fase, input.phase);
}

function findExplicitEnemDay(input: OldExamDocumentLookup): EnemDay | null {
  const identityText = normalizeLookupText(input.id, input.slug, input.dia, input.day);
  const descriptiveText = getLookupTitle(input);
  const day2 = /(?:^|[^a-z0-9])(?:dia[-_\s]*2|2[oaºª]?\s*dia|segund[ao]\s*dia)(?:[^a-z0-9]|$)/;
  const day1 = /(?:^|[^a-z0-9])(?:dia[-_\s]*1|1[oaºª]?\s*dia|primeir[ao]\s*dia)(?:[^a-z0-9]|$)/;

  if (day2.test(identityText)) return 2;
  if (day1.test(identityText)) return 1;
  if (day2.test(descriptiveText)) return 2;
  if (day1.test(descriptiveText)) return 1;
  return null;
}

function detectEnemDay(input: OldExamDocumentLookup): EnemDay {
  return findExplicitEnemDay(input) ?? 1;
}

export function getCanonicalOldExamId(input: OldExamDocumentLookup) {
  const year = getLookupYear(input);
  if (!year) return null;

  const vestibular = getLookupVestibular(input);
  const title = getLookupTitle(input);

  const enemDay = findExplicitEnemDay(input);
  if (vestibular.includes("enem") && enemDay && enemRemoteDocuments[year]) {
    return `pa-enem-${year}-dia-${enemDay}`;
  }

  if (
    vestibular.includes("fuvest") &&
    fuvestRemoteDocuments[year] &&
    /(?:primeir[ao]|1[aoªº]?|fase[-_\s]*1)/.test(title)
  ) {
    return `pa-fuvest-${year}-fase-1`;
  }

  if (
    vestibular.includes("unicamp") &&
    unicampRemoteDocuments[year] &&
    /(?:primeir[ao]|1[aoªº]?|fase[-_\s]*1)/.test(title)
  ) {
    return `pa-unicamp-${year}-fase-1`;
  }

  return null;
}

function makeNewEnemYear(year: number): Record<EnemDay, RemoteDocumentPair> {
  return {
    1: {
      prova: `${newEnemBase}/${year}_PV_impresso_D1_CD1.pdf`,
      gabarito: `${newEnemBase}/${year}_GB_impresso_D1_CD1.pdf`,
    },
    2: {
      prova: `${newEnemBase}/${year}_PV_impresso_D2_CD5.pdf`,
      gabarito: `${newEnemBase}/${year}_GB_impresso_D2_CD5.pdf`,
    },
  };
}

export function getOldExamSavedUrl(exam: OldExamRecord, kind: OldExamDocumentKind) {
  return kind === "gabarito" ? exam.arquivoGabaritoUrl : exam.arquivoProvaUrl;
}

export function isProbablyPdfUrl(value: string | null | undefined) {
  if (!value) return false;
  try {
    const url = new URL(value, "https://estudaki.local");
    return url.pathname.toLowerCase().endsWith(".pdf");
  } catch {
    return value.toLowerCase().split("?")[0]?.endsWith(".pdf") ?? false;
  }
}

export function getOldExamExternalUrl(exam: OldExamRecord, kind: OldExamDocumentKind) {
  const savedUrl = getOldExamSavedUrl(exam, kind);
  if (savedUrl?.startsWith("http") && !isProbablyPdfUrl(savedUrl)) return savedUrl;
  return exam.fonteUrl || savedUrl || null;
}

export function getOldExamRemotePdfCandidates(exam: OldExamRecord, kind: OldExamDocumentKind) {
  const candidates: string[] = [];
  const savedUrl = getOldExamSavedUrl(exam, kind);

  const vestibular = exam.vestibular.toLowerCase();
  const day = detectEnemDay(exam);

  if (vestibular === "enem") {
    const year = enemRemoteDocuments[exam.ano];
    if (year?.[day]?.[kind]) candidates.push(year[day][kind]);
  }

  if (vestibular === "fuvest") {
    const source = fuvestRemoteDocuments[exam.ano]?.[kind];
    if (source) candidates.push(source);
  }

  if (vestibular === "unicamp") {
    const source = unicampRemoteDocuments[exam.ano]?.[kind];
    if (source) candidates.push(source);
  }

  if (savedUrl?.startsWith("http")) candidates.push(savedUrl);

  return [...new Set(candidates)];
}

export function getOldExamPublicPdfCandidates(exam: OldExamRecord, kind: OldExamDocumentKind) {
  const candidates: string[] = [];
  const storedPath = kind === "gabarito" ? exam.arquivoGabaritoPath : exam.arquivoProvaPath;
  const prefix = kind === "gabarito" ? "gabarito" : "prova";

  if (storedPath) {
    const relative = storedPath.replace(/^data[\\/]+provas[\\/]+/, "").replace(/\\/g, "/");
    if (!relative.startsWith("..") && !relative.startsWith("/") && !/^[a-z]:/i.test(relative)) {
      candidates.push(`/provas-antigas/${relative}`);
    }
  }

  const vestibular = exam.vestibular.toLowerCase();
  const dayText = `${exam.dia ?? ""} ${exam.titulo}`.toLowerCase();
  const day = detectEnemDay(exam);
  const isFirstPhase = /primeira|1a|1ª|fase 1|1-fase/.test(dayText);

  if (vestibular === "enem") {
    candidates.push(`/provas-antigas/enem/${exam.ano}/${prefix}-${day}-dia.pdf`);
    if (day === 1) {
      candidates.push(`/provas-antigas/enem/${exam.ano}/${prefix}-1-dia-caderno-1-azul.pdf`);
      candidates.push(`/provas-antigas/enem/${exam.ano}/${prefix}-1-dia-caderno-2-amarelo.pdf`);
      candidates.push(`/provas-antigas/enem/${exam.ano}/${prefix}-1-dia-caderno-4-rosa.pdf`);
    } else {
      candidates.push(`/provas-antigas/enem/${exam.ano}/${prefix}-2-dia-caderno-5-amarelo.pdf`);
      candidates.push(`/provas-antigas/enem/${exam.ano}/${prefix}-2-dia-caderno-7-azul.pdf`);
    }
  }

  if (vestibular === "fuvest" && isFirstPhase) {
    candidates.push(`/provas-antigas/fuvest/${exam.ano}/${prefix}-1-fase.pdf`);
  }

  if (vestibular === "unicamp" && isFirstPhase) {
    candidates.push(`/provas-antigas/unicamp/${exam.ano}/${prefix}-1-fase.pdf`);
  }

  return [...new Set(candidates)];
}

export function canServeOldExamPdf(exam: OldExamRecord, kind: OldExamDocumentKind) {
  return (
    getOldExamPublicPdfCandidates(exam, kind).length > 0 ||
    isProbablyPdfUrl(getOldExamSavedUrl(exam, kind)) ||
    getOldExamRemotePdfCandidates(exam, kind).length > 0
  );
}
