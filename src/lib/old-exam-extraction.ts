import { promises as fs } from "node:fs";
import path from "node:path";
import { deflateSync } from "node:zlib";
import { readOldExamManifest, type OldExamRecord, updateOldExam } from "@/lib/old-exams";

type TextItem = { str: string; hasEOL?: boolean; transform?: number[] };
type PdfImage = { width: number; height: number; data: Uint8Array | Uint8ClampedArray };
type PositionedImage = {
  path: string;
  order: number;
  x: number | null;
  y: number | null;
  displayWidth: number | null;
  displayHeight: number | null;
  sourceWidth: number;
  sourceHeight: number;
};
type QuestionMarker = { number: number; x: number; y: number };
type RawPage = {
  page: number;
  width: number;
  height: number;
  text: string;
  imageCount: number;
  images: string[];
  imageItems: PositionedImage[];
  questionMarkers: QuestionMarker[];
  imageErrors: string[];
};
type Alternative = { key: string; text: string; imageUrl?: string | null };

export type StructuredQuestion = {
  id: string;
  provaAntigaId: string;
  vestibular: string;
  ano: number;
  fase: string;
  dia: string | null;
  numeroQuestao: number;
  pagina: number;
  disciplina: string | null;
  conteudo: string | null;
  dificuldadeSugerida: "facil" | "media" | "dificil" | null;
  enunciado: string;
  textoApoio: string | null;
  imagemPrincipal: string | null;
  imagens: string[];
  alternativas: Alternative[];
  alternativaCorreta: string | null;
  explicacaoInicial: null;
  fonteOficial: string;
  fonteUrl: string;
  status: "pendente_revisao" | "com_erro";
  observacoesImportacao: string[];
};

type GroupSummary = {
  key: string;
  exams: number;
  detected: number;
  valid: number;
  errors: number;
  withAnswer: number;
  withoutAnswer: number;
  images: number;
  problems: string[];
  reportPath: string;
};

const outputRoot = path.join(process.cwd(), "scripts", "import", "output");

export async function runOldExamExtraction(options: { examId?: string } = {}) {
  const manifest = await readOldExamManifest();
  const selected = options.examId
    ? (() => {
        const target = manifest.find((exam) => exam.id === options.examId);
        if (!target) throw new Error("Prova antiga não encontrada no manifesto.");
        return manifest.filter((exam) => exam.vestibular === target.vestibular && exam.ano === target.ano);
      })()
    : manifest;
  const groups = groupBy(selected, (exam) => `${exam.vestibular.toLowerCase()}-${exam.ano}`);
  const summaries: GroupSummary[] = [];

  await fs.mkdir(outputRoot, { recursive: true });
  for (const [key, exams] of groups) summaries.push(await processGroup(key, exams));

  return {
    exams: selected.length,
    detected: sum(summaries, "detected"),
    valid: sum(summaries, "valid"),
    errors: sum(summaries, "errors"),
    withAnswer: sum(summaries, "withAnswer"),
    withoutAnswer: sum(summaries, "withoutAnswer"),
    images: sum(summaries, "images"),
    problems: Array.from(new Set(summaries.flatMap((summary) => summary.problems))),
    groups: summaries,
  };
}

