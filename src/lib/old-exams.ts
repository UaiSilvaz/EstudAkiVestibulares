import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { db } from "@/lib/db";
import { localExams } from "@/lib/local-exams";
import { getCanonicalOldExamId } from "@/lib/old-exam-documents";

export type OldExamStatus = "DISPONIVEL" | "APROVADA" | "EM_PROCESSAMENTO" | "PENDENTE" | "COM_ERRO";

export type OldExamRecord = {
  id: string;
  slug: string;
  vestibular: string;
  ano: number;
  titulo: string;
  descricao: string;
  fase: string;
  dia: string | null;
  tipo: string;
  arquivoProvaUrl: string;
  arquivoGabaritoUrl: string | null;
  arquivoProvaPath: string;
  arquivoGabaritoPath: string | null;
  fonteOficial: string;
  fonteUrl: string;
  totalQuestoes: number | null;
  status: OldExamStatus;
  importacaoStatus: string;
  importacaoRelatorio: string | null;
  questoesDetectadas: number;
  questoesValidas: number;
  questoesComErro: number;
  imagensDetectadas: number;
  questoesVinculadas: number;
  questoesDisponiveis?: number;
  criadoEm?: string | Date;
  atualizadoEm?: string | Date;
};

export type OldExamInput = Omit<
  OldExamRecord,
  | "id"
  | "questoesDetectadas"
  | "questoesValidas"
  | "questoesComErro"
  | "imagensDetectadas"
  | "questoesVinculadas"
  | "importacaoStatus"
  | "importacaoRelatorio"
> & { id?: string };

const manifestPath = path.join(process.cwd(), "data", "provas", "provas-antigas.json");
const provasRoot = path.resolve(process.cwd(), "data", "provas");
const hasDatabaseConfiguration = () => Boolean(process.env.DATABASE_URL);

function fallbackOldExamRecords(): OldExamRecord[] {
  return localExams.map((exam) => ({
    id: exam.id,
    slug: exam.id,
    vestibular: exam.vestibular.name,
    ano: exam.year,
    titulo: exam.title,
    descricao: `${exam.vestibular.name} ${exam.year} - ${exam.phase}`,
    fase: exam.phase,
    dia: exam.day,
    tipo: "PDF",
    arquivoProvaUrl: exam.pdfUrl ?? exam.sourceUrl,
    arquivoGabaritoUrl: exam.answerKeyUrl,
    arquivoProvaPath: "",
    arquivoGabaritoPath: null,
    fonteOficial: "Fonte oficial",
    fonteUrl: exam.sourceUrl,
    totalQuestoes: exam.questionCount,
    status: exam.pdfUrl ? "DISPONIVEL" : "PENDENTE",
    importacaoStatus: "NAO_INICIADA",
    importacaoRelatorio: null,
    questoesDetectadas: 0,
    questoesValidas: 0,
    questoesComErro: 0,
    imagensDetectadas: 0,
    questoesVinculadas: 0,
    questoesDisponiveis: 0,
    criadoEm: exam.createdAt,
    atualizadoEm: exam.updatedAt,
  }));
}

function normalizeDatabaseRecord(record: Record<string, unknown>): OldExamRecord {
  const count = record._count as { questoes?: number } | undefined;
  const published = record.questoesPublicadas as Array<{ numeroQuestao?: number }> | undefined;
  const availableQuestionCount = published
    ? new Set(
        published
          .map((link) => link.numeroQuestao)
          .filter((number): number is number => Number.isInteger(number)),
      ).size
    : Number(record.questoesDisponiveis ?? 0);
  return {
    ...(record as unknown as OldExamRecord),
    questoesVinculadas: count?.questoes ?? Number(record.questoesVinculadas ?? 0),
    questoesDisponiveis: availableQuestionCount,
  };
}

function canonicalFallbackId(record: OldExamRecord) {
  const canonical = getCanonicalOldExamId(record);
  if (canonical) return canonical;

  const vestibular = record.vestibular.toLowerCase();
  const text = `${record.id} ${record.slug} ${record.dia ?? ""} ${record.titulo} ${record.fase}`.toLowerCase();

  if (vestibular === "enem") {
    const day = /\b(dia-2|dia 2|2|segundo|segunda|2o|2º)\b/.test(text) ? 2 : 1;
    return `pa-enem-${record.ano}-dia-${day}`;
  }

  if (vestibular === "fuvest" && /primeira|1a|1ª|fase 1/.test(text)) {
    return `pa-fuvest-${record.ano}-fase-1`;
  }

  if (vestibular === "unicamp" && /primeira|1a|1ª|fase 1/.test(text)) {
    return `pa-unicamp-${record.ano}-fase-1`;
  }

  return null;
}

