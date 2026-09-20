import type {
  DiscoveredExam,
  ExamSourceProvider,
  FetchedExamDocument,
  ProviderDiscoveryInput,
  ProviderDiscoveryResult,
} from "../../types";
import { readEnemInventory, toDiscoveredExam } from "./enem-inventory";

function applyDiscoveryFilters(
  exams: DiscoveredExam[],
  input: ProviderDiscoveryInput,
) {
  let result = exams;
  if (input.year) result = result.filter((exam) => exam.year === input.year);
  if (input.day) result = result.filter((exam) => exam.day === input.day);
  if (input.limit) result = result.slice(0, input.limit);
  return result;
}

export const inepProvider: ExamSourceProvider = {
  slug: "inep",
  name: "INEP / ENEM",
  baseUrl:
    "https://www.gov.br/inep/pt-br/areas-de-atuacao/avaliacao-e-exames-educacionais/enem/provas-e-gabaritos",
  enabled: true,
  priority: 1,
  rateLimit: {
    requestsPerMinute: 12,
    burst: 2,
  },
  async discoverExams(input): Promise<ProviderDiscoveryResult> {
    const entries = await readEnemInventory();
    const exams = applyDiscoveryFilters(entries.map(toDiscoveredExam), input);
    return {
      provider: "inep",
      exams,
      warnings: [],
      logs: [
        `[INEP] inventory entries=${entries.length}`,
        `[INEP] selected=${exams.length}`,
      ],
    };
  },
  async fetchExam(exam): Promise<FetchedExamDocument> {
    return {
      exam,
      examFile: exam.documents.find((document) => document.kind === "exam"),
      answerKeyFile: exam.documents.find(
        (document) => document.kind === "answer_key",
      ),
      warnings: [
        "INEP provider uses locally audited official PDFs. Network download is handled by official-sources:register-enem-corpus.",
      ],
    };
  },
};