async function processGroup(key: string, exams: OldExamRecord[]): Promise<GroupSummary> {
  const rawDocuments: Array<{ exam: OldExamRecord; pages: RawPage[]; answerKeyText: string }> = [];
  const structured: StructuredQuestion[] = [];
  const groupProblems: string[] = [];

  for (const exam of exams) {
    await updateOldExam(exam.id, { status: "EM_PROCESSAMENTO", importacaoStatus: "PROCESSANDO" });
    try {
      const pages = await extractPdf(exam, exam.arquivoProvaPath);
      const answerKeyText = exam.arquivoGabaritoPath ? await extractPdfText(exam.arquivoGabaritoPath) : "";
      rawDocuments.push({ exam, pages, answerKeyText });
      const answerKey = parseAnswerKey(answerKeyText, exam);
      const questions = parseQuestions(pages, exam, answerKey);
      structured.push(...questions);
      if (questions.length !== exam.totalQuestoes) groupProblems.push(`${exam.titulo}: foram detectadas ${questions.length} de ${exam.totalQuestoes ?? "?"} questões previstas.`);
      if (exam.vestibular === "ENEM") {
        groupProblems.push(
          `${exam.titulo}: o caderno contém inglês e espanhol nas questões 1–5; a versão em inglês foi preservada e associada à coluna INGLÊS do gabarito oficial.`,
        );
      }
    } catch (error) {
      const message = `${exam.titulo}: ${error instanceof Error ? error.message : "falha desconhecida"}`;
      groupProblems.push(message);
      await updateOldExam(exam.id, { status: "COM_ERRO", importacaoStatus: "COM_ERRO" });
    }
  }

  const valid = structured.filter((question) => question.status === "pendente_revisao");
  const errors = structured.filter((question) => question.status === "com_erro");
  const reportPath = path.join(outputRoot, `${key}-relatorio.md`);
  const rawPath = path.join(outputRoot, `${key}-raw.json`);
  const structuredPath = path.join(outputRoot, `${key}-structured.json`);
  const validPath = path.join(outputRoot, `${key}-valid.json`);
  const errorsPath = path.join(outputRoot, `${key}-errors.json`);

  await Promise.all([
    writeJson(rawPath, { grupo: key, geradoEm: new Date().toISOString(), documentos: rawDocuments }),
    writeJson(structuredPath, structured),
    writeJson(validPath, valid),
    writeJson(errorsPath, errors),
  ]);

  const imageCount = rawDocuments.reduce((total, document) => total + document.pages.reduce((pageTotal, page) => pageTotal + page.imageCount, 0), 0);
  const summary: GroupSummary = {
    key,
    exams: exams.length,
    detected: structured.length,
    valid: valid.length,
    errors: errors.length,
    withAnswer: structured.filter((question) => question.alternativaCorreta).length,
    withoutAnswer: structured.filter((question) => !question.alternativaCorreta).length,
    images: imageCount,
    problems: Array.from(new Set([...groupProblems, ...errors.flatMap((question) => question.observacoesImportacao)])),
    reportPath: relative(reportPath),
  };
  await fs.writeFile(reportPath, renderReport(summary, exams), "utf8");

  for (const exam of exams) {
    const own = structured.filter((question) => question.provaAntigaId === exam.id);
    const ownImages = rawDocuments.find((document) => document.exam.id === exam.id)?.pages.reduce((total, page) => total + page.imageCount, 0) ?? 0;
    await updateOldExam(exam.id, {
      status: "PENDENTE",
      importacaoStatus: own.some((question) => question.status === "com_erro") ? "PRONTO_PARA_REVISAO" : "PRONTO_PARA_REVISAO",
      importacaoRelatorio: relative(reportPath),
      questoesDetectadas: own.length,
      questoesValidas: own.filter((question) => question.status === "pendente_revisao").length,
      questoesComErro: own.filter((question) => question.status === "com_erro").length,
      imagensDetectadas: ownImages,
    });
  }

  return summary;
}

async function extractPdf(exam: OldExamRecord, storedPath: string): Promise<RawPage[]> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const bytes = new Uint8Array(await fs.readFile(path.resolve(/* turbopackIgnore: true */ process.cwd(), storedPath)));
  const loadingTask = pdfjs.getDocument({ data: bytes });
  const document = await loadingTask.promise;
  const pages: RawPage[] = [];
  const imageDirectory = path.join(outputRoot, "images", exam.id);
  await fs.rm(imageDirectory, { recursive: true, force: true });
  await fs.mkdir(imageDirectory, { recursive: true });

  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber++) {
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();
    const textItems = content.items as TextItem[];
    const text = textFromItems(textItems);
    const viewport = page.getViewport({ scale: 1 });
    const extracted = await extractPageImages(pdfjs, page, exam.id, pageNumber, imageDirectory);
    pages.push({
      page: pageNumber,
      width: viewport.width,
      height: viewport.height,
      text,
      imageCount: extracted.items.length,
      images: extracted.items.map((image) => image.path),
      imageItems: extracted.items,
      questionMarkers: questionMarkersFromItems(textItems),
      imageErrors: extracted.errors,
    });
    page.cleanup();
  }
  await loadingTask.destroy();
  return pages;
}