function findOldExamRecord(records: OldExamRecord[], id: string) {
  return (
    records.find((record) => record.id === id || record.slug === id) ??
    records.find((record) => canonicalFallbackId(record) === id) ??
    null
  );
}

export async function readOldExamManifest(): Promise<OldExamRecord[]> {
  try {
    const contents = await fs.readFile(manifestPath, "utf8");
    return JSON.parse(contents) as OldExamRecord[];
  } catch {
    return fallbackOldExamRecords();
  }
}

async function writeOldExamManifest(records: OldExamRecord[]) {
  const temporary = `${manifestPath}.${randomUUID()}.tmp`;
  await fs.writeFile(temporary, `${JSON.stringify(records, null, 2)}\n`, "utf8");
  await fs.rename(temporary, manifestPath);
}

export async function listOldExams(): Promise<OldExamRecord[]> {
  try {
    if (!hasDatabaseConfiguration()) throw new Error("Banco não configurado.");
    const records = await db.provaAntiga.findMany({
      include: {
        _count: { select: { questoes: true } },
        questoes: {
          where: { questao: { status: "PUBLISHED", reviewState: "APPROVED" } },
          select: { numeroQuestao: true },
        },
      },
      orderBy: [{ ano: "desc" }, { vestibular: "asc" }, { titulo: "asc" }],
    });
    if (records.length) return records.map((record) => normalizeDatabaseRecord({ ...(record as unknown as Record<string, unknown>), questoesPublicadas: record.questoes }));
    throw new Error("Tabela sem registros; usando manifesto oficial.");
  } catch {
    const records = await readOldExamManifest();
    return records.sort((a, b) => b.ano - a.ano || a.vestibular.localeCompare(b.vestibular));
  }
}

export async function getOldExam(id: string): Promise<OldExamRecord | null> {
  try {
    if (!hasDatabaseConfiguration()) throw new Error("Banco não configurado.");
    const record = await db.provaAntiga.findUnique({
      where: { id },
      include: {
        _count: { select: { questoes: true } },
        questoes: {
          where: { questao: { status: "PUBLISHED", reviewState: "APPROVED" } },
          select: { numeroQuestao: true },
        },
      },
    });
    if (record) return normalizeDatabaseRecord({ ...(record as unknown as Record<string, unknown>), questoesPublicadas: record.questoes });
    throw new Error("Registro não encontrado no banco; consultando manifesto.");
  } catch {
    return findOldExamRecord(await readOldExamManifest(), id);
  }
}

export async function createOldExam(input: OldExamInput): Promise<OldExamRecord> {
  const id = input.id ?? `pa-manual-${randomUUID()}`;
  const data = {
    ...input,
    id,
    dia: input.dia || null,
    arquivoGabaritoUrl: input.arquivoGabaritoUrl || null,
    arquivoGabaritoPath: input.arquivoGabaritoPath || null,
    totalQuestoes: input.totalQuestoes || null,
  };

  try {
    if (!hasDatabaseConfiguration()) throw new Error("Banco não configurado.");
    const record = await db.provaAntiga.create({ data });
    return normalizeDatabaseRecord(record as unknown as Record<string, unknown>);
  } catch {
    const records = await readOldExamManifest();
    if (records.some((record) => record.slug === input.slug)) throw new Error("Já existe uma prova com este identificador.");
    const record: OldExamRecord = {
      ...data,
      importacaoStatus: "NAO_INICIADA",
      importacaoRelatorio: null,
      questoesDetectadas: 0,
      questoesValidas: 0,
      questoesComErro: 0,
      imagensDetectadas: 0,
      questoesVinculadas: 0,
      criadoEm: new Date().toISOString(),
      atualizadoEm: new Date().toISOString(),
    };
    await writeOldExamManifest([...records, record]);
    return record;
  }
}