async function extractPdfText(storedPath: string) {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const bytes = new Uint8Array(await fs.readFile(path.resolve(/* turbopackIgnore: true */ process.cwd(), storedPath)));
  const loadingTask = pdfjs.getDocument({ data: bytes });
  const document = await loadingTask.promise;
  const pages: string[] = [];
  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber++) {
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();
    pages.push(textFromItems(content.items as TextItem[]));
    page.cleanup();
  }
  await loadingTask.destroy();
  return pages.join("\n");
}

async function extractPageImages(pdfjs: typeof import("pdfjs-dist/legacy/build/pdf.mjs"), page: { getOperatorList: () => Promise<{ fnArray: number[]; argsArray: unknown[][] }>; objs: { get: (id: string, callback?: (value: PdfImage) => void) => PdfImage | undefined } }, examId: string, pageNumber: number, directory: string) {
  const operatorList = await page.getOperatorList();
  const items: PositionedImage[] = [];
  const errors: string[] = [];
  let imageIndex = 0;
  for (let index = 0; index < operatorList.fnArray.length; index++) {
    const operator = operatorList.fnArray[index];
    if (operator !== pdfjs.OPS.paintImageXObject && operator !== pdfjs.OPS.paintInlineImageXObject) continue;
    imageIndex++;
    try {
      const argument = operatorList.argsArray[index]?.[0];
      const image = typeof argument === "string" ? await getPdfObject(page.objs, argument) : argument as PdfImage;
      if (!image?.data || !image.width || !image.height) throw new Error("objeto de imagem sem pixels decodificados");
      const fileName = `page-${String(pageNumber).padStart(3, "0")}-image-${String(imageIndex).padStart(2, "0")}.png`;
      const filePath = path.join(directory, fileName);
      await fs.writeFile(filePath, encodePng(image));
      const transform = imageTransformBefore(operatorList, index, pdfjs);
      items.push({
        path: relative(filePath),
        order: imageIndex - 1,
        x: transform?.[4] ?? null,
        y: transform?.[5] ?? null,
        displayWidth: transform ? Math.hypot(transform[0], transform[1]) : null,
        displayHeight: transform ? Math.hypot(transform[2], transform[3]) : null,
        sourceWidth: image.width,
        sourceHeight: image.height,
      });
    } catch (error) {
      errors.push(`Página ${pageNumber}, imagem ${imageIndex}: ${error instanceof Error ? error.message : "falha ao extrair"}`);
    }
  }
  return { items, errors };
}

function imageTransformBefore(
  operatorList: { fnArray: number[]; argsArray: unknown[][] },
  imageOperatorIndex: number,
  pdfjs: typeof import("pdfjs-dist/legacy/build/pdf.mjs"),
) {
  for (let index = imageOperatorIndex - 1; index >= Math.max(0, imageOperatorIndex - 12); index--) {
    if (operatorList.fnArray[index] !== pdfjs.OPS.transform) continue;
    const value = operatorList.argsArray[index];
    if (
      Array.isArray(value) &&
      value.length === 6 &&
      value.every((item) => typeof item === "number")
    ) {
      return value as number[];
    }
  }
  return null;
}

function questionMarkersFromItems(items: TextItem[]) {
  const markers = new Map<number, QuestionMarker>();
  for (let index = 0; index < items.length; index++) {
    const item = items[index];
    const text = item.str?.trim() ?? "";
    const direct = text.match(/quest[aã]o\s*0?(\d{1,3})/i);
    let number = direct ? Number(direct[1]) : null;
    if (!number && /^\d{1,3}$/.test(text)) {
      const prefix = items
        .slice(Math.max(0, index - 8), index)
        .map((candidate) => candidate.str ?? "")
        .join("")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
      if (prefix.includes("questao")) number = Number(text);
    }
    const x = item.transform?.[4];
    const y = item.transform?.[5];
    if (!number || number < 1 || number > 300 || x === undefined || y === undefined) continue;
    if (!markers.has(number)) markers.set(number, { number, x, y });
  }
  return [...markers.values()];
}

function getPdfObject(store: { get: (id: string, callback?: (value: PdfImage) => void) => PdfImage | undefined }, id: string) {
  return new Promise<PdfImage>((resolve, reject) => {
    try {
      const timer = setTimeout(() => reject(new Error("tempo excedido ao decodificar imagem")), 5000);
      const done = (value: PdfImage) => { clearTimeout(timer); resolve(value); };
      const immediate = store.get(id, done);
      if (immediate) done(immediate);
    } catch (error) { reject(error); }
  });
}

function textFromItems(items: TextItem[]) {
  let output = "";
  let lastY: number | undefined;
  for (const item of items) {
    const value = item.str?.trim();
    if (!value) continue;
    const y = item.transform?.[5];
    const alternativeToken = /^(?:\(?[A-E]\)?|[a-e]\))$/.test(value);
    const lineBreak = alternativeToken || item.hasEOL || (lastY !== undefined && y !== undefined && Math.abs(lastY - y) > 3);
    output += `${lineBreak ? "\n" : " "}${value}`;
    if (y !== undefined) lastY = y;
  }
  return cleanText(output);
}

function parseQuestions(pages: RawPage[], exam: OldExamRecord, answerKey: Map<number, string>) {
  const combined = pages.map((page) => `\n[[PAGE:${page.page}]]\n${normalizeMarkers(page.text)}`).join("\n");
  const markerPattern = exam.vestibular === "FUVEST" ? /\{\s*(\d{1,3})\s*\}|(?:^|\n)(\d{2})(?=\n)/g : /\bQUESTÃO\s+0?(\d{1,3})\b/g;
  const minimumNumber = exam.vestibular === "ENEM" && exam.dia?.startsWith("2") ? 91 : 1;
  const maximumNumber = exam.vestibular === "ENEM" && exam.dia?.startsWith("2") ? 180 : exam.totalQuestoes ?? 999;
  const markers = Array.from(combined.matchAll(markerPattern))
    .map((match) => ({ number: Number(match[1] ?? match[2]), index: match.index ?? 0, length: match[0].length }))
    .filter((marker) => marker.number >= minimumNumber && marker.number <= maximumNumber);
  const seen = new Set<number>();
  const questions: StructuredQuestion[] = [];

  for (let index = 0; index < markers.length; index++) {
    const marker = markers[index];
    if (seen.has(marker.number)) continue;
    seen.add(marker.number);
    const end = markers[index + 1]?.index ?? combined.length;
    const block = cleanParserBlock(combined.slice(marker.index + marker.length, end));
    const page = pageAt(combined, marker.index);
    const rawPage = pages.find((item) => item.page === page);
    const assignedImages = rawPage
      ? positionedImagesForQuestion(
          rawPage,
          marker.number,
          minimumNumber,
          maximumNumber,
        )
      : [];
    const parsedAlternatives = parseAlternatives(block, exam.vestibular);
    const hasGraphicAlternativeLabels =
      parsedAlternatives.values.length === 0 &&
      /(?:^|\s)A\s+B\s+C\s+D\s+E(?:\s|$)/.test(cleanQuestionBlock(block));
    const graphicAlternativeImages =
      hasGraphicAlternativeLabels && assignedImages.length >= 5
        ? assignedImages.slice(-5)
        : [];
    const statementImages =
      graphicAlternativeImages.length === 5
        ? assignedImages.slice(0, -5)
        : assignedImages;
    const alternatives =
      graphicAlternativeImages.length === 5
        ? {
            start: findGraphicAlternativeStart(block),
            values: ["A", "B", "C", "D", "E"].map((key, alternativeIndex) => ({
              key,
              text: "",
              imageUrl: graphicAlternativeImages[alternativeIndex].path,
            })),
          }
        : parsedAlternatives;
    const rawStatement =
      alternatives.start >= 0 ? block.slice(0, alternatives.start) : block;
    const statement = cleanQuestionBlock(rawStatement);
    const observations: string[] = [];
    const expectedAlternatives = exam.vestibular === "UNICAMP" ? 4 : 5;
    const correct = answerKey.get(marker.number) ?? null;
    if (statement.length < 20) observations.push("Enunciado ausente ou curto demais.");
    if (alternatives.values.length !== expectedAlternatives) observations.push(`Foram extraídas ${alternatives.values.length} de ${expectedAlternatives} alternativas esperadas.`);
    if (!correct) observations.push("Gabarito oficial não associado.");
    if (correct === "ANULADA") observations.push("Questão anulada no gabarito oficial; requer decisão editorial antes da importação.");
    if (exam.vestibular === "ENEM" && marker.number <= 5) {
      observations.push(
        "Questão de língua estrangeira em inglês; resposta associada à coluna INGLÊS do gabarito oficial.",
      );
    }
    const status = observations.some((observation) => !observation.startsWith("Questão de língua estrangeira")) ? "com_erro" : "pendente_revisao";
    const disciplina = classifySubject(exam, marker.number, statement);
    if (graphicAlternativeImages.length === 5) {
      observations.push("Alternativas gráficas A–E vinculadas pelas posições originais no PDF.");
    }
    questions.push({
      id: `${exam.id}-q${marker.number}`,
      provaAntigaId: exam.id,
      vestibular: exam.vestibular,
      ano: exam.ano,
      fase: exam.fase,
      dia: exam.dia,
      numeroQuestao: marker.number,
      pagina: page,
      disciplina,
      conteudo: null,
      dificuldadeSugerida: suggestDifficulty(
        statement,
        statementImages.length + graphicAlternativeImages.length,
      ),
      enunciado: statement,
      textoApoio: null,
      imagemPrincipal: statementImages[0]?.path ?? null,
      imagens: statementImages.map((image) => image.path),
      alternativas: alternatives.values,
      alternativaCorreta: correct,
      explicacaoInicial: null,
      fonteOficial: exam.fonteOficial,
      fonteUrl: exam.fonteUrl,
      status,
      observacoesImportacao: observations,
    });
  }
  return questions;
}