export async function updateOldExam(id: string, input: Partial<OldExamInput & OldExamRecord>): Promise<OldExamRecord> {
  if (input.status === "APROVADA" && hasDatabaseConfiguration()) {
    const exam = await db.provaAntiga.findUnique({
      where: { id },
      select: {
        officialKeyFileId: true,
      },
    });
    if (!exam) throw new Error("Prova antiga não encontrada.");
    if (!exam.officialKeyFileId) {
      throw new Error("Vincule um gabarito oficial antes de aprovar a prova.");
    }
    const [totalAnswers, approvedAnswers] = await Promise.all([
      db.officialAnswerKey.count({ where: { fileId: exam.officialKeyFileId } }),
      db.officialAnswerKey.count({
        where: {
          fileId: exam.officialKeyFileId,
          answerReviewStatus: "APPROVED",
        },
      }),
    ]);
    if (!totalAnswers || approvedAnswers !== totalAnswers) {
      throw new Error(`Aprove todos os gabaritos antes da prova (${approvedAnswers}/${totalAnswers}).`);
    }
  }
  const allowed = {
    vestibular: input.vestibular,
    slug: input.slug,
    ano: input.ano,
    titulo: input.titulo,
    descricao: input.descricao,
    fase: input.fase,
    dia: input.dia,
    tipo: input.tipo,
    arquivoProvaUrl: input.arquivoProvaUrl,
    arquivoGabaritoUrl: input.arquivoGabaritoUrl,
    arquivoProvaPath: input.arquivoProvaPath,
    arquivoGabaritoPath: input.arquivoGabaritoPath,
    fonteOficial: input.fonteOficial,
    fonteUrl: input.fonteUrl,
    totalQuestoes: input.totalQuestoes,
    status: input.status,
    importacaoStatus: input.importacaoStatus,
    importacaoRelatorio: input.importacaoRelatorio,
    questoesDetectadas: input.questoesDetectadas,
    questoesValidas: input.questoesValidas,
    questoesComErro: input.questoesComErro,
    imagensDetectadas: input.imagensDetectadas,
  };
  const data = Object.fromEntries(Object.entries(allowed).filter(([, value]) => value !== undefined));

  try {
    if (!hasDatabaseConfiguration()) throw new Error("Banco não configurado.");
    const record = await db.provaAntiga.update({ where: { id }, data });
    return normalizeDatabaseRecord(record as unknown as Record<string, unknown>);
  } catch {
    const records = await readOldExamManifest();
    const index = records.findIndex((record) => record.id === id);
    if (index < 0) throw new Error("Prova antiga não encontrada.");
    records[index] = { ...records[index], ...data, atualizadoEm: new Date().toISOString() } as OldExamRecord;
    await writeOldExamManifest(records);
    return records[index];
  }
}

export async function resolveOldExamFile(id: string, kind: "prova" | "gabarito") {
  const record = await getOldExam(id);
  if (!record) return null;
  const storedPath = kind === "prova" ? record.arquivoProvaPath : record.arquivoGabaritoPath;
  if (!storedPath) return null;
  const absolutePath = path.resolve(/* turbopackIgnore: true */ process.cwd(), storedPath);
  if (!absolutePath.startsWith(`${provasRoot}${path.sep}`)) throw new Error("Caminho de PDF fora da área permitida.");
  return { record, absolutePath };
}

export async function listOldExamQuestions(id: string) {
  if (!hasDatabaseConfiguration()) return [];
  try {
    return await db.provaAntigaQuestao.findMany({
      where: { provaAntigaId: id },
      include: { questao: { select: { id: true, statement: true, year: true, status: true, difficulty: true, correctAlternative: true } } },
      orderBy: { ordem: "asc" },
    });
  } catch {
    return [];
  }
}

export async function registerManifestInDatabase() {
  if (!hasDatabaseConfiguration()) throw new Error("DATABASE_URL não configurada.");
  const records = await readOldExamManifest();
  for (const record of records) {
    const { questoesVinculadas: _ignored, questoesDisponiveis: _available, criadoEm: _created, atualizadoEm: _updated, ...data } = record;
    void _ignored;
    void _available;
    void _created;
    void _updated;
    await db.provaAntiga.upsert({ where: { id: record.id }, update: data, create: data });
  }
  return records.length;
}