function positionedImagesForQuestion(
  page: RawPage,
  questionNumber: number,
  minimumNumber: number,
  maximumNumber: number,
) {
  const pageMarkers = page.questionMarkers.filter(
    (marker) => marker.number >= minimumNumber && marker.number <= maximumNumber,
  );
  const target = pageMarkers.find((marker) => marker.number === questionNumber);
  if (!target || pageMarkers.length === 1) {
    return [...page.imageItems].sort((first, second) => first.order - second.order);
  }
  const threshold = page.width / 2;
  const leftColumn = target.x < threshold;
  const hasLeftColumn = pageMarkers.some((marker) => marker.x < threshold);
  const hasRightColumn = pageMarkers.some((marker) => marker.x >= threshold);
  const twoColumnLayout = hasLeftColumn && hasRightColumn;
  const sameColumnMarkers = pageMarkers
    .filter(
      (marker) =>
        !twoColumnLayout || (marker.x < threshold) === leftColumn,
    )
    .sort((first, second) => second.y - first.y);
  const position = sameColumnMarkers.findIndex(
    (marker) => marker.number === questionNumber,
  );
  const nextMarker = position >= 0 ? sameColumnMarkers[position + 1] : undefined;
  const upperY = target.y + 24;
  const lowerY = nextMarker ? nextMarker.y + 8 : 45;
  return page.imageItems
    .filter((image) => {
      if (
        image.x === null ||
        image.y === null ||
        image.displayWidth === null ||
        image.displayHeight === null
      ) {
        return false;
      }
      const centerX = image.x + image.displayWidth / 2;
      const centerY = image.y + image.displayHeight / 2;
      return (
        (!twoColumnLayout || (centerX < threshold) === leftColumn) &&
        centerY <= upperY &&
        centerY > lowerY
      );
    })
    .sort((first, second) => first.order - second.order);
}

function findGraphicAlternativeStart(block: string) {
  const match = /(?:^|\n)\s*A\s*\n\s*B\s*\n\s*C\s*\n\s*D\s*\n\s*E(?:\s|$)/m.exec(block);
  return match?.index ?? -1;
}

function parseAlternatives(block: string, vestibular: string) {
  const pattern = vestibular === "FUVEST" ? /(?:^|\n)\s*\(([A-E])\)\s*/g : vestibular === "UNICAMP" ? /(?:^|\n)\s*([a-d])\)\s*/g : /(?:^|\n)\s*([A-E])\s+/g;
  const all = Array.from(block.matchAll(pattern)).map((match) => ({ key: match[1].toUpperCase(), index: match.index ?? 0, content: (match.index ?? 0) + match[0].length }));
  const expected = vestibular === "UNICAMP" ? ["A", "B", "C", "D"] : ["A", "B", "C", "D", "E"];
  let sequence: typeof all = [];
  for (let start = 0; start <= all.length - expected.length; start++) {
    const candidate = all.slice(start, start + expected.length);
    if (candidate.every((marker, index) => marker.key === expected[index])) { sequence = candidate; break; }
  }
  if (!sequence.length) return { start: -1, values: [] as Alternative[] };
  return {
    start: sequence[0].index,
    values: sequence.map((marker, index) => ({ key: marker.key, text: cleanQuestionBlock(block.slice(marker.content, sequence[index + 1]?.index ?? block.length)) })),
  };
}

function parseAnswerKey(text: string, exam: OldExamRecord) {
  const normalized = cleanText(text)
    .replace(/\n/g, " ")
    .replace(/\b(1[0-7])\s+(\d)(?=\s+(?:[A-E*]|ANULAD[AO]))/gi, "$1$2");
  const matches = normalized.matchAll(/\b(0?[1-9]|[1-9]\d|1[0-8]\d)\s+(ANULAD[AO]|[A-E*])(?=\s|$)/gi);
  const answers = new Map<number, string>();
  for (const match of matches) {
    const number = Number(match[1]);
    const answer = match[2].toUpperCase();
    if (!answers.has(number)) answers.set(number, answer === "*" || answer.startsWith("ANULAD") ? "ANULADA" : answer);
  }
  if (exam.totalQuestoes && answers.size > exam.totalQuestoes) {
    for (const number of Array.from(answers.keys())) if (number > 180) answers.delete(number);
  }
  return answers;
}

function normalizeMarkers(text: string) {
  return text
    .replace(/Q\s*U\s*E\s*S\s*T\s*[ÃA]\s*O/gi, "QUESTÃO")
    .replace(/QUESTAO/gi, "QUESTÃO");
}

function cleanText(text: string) {
  return text
    .replace(/\u0000/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function cleanQuestionBlock(text: string) {
  return cleanText(text)
    .replace(/\[\[PAGE:\d+\]\]/g, " ")
    .replace(/ENE[MN]20\d{2}/gi, " ")
    .replace(
      /(?:LINGUAGENS,\s*C[ÓO]DIGOS E SUAS TECNOLOGIAS(?: E REDA[ÇC][ÃA]O)?|CI[ÊE]NCIAS (?:HUMANAS|DA NATUREZA) E SUAS TECNOLOGIAS|MATEM[ÁA]TICA E SUAS TECNOLOGIAS)\s*\|[\s\S]*$/i,
      " ",
    )
    .replace(/\*[A-Z0-9]+\*/g, " ")
    .replace(/#{3,}/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanParserBlock(text: string) {
  return cleanText(text)
    .replace(/\[\[PAGE:\d+\]\]/g, "\n")
    .replace(/ENE[MN]20\d{2}/gi, " ")
    .replace(/\*[A-Z0-9]+\*/g, " ")
    .replace(/#{3,}/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function pageAt(text: string, index: number) {
  const markers = Array.from(text.slice(0, index).matchAll(/\[\[PAGE:(\d+)\]\]/g));
  return Number(markers.at(-1)?.[1] ?? 1);
}

function classifySubject(exam: OldExamRecord, number: number, statement: string) {
  if (exam.vestibular === "ENEM") {
    if (exam.dia?.startsWith("1")) return number <= 45 ? "Linguagens" : "Ciências Humanas";
    return number <= 135 ? "Ciências da Natureza" : "Matemática";
  }
  const normalized = statement.toLowerCase();
  if (/equação|função|gráfico|probabilidade|geometr|número|matem/.test(normalized)) return "Matemática";
  if (/célula|organismo|química|molécula|força|energia|física|biolog/.test(normalized)) return "Ciências da Natureza";
  if (/história|geografia|território|sociedade|filosof|política/.test(normalized)) return "Ciências Humanas";
  if (/texto|poema|romance|língua|linguagem|literatura/.test(normalized)) return "Linguagens";
  return null;
}

function suggestDifficulty(statement: string, imageCount: number): "facil" | "media" | "dificil" {
  const score = (statement.length > 1400 ? 2 : statement.length > 700 ? 1 : 0) + (imageCount > 0 ? 1 : 0);
  return score >= 2 ? "dificil" : score === 1 ? "media" : "facil";
}

function encodePng(image: PdfImage) {
  const { width, height } = image;
  const pixels = Buffer.from(image.data);
  const channels = pixels.length / (width * height);
  if (![1, 3, 4].includes(channels)) throw new Error(`formato de pixels não suportado (${channels} canais)`);
  const rgba = channels === 4 ? pixels : Buffer.alloc(width * height * 4);
  if (channels !== 4) {
    for (let index = 0; index < width * height; index++) {
      const target = index * 4;
      if (channels === 1) rgba[target] = rgba[target + 1] = rgba[target + 2] = pixels[index];
      else {
        rgba[target] = pixels[index * 3];
        rgba[target + 1] = pixels[index * 3 + 1];
        rgba[target + 2] = pixels[index * 3 + 2];
      }
      rgba[target + 3] = 255;
    }
  }
  const scanlines = Buffer.alloc((width * 4 + 1) * height);
  for (let row = 0; row < height; row++) {
    const offset = row * (width * 4 + 1);
    scanlines[offset] = 0;
    rgba.copy(scanlines, offset + 1, row * width * 4, (row + 1) * width * 4);
  }
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const header = Buffer.alloc(13); header.writeUInt32BE(width, 0); header.writeUInt32BE(height, 4); header.set([8, 6, 0, 0, 0], 8);
  return Buffer.concat([signature, pngChunk("IHDR", header), pngChunk("IDAT", deflateSync(scanlines, { level: 1 })), pngChunk("IEND", Buffer.alloc(0))]);
}

function pngChunk(type: string, data: Buffer) {
  const name = Buffer.from(type);
  const output = Buffer.alloc(data.length + 12);
  output.writeUInt32BE(data.length, 0); name.copy(output, 4); data.copy(output, 8);
  output.writeUInt32BE(crc32(Buffer.concat([name, data])), data.length + 8);
  return output;
}

function crc32(data: Buffer) {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function renderReport(summary: GroupSummary, exams: OldExamRecord[]) {
  const problems = summary.problems.length ? summary.problems.map((problem) => `- ${problem}`).join("\n") : "- Nenhum problema estrutural detectado pelo parser.";
  return `# Relatório de extração — ${summary.key}\n\nGerado em ${new Date().toISOString()}. Nenhuma questão foi importada para o banco.\n\n## Resumo\n\n- Provas processadas: ${summary.exams}\n- Questões detectadas: ${summary.detected}\n- Questões válidas para revisão: ${summary.valid}\n- Questões com erro: ${summary.errors}\n- Questões com gabarito: ${summary.withAnswer}\n- Questões sem gabarito: ${summary.withoutAnswer}\n- Imagens detectadas e extraídas: ${summary.images}\n- Status destinado às válidas: \`pendente_revisao\`\n- Status destinado às problemáticas: \`com_erro\`\n\n## Provas\n\n${exams.map((exam) => `- ${exam.titulo} — ${exam.fonteOficial}`).join("\n")}\n\n## Problemas e revisão manual\n\n${problems}\n\n## Segurança editorial\n\n- Explicações não foram geradas.\n- Conteúdo curricular permanece nulo quando a classificação não é segura.\n- Questões anuladas ou sem gabarito não entram no conjunto válido.\n- A importação no banco exige comando separado e confirmação explícita.\n`;
}

async function writeJson(filePath: string, value: unknown) { await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8"); }
function relative(filePath: string) { return path.relative(process.cwd(), filePath).replaceAll("\\", "/"); }
function groupBy<T>(items: T[], key: (item: T) => string) { const map = new Map<string, T[]>(); for (const item of items) map.set(key(item), [...(map.get(key(item)) ?? []), item]); return map; }
function sum(items: GroupSummary[], key: keyof Pick<GroupSummary, "detected" | "valid" | "errors" | "withAnswer" | "withoutAnswer" | "images">) { return items.reduce((total, item) => total + item[key], 0); }
