"use client";

import {
  Brush,
  ArrowLeft,
  CheckCircle2,
  Download,
  Eraser,
  ExternalLink,
  FileDown,
  Highlighter,
  KeyRound,
  LinkIcon,
  MessageSquarePlus,
  MousePointer2,
  Pencil,
  Redo2,
  Save,
  Settings2,
  Strikethrough,
  Trash2,
  Undo2,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import Link from "next/link";
import type { PDFDocumentProxy } from "pdfjs-dist/types/src/display/api";
import {
  PointerEvent,
  type Dispatch,
  type SetStateAction,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type Tool = "pan" | "pen" | "pencil" | "marker" | "highlight" | "strike" | "note" | "erase-stroke" | "erase-brush";
type DocumentKind = "exam" | "answer";

type Point = {
  x: number;
  y: number;
};

type StrokeAnnotation = {
  id: string;
  document: DocumentKind;
  page: number;
  type: Exclude<Tool, "pan" | "note" | "erase-stroke" | "erase-brush">;
  points: Point[];
  color: string;
  size: number;
  opacity: number;
  createdAt: string;
};

type NoteAnnotation = {
  id: string;
  document: DocumentKind;
  page: number;
  type: "note";
  x: number;
  y: number;
  text: string;
  color: string;
  createdAt: string;
};

type Annotation = StrokeAnnotation | NoteAnnotation;

type Exam = {
  id: string;
  title: string;
  year: number;
  phase: string;
  day: string | null;
  pdfUrl: string | null;
  answerKeyUrl: string | null;
  sourceUrl: string | null;
  imageUrl: string | null;
  questionCount: number | null;
  durationMinutes: number | null;
  color: string;
  official: boolean;
  availableQuestionCount?: number;
  vestibular: { name: string; slug: string; color: string };
};

const colors = ["#2563EB", "#0F172A", "#FACC15", "#22C55E", "#FB7185", "#7C3AED", "#F97316"];

const toolMeta: Array<{ id: Tool; label: string; icon: React.ReactNode }> = [
  { id: "pan", label: "Navegar", icon: <MousePointer2 className="h-4 w-4" /> },
  { id: "pen", label: "Caneta", icon: <Pencil className="h-4 w-4" /> },
  { id: "pencil", label: "Lapis", icon: <Brush className="h-4 w-4" /> },
  { id: "marker", label: "Marcador", icon: <Highlighter className="h-4 w-4" /> },
  { id: "highlight", label: "Marca-texto", icon: <Highlighter className="h-4 w-4" /> },
  { id: "strike", label: "Riscar", icon: <Strikethrough className="h-4 w-4" /> },
  { id: "note", label: "Nota", icon: <MessageSquarePlus className="h-4 w-4" /> },
  { id: "erase-stroke", label: "Borracha por traco", icon: <Eraser className="h-4 w-4" /> },
  { id: "erase-brush", label: "Borracha pincel", icon: <Eraser className="h-4 w-4" /> },
];

const answerOptions = ["A", "B", "C", "D", "E"];

export function ExamWorkspace({
  exam,
  backHref = "/provas",
  initialDocumentKind = "exam",
}: {
  exam: Exam;
  backHref?: string;
  initialDocumentKind?: DocumentKind;
}) {
  const storageKey = useMemo(() => `estudaki-exam-${exam.id}-annotations-v3`, [exam.id]);
  const answerStorageKey = useMemo(() => `estudaki-old-exam-${exam.id}-answer-sheet-v1`, [exam.id]);
  const [annotations, setAnnotations] = useState<Annotation[]>(() => readSavedAnnotations(storageKey));
  const [redoStack, setRedoStack] = useState<Annotation[]>([]);
  const [currentStroke, setCurrentStroke] = useState<StrokeAnnotation | null>(null);
  const [tool, setTool] = useState<Tool>("marker");
  const [documentKind, setDocumentKind] = useState<DocumentKind>(initialDocumentKind);
  const [color, setColor] = useState(colors[0]);
  const [size, setSize] = useState(4);
  const [opacity, setOpacity] = useState(55);
  const [zoom, setZoom] = useState(100);
  const [noteText, setNoteText] = useState("Revisar esta parte");
  const [toolsOpen, setToolsOpen] = useState(false);
  const [answers, setAnswers] = useState<Record<number, string>>(() => readSavedAnswerSheet(answerStorageKey));

  const activeUrl = documentKind === "exam" ? exam.pdfUrl : exam.answerKeyUrl;
  const visibleAnnotations = annotations.filter((annotation) => annotation.document === documentKind);
  const canDraw = tool !== "pan";
  const questionCount = Math.max(1, Math.min(exam.questionCount ?? 90, 180));
  const answeredCount = Object.keys(answers).length;

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(annotations));
  }, [annotations, storageKey]);

  useEffect(() => {
    window.localStorage.setItem(answerStorageKey, JSON.stringify(answers));
  }, [answerStorageKey, answers]);

  function pointFromEvent(event: PointerEvent<HTMLDivElement>): Point {
    const surface = event.currentTarget;
    const rect = surface.getBoundingClientRect();
    return {
      x: clampPercent(((event.clientX - rect.left) / rect.width) * 100),
      y: clampPercent(((event.clientY - rect.top) / rect.height) * 100),
    };
  }

  function createStroke(point: Point, page: number): StrokeAnnotation {
    const strokeType = tool === "erase-brush" || tool === "erase-stroke" || tool === "note" || tool === "pan" ? "pen" : tool;
    const isMarker = strokeType === "highlight" || strokeType === "marker";
    return {
      id: crypto.randomUUID(),
      document: documentKind,
      page,
      type: strokeType,
      points: [point],
      color,
      size: strokeType === "strike" ? size + 5 : size,
      opacity: isMarker ? opacity / 100 : Math.max(opacity / 100, 0.8),
      createdAt: new Date().toISOString(),
    };
  }

  function pushAnnotation(annotation: Annotation) {
    setAnnotations((current) => [...current, annotation]);
    setRedoStack([]);
  }

  function eraseNear(point: Point, page: number, radius = 3.5) {
    setAnnotations((current) =>
      current.filter((annotation) => {
        if (annotation.document !== documentKind || annotation.page !== page) return true;
        if (annotation.type === "note") {
          return distance(point, { x: annotation.x, y: annotation.y }) > radius * 1.4;
        }
        return !annotation.points.some((strokePoint) => distance(point, strokePoint) <= radius);
      }),
    );
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>, page: number) {
    if (tool === "pan") return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = pointFromEvent(event);

    if (tool === "erase-stroke" || tool === "erase-brush") {
      eraseNear(point, page, tool === "erase-brush" ? size * 1.2 : 4);
      return;
    }

    if (tool === "note") {
      pushAnnotation({
        id: crypto.randomUUID(),
        document: documentKind,
        page,
        type: "note",
        x: point.x,
        y: point.y,
        text: noteText,
        color,
        createdAt: new Date().toISOString(),
      });
      return;
    }

    setCurrentStroke(createStroke(point, page));
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>, page: number) {
    if (!canDraw) return;
    const point = pointFromEvent(event);

    if (tool === "erase-brush" && event.buttons === 1) {
      eraseNear(point, page, size * 1.2);
      return;
    }

    if (!currentStroke || currentStroke.page !== page) return;
    setCurrentStroke((current) => (current ? { ...current, points: [...current.points, point] } : current));
  }

  function finishStroke() {
    if (!currentStroke) return;
    if (currentStroke.points.length > 1) pushAnnotation(currentStroke);
    setCurrentStroke(null);
  }

  function undo() {
    setAnnotations((current) => {
      const next = [...current];
      const removed = next.pop();
      if (removed) setRedoStack((stack) => [removed, ...stack]);
      return next;
    });
  }

  function redo() {
    setRedoStack((stack) => {
      const [next, ...rest] = stack;
      if (next) setAnnotations((current) => [...current, next]);
      return rest;
    });
  }

  function clearAnnotations() {
    setAnnotations((current) => current.filter((annotation) => annotation.document !== documentKind));
    setRedoStack([]);
  }

  function exportAnnotations() {
    const blob = new Blob([JSON.stringify({ exam, annotations }, null, 2)], {
      type: "application/json;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${exam.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-anotacoes.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function selectAnswer(questionNumber: number, answer: string) {
    setAnswers((current) => ({ ...current, [questionNumber]: answer }));
  }

  function clearAnswers() {
    setAnswers({});
  }

  const toolbar = (
    <ToolbarPanel
      tool={tool}
      setTool={setTool}
      color={color}
      setColor={setColor}
      size={size}
      setSize={setSize}
      opacity={opacity}
      setOpacity={setOpacity}
      documentKind={documentKind}
      setDocumentKind={setDocumentKind}
      hasAnswerKey={!!exam.answerKeyUrl}
      zoom={zoom}
      setZoom={setZoom}
      redoCount={redoStack.length}
      undo={undo}
      redo={redo}
      exportAnnotations={exportAnnotations}
      clearAnnotations={clearAnnotations}
    />
  );

  return (
    <div className="relative mx-auto w-full min-w-0 overflow-x-hidden">
      <Link href={backHref} className="estudaki-button estudaki-button-ghost mb-4 inline-flex">
        <ArrowLeft className="h-4 w-4" /> Voltar para Provas Antigas
      </Link>
      <div className="mb-4 flex items-start justify-between gap-3 rounded-[28px] border border-blue-100 bg-white/92 p-4 shadow-[0_18px_44px_-30px_rgba(15,23,42,0.24)] backdrop-blur lg:hidden">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-blue-700">
            Prova antiga
          </p>
          <h1 className="mt-1 line-clamp-2 font-display text-xl font-black text-[#0F172A]">
            {exam.title}
          </h1>
          <p className="mt-1 text-xs font-bold text-slate-500">
            {exam.phase} - {exam.day ?? "Caderno unico"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setToolsOpen(true)}
          className="flex h-11 shrink-0 items-center gap-2 rounded-2xl bg-gradient-to-r from-[#2563EB] to-[#22D3EE] px-4 text-xs font-black uppercase tracking-wider text-white shadow-md"
        >
          <Settings2 className="h-4 w-4" />
          Ferramentas
        </button>
      </div>

      <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_360px] 2xl:grid-cols-[minmax(0,1fr)_390px]">
        <section className="min-w-0">
          <div className="sticky top-4 z-30 mb-4 hidden rounded-[28px] border border-blue-100/80 bg-white/95 p-3 shadow-[0_18px_44px_-30px_rgba(15,23,42,0.30)] backdrop-blur-xl lg:block">
            {toolbar}
          </div>

          <div className="overflow-hidden rounded-[32px] border border-blue-100/70 bg-white shadow-[0_24px_70px_-42px_rgba(15,23,42,0.34)]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 sm:px-5">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-700">
                  {documentKind === "exam" ? "Visualizando prova" : "Visualizando gabarito"}
                </p>
                <h2 className="mt-1 truncate text-sm font-black text-slate-800 sm:text-base">
                  {documentKind === "exam" ? exam.title : `${exam.title} - gabarito`}
                </h2>
              </div>
              <span className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-blue-700">
                Zoom {zoom}%
              </span>
            </div>

            <div className="thin-scrollbar relative h-[calc(100vh-210px)] min-h-[560px] overflow-auto bg-gradient-to-br from-slate-100 via-[#F8FBFF] to-[#EEF8FF] p-3 sm:p-5 lg:h-[calc(100vh-230px)] lg:min-h-[700px]">
              {activeUrl ? (
                <PdfDocument
                  url={activeUrl}
                  title={documentKind === "exam" ? exam.title : `${exam.title} - gabarito`}
                  zoom={zoom}
                  annotations={[...visibleAnnotations, ...(currentStroke ? [currentStroke] : [])]}
                  canDraw={canDraw}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={finishStroke}
                />
              ) : (
                <FallbackPaper exam={exam} documentKind={documentKind} />
              )}
            </div>
          </div>
        </section>

        <aside className="min-w-0 space-y-5 xl:sticky xl:top-4 xl:self-start">
        <div className="rounded-[30px] border border-blue-100/70 bg-white p-6 shadow-[0_22px_54px_-38px_rgba(15,23,42,0.28)]">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">Prova antiga</p>
          <h1 className="mt-2 text-2xl font-black text-slate-950">{exam.title}</h1>
          <p className="mt-2 text-sm font-semibold text-slate-500">
            {exam.phase} - {exam.day ?? "Caderno unico"}
          </p>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <MiniStat label="Ano" value={String(exam.year)} />
            <MiniStat label="Marcacoes" value={String(visibleAnnotations.length)} />
            <MiniStat label="QuestÃµes" value={exam.questionCount ? String(exam.questionCount) : "--"} />
            <MiniStat label="Tempo" value={exam.durationMinutes ? `${exam.durationMinutes}m` : "--"} />
          </div>
        </div>

        <AnswerSheet
          answers={answers}
          answeredCount={answeredCount}
          questionCount={questionCount}
          hasAnswerKey={!!exam.answerKeyUrl}
          setDocumentKind={setDocumentKind}
          onSelect={selectAnswer}
          onClear={clearAnswers}
        />

        <div className="rounded-[30px] border border-blue-100/70 bg-white p-6 shadow-[0_22px_54px_-38px_rgba(15,23,42,0.28)]">
          <p className="mb-3 text-sm font-black text-slate-800">Arquivos oficiais</p>
          <div className="grid gap-2">
            <ExternalButton href={exam.pdfUrl} label="Abrir PDF original" icon={<Download className="h-4 w-4" />} />
            <ExternalButton href={exam.answerKeyUrl} label="Abrir gabarito" icon={<KeyRound className="h-4 w-4" />} />
            <ExternalButton href={exam.sourceUrl} label="Ver fonte oficial" icon={<LinkIcon className="h-4 w-4" />} />
          </div>
        </div>

        <div className="rounded-[30px] border border-blue-100/70 bg-white p-6 shadow-[0_22px_54px_-38px_rgba(15,23,42,0.28)]">
          <label className="block">
            <span className="mb-2 block text-sm font-black text-slate-800">Texto da nota</span>
            <textarea className="estudaki-input min-h-28" value={noteText} onChange={(event) => setNoteText(event.target.value)} />
          </label>
          <p className="mt-3 text-xs font-semibold leading-5 text-slate-500">
            Use Navegar para mexer no PDF. Use as ferramentas para desenhar por cima; as anotacoes ficam salvas no navegador.
          </p>
        </div>
        </aside>
      </div>

      {toolsOpen && (
        <div className="fixed inset-0 z-[70] lg:hidden">
          <button
            type="button"
            aria-label="Fechar ferramentas"
            onClick={() => setToolsOpen(false)}
            className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm"
          />
          <div className="absolute inset-x-3 bottom-3 max-h-[82vh] overflow-hidden rounded-[30px] border border-white/70 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-blue-700">
                  Editor
                </p>
                <h2 className="font-display text-lg font-black text-[#0F172A]">
                  Ferramentas da prova
                </h2>
              </div>
              <button
                type="button"
                aria-label="Fechar"
                onClick={() => setToolsOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="thin-scrollbar max-h-[calc(82vh-74px)] overflow-y-auto p-4">
              {toolbar}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
function ToolbarPanel({
  tool,
  setTool,
  color,
  setColor,
  size,
  setSize,
  opacity,
  setOpacity,
  documentKind,
  setDocumentKind,
  hasAnswerKey,
  zoom,
  setZoom,
  redoCount,
  undo,
  redo,
  exportAnnotations,
  clearAnnotations,
}: {
  tool: Tool;
  setTool: Dispatch<SetStateAction<Tool>>;
  color: string;
  setColor: Dispatch<SetStateAction<string>>;
  size: number;
  setSize: Dispatch<SetStateAction<number>>;
  opacity: number;
  setOpacity: Dispatch<SetStateAction<number>>;
  documentKind: DocumentKind;
  setDocumentKind: Dispatch<SetStateAction<DocumentKind>>;
  hasAnswerKey: boolean;
  zoom: number;
  setZoom: Dispatch<SetStateAction<number>>;
  redoCount: number;
  undo: () => void;
  redo: () => void;
  exportAnnotations: () => void;
  clearAnnotations: () => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {toolMeta.map((item) => (
          <ToolButton key={item.id} active={tool === item.id} title={item.label} onClick={() => setTool(item.id)}>
            {item.icon}
          </ToolButton>
        ))}

        <div className="mx-1 hidden h-8 w-px bg-slate-200 sm:block" />

        <div className="flex flex-wrap items-center gap-2">
          {colors.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setColor(item)}
              className={`h-9 w-9 rounded-full border-2 shadow-sm transition ${
                color === item ? "border-slate-950 ring-4 ring-blue-100" : "border-white"
              }`}
              style={{ background: item }}
              title={`Cor ${item}`}
            />
          ))}
        </div>
      </div>

      <div className="grid gap-2 md:grid-cols-[auto_auto_1fr] md:items-center">
        <div className="flex flex-wrap items-center gap-2">
          <SegmentButton active={documentKind === "exam"} onClick={() => setDocumentKind("exam")}>
            Prova
          </SegmentButton>
          <SegmentButton active={documentKind === "answer"} onClick={() => setDocumentKind("answer")} disabled={!hasAnswerKey}>
            Gabarito
          </SegmentButton>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <IconButton title="Diminuir zoom" onClick={() => setZoom((value) => Math.max(70, value - 10))}>
            <ZoomOut className="h-4 w-4" />
          </IconButton>
          <span className="min-w-14 text-center text-sm font-black text-slate-700">{zoom}%</span>
          <IconButton title="Aumentar zoom" onClick={() => setZoom((value) => Math.min(210, value + 10))}>
            <ZoomIn className="h-4 w-4" />
          </IconButton>
          <IconButton title="Desfazer" onClick={undo}>
            <Undo2 className="h-4 w-4" />
          </IconButton>
          <IconButton title={`Refazer${redoCount ? ` (${redoCount})` : ""}`} onClick={redo}>
            <Redo2 className="h-4 w-4" />
          </IconButton>
          <IconButton title="Salvar no navegador">
            <Save className="h-4 w-4" />
          </IconButton>
          <IconButton title="Exportar anotacoes" onClick={exportAnnotations}>
            <FileDown className="h-4 w-4" />
          </IconButton>
          <IconButton title="Limpar documento atual" onClick={clearAnnotations}>
            <Trash2 className="h-4 w-4" />
          </IconButton>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <ControlLabel label="Espessura">
            <input
              type="range"
              min={2}
              max={18}
              value={size}
              onChange={(event) => setSize(Number(event.target.value))}
              className="w-full min-w-24 accent-blue-600"
            />
          </ControlLabel>
          <ControlLabel label="Opacidade">
            <input
              type="range"
              min={15}
              max={100}
              value={opacity}
              onChange={(event) => setOpacity(Number(event.target.value))}
              className="w-full min-w-24 accent-blue-600"
            />
          </ControlLabel>
        </div>
      </div>
    </div>
  );
}

function readSavedAnnotations(storageKey: string): Annotation[] {
  if (typeof window === "undefined") return [];
  try {
    const saved = window.localStorage.getItem(storageKey);
    return saved ? (JSON.parse(saved) as Annotation[]) : [];
  } catch {
    return [];
  }
}

function readSavedAnswerSheet(storageKey: string): Record<number, string> {
  if (typeof window === "undefined") return {};
  try {
    const saved = window.localStorage.getItem(storageKey);
    if (!saved) return {};
    const parsed = JSON.parse(saved) as Record<string, unknown>;
    return Object.fromEntries(
      Object.entries(parsed)
        .map(([question, answer]) => [Number(question), String(answer).toUpperCase()] as const)
        .filter(([question, answer]) => Number.isInteger(question) && question > 0 && answerOptions.includes(answer)),
    );
  } catch {
    return {};
  }
}

function proxiedPdfUrl(url: string) {
  if (url.startsWith("/")) return url;
  return `/api/pdf-proxy?url=${encodeURIComponent(url)}`;
}

type PdfDocumentProps = {
  url: string;
  title: string;
  zoom: number;
  annotations: Annotation[];
  canDraw: boolean;
  onPointerDown: (event: PointerEvent<HTMLDivElement>, page: number) => void;
  onPointerMove: (event: PointerEvent<HTMLDivElement>, page: number) => void;
  onPointerUp: () => void;
};

function PdfDocument({
  url,
  title,
  zoom,
  annotations,
  canDraw,
  onPointerDown,
  onPointerMove,
  onPointerUp,
}: PdfDocumentProps) {
  const src = proxiedPdfUrl(url);
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [status, setStatus] = useState("Carregando PDF oficial...");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    let loadingTask: { promise: Promise<PDFDocumentProxy>; destroy: () => Promise<void> } | null = null;

    async function load() {
      setPdf(null);
      setError("");
      setStatus("Carregando PDF oficial...");
      try {
        const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
        pdfjs.GlobalWorkerOptions.workerSrc = "/api/pdf-worker";
        loadingTask = pdfjs.getDocument({
          url: src,
          withCredentials: src.startsWith("/"),
          disableAutoFetch: false,
          disableStream: false,
        }) as { promise: Promise<PDFDocumentProxy>; destroy: () => Promise<void> };
        const loaded = await loadingTask.promise;
        if (cancelled) {
          return;
        }
        setPdf(loaded);
        setStatus(`${loaded.numPages} pagina(s) prontas`);
      } catch {
        if (!cancelled) {
          setError("Nao foi possivel abrir este PDF agora.");
          setStatus("PDF indisponivel");
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
      if (loadingTask) void loadingTask.destroy();
    };
  }, [src]);

  return (
    <div className="min-h-[840px] px-1 py-3 sm:px-3 sm:py-5">
      <div className="mb-4 flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700">
        <span className="min-w-0 truncate">{title}</span>
        <a href={url} target="_blank" rel="noreferrer" className="inline-flex shrink-0 items-center gap-1 text-blue-700">
          Abrir PDF
          <ExternalLink className="h-4 w-4" />
        </a>
      </div>
      {error ? (
        <div className="rounded-[26px] border border-rose-100 bg-white p-8 text-center shadow-sm">
          <p className="text-lg font-black text-slate-950">{error}</p>
          <p className="mt-2 text-sm font-semibold text-slate-500">
            Tente abrir pela fonte oficial ou recarregue a pagina.
          </p>
        </div>
      ) : pdf ? (
        <div className="space-y-5">
          {Array.from({ length: pdf.numPages }, (_, index) => (
            <PdfPageCanvas
              key={`${src}-${index + 1}`}
              pdf={pdf}
              pageNumber={index + 1}
              zoom={zoom}
              annotations={annotations}
              canDraw={canDraw}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
            />
          ))}
        </div>
      ) : (
        <div className="grid min-h-[620px] place-items-center rounded-[26px] border border-blue-100 bg-white text-center shadow-sm">
          <div>
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600" />
            <p className="mt-4 text-sm font-black uppercase tracking-[0.18em] text-blue-700">{status}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function PdfPageCanvas({
  pdf,
  pageNumber,
  zoom,
  annotations,
  canDraw,
  onPointerDown,
  onPointerMove,
  onPointerUp,
}: {
  pdf: PDFDocumentProxy;
  pageNumber: number;
  zoom: number;
  annotations: Annotation[];
  canDraw: boolean;
  onPointerDown: (event: PointerEvent<HTMLDivElement>, page: number) => void;
  onPointerMove: (event: PointerEvent<HTMLDivElement>, page: number) => void;
  onPointerUp: () => void;
}) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [visible, setVisible] = useState(pageNumber <= 2);
  const [dimensions, setDimensions] = useState(() => fallbackPageDimensions(zoom));
  const pageAnnotations = annotations.filter((annotation) => annotation.page === pageNumber);
  const displayDimensions = visible ? dimensions : fallbackPageDimensions(zoom);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper || visible) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { root: null, rootMargin: "900px 0px" },
    );
    observer.observe(wrapper);
    return () => observer.disconnect();
  }, [visible]);

  useEffect(() => {
    if (!visible) return;

    let cancelled = false;
    let renderTask: { promise: Promise<void>; cancel: () => void } | null = null;

    async function render() {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const page = await pdf.getPage(pageNumber);
      if (cancelled) return;

      const scale = Math.max(0.75, Math.min(2.8, (zoom / 100) * 1.35));
      const viewport = page.getViewport({ scale });
      const deviceScale = Math.min(window.devicePixelRatio || 1, 2);
      const renderViewport = page.getViewport({ scale: scale * deviceScale });
      const context = canvas.getContext("2d");
      if (!context) return;

      setDimensions({
        width: Math.round(viewport.width),
        height: Math.round(viewport.height),
      });
      canvas.width = Math.floor(renderViewport.width);
      canvas.height = Math.floor(renderViewport.height);
      canvas.style.width = "100%";
      canvas.style.height = "100%";
      context.setTransform(1, 0, 0, 1, 0, 0);
      context.clearRect(0, 0, canvas.width, canvas.height);

      renderTask = page.render({
        canvas,
        canvasContext: context,
        viewport: renderViewport,
      }) as { promise: Promise<void>; cancel: () => void };
      await renderTask.promise.catch((error: unknown) => {
        if (error instanceof Error && error.name === "RenderingCancelledException") return;
        throw error;
      });
    }

    void render();
    return () => {
      cancelled = true;
      if (renderTask) renderTask.cancel();
    };
  }, [pdf, pageNumber, visible, zoom]);

  return (
    <div ref={wrapperRef} className="mx-auto">
      <div
        className="relative mx-auto overflow-hidden rounded-[10px] bg-white shadow-[0_18px_45px_-30px_rgba(15,23,42,0.65)] ring-1 ring-slate-200"
        style={{
          width: `${displayDimensions.width}px`,
          maxWidth: zoom <= 100 ? "100%" : undefined,
          aspectRatio: `${displayDimensions.width} / ${displayDimensions.height}`,
        }}
      >
        <canvas ref={canvasRef} className="block h-full w-full bg-white" aria-label={`Pagina ${pageNumber}`} />
        {!visible && (
          <div className="absolute inset-0 grid place-items-center bg-slate-50 text-xs font-black uppercase tracking-wider text-slate-400">
            Pagina {pageNumber}
          </div>
        )}
        <PageAnnotationLayer
          page={pageNumber}
          annotations={pageAnnotations}
          canDraw={canDraw}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
        />
      </div>
      <p className="mt-2 text-center text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">
        Pagina {pageNumber}
      </p>
    </div>
  );
}

function PageAnnotationLayer({
  page,
  annotations,
  canDraw,
  onPointerDown,
  onPointerMove,
  onPointerUp,
}: {
  page: number;
  annotations: Annotation[];
  canDraw: boolean;
  onPointerDown: (event: PointerEvent<HTMLDivElement>, page: number) => void;
  onPointerMove: (event: PointerEvent<HTMLDivElement>, page: number) => void;
  onPointerUp: () => void;
}) {
  return (
    <div
      className={`absolute inset-0 ${canDraw ? "touch-none cursor-crosshair" : "pointer-events-none"}`}
      onPointerDown={(event) => onPointerDown(event, page)}
      onPointerMove={(event) => onPointerMove(event, page)}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onPointerLeave={onPointerUp}
    >
      <svg className="h-full w-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
        {annotations.map((annotation) =>
          annotation.type === "note" ? null : (
            <polyline
              key={annotation.id}
              points={annotation.points.map((point) => `${point.x},${point.y}`).join(" ")}
              vectorEffect="non-scaling-stroke"
              fill="none"
              stroke={annotation.color}
              strokeWidth={annotation.size}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={annotation.opacity}
              style={{
                mixBlendMode: annotation.type === "highlight" || annotation.type === "marker" ? "multiply" : "normal",
              }}
            />
          ),
        )}
      </svg>
      {annotations
        .filter((annotation): annotation is NoteAnnotation => annotation.type === "note")
        .map((annotation) => (
          <div
            key={annotation.id}
            className="absolute max-w-[260px] -translate-x-2 -translate-y-2 rounded-2xl border bg-white p-3 text-xs font-bold text-slate-700 shadow-xl"
            style={{ left: `${annotation.x}%`, top: `${annotation.y}%`, borderColor: annotation.color }}
          >
            {annotation.text}
          </div>
        ))}
    </div>
  );
}

function fallbackPageDimensions(zoom: number) {
  const scale = Math.max(0.75, Math.min(2.8, (zoom / 100) * 1.35));
  return {
    width: Math.round(612 * scale),
    height: Math.round(792 * scale),
  };
}

function distance(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function clampPercent(value: number) {
  return Math.min(100, Math.max(0, value));
}

function ToolButton({
  active,
  title,
  onClick,
  children,
}: {
  active: boolean;
  title: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`estudaki-button h-11 px-3 ${active ? "estudaki-button-primary" : "estudaki-button-ghost"}`}
      title={title}
    >
      {children}
    </button>
  );
}

function IconButton({
  title,
  onClick,
  children,
}: {
  title: string;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <button type="button" onClick={onClick} className="estudaki-button estudaki-button-ghost h-11 px-3" title={title}>
      {children}
    </button>
  );
}

function ControlLabel({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-600">
      {label}
      {children}
    </label>
  );
}

function SegmentButton({
  active,
  disabled,
  onClick,
  children,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`estudaki-button h-11 px-4 ${active ? "estudaki-button-primary" : "estudaki-button-ghost"}`}
    >
      {children}
    </button>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-xs font-bold uppercase text-slate-400">{label}</p>
      <p className="mt-1 text-xl font-black text-slate-950">{value}</p>
    </div>
  );
}

function AnswerSheet({
  answers,
  answeredCount,
  questionCount,
  hasAnswerKey,
  setDocumentKind,
  onSelect,
  onClear,
}: {
  answers: Record<number, string>;
  answeredCount: number;
  questionCount: number;
  hasAnswerKey: boolean;
  setDocumentKind: Dispatch<SetStateAction<DocumentKind>>;
  onSelect: (questionNumber: number, answer: string) => void;
  onClear: () => void;
}) {
  const progress = Math.round((answeredCount / questionCount) * 100);

  return (
    <div className="rounded-[30px] border border-blue-100/70 bg-white p-5 shadow-[0_22px_54px_-38px_rgba(15,23,42,0.28)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">Cartao-resposta</p>
          <h2 className="mt-1 text-xl font-black text-slate-950">
            {answeredCount}/{questionCount}
          </h2>
        </div>
        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
          {progress}%
        </span>
      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#2563EB] to-[#22D3EE]"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="thin-scrollbar mt-4 max-h-[420px] space-y-2 overflow-y-auto pr-1">
        {Array.from({ length: questionCount }, (_, index) => {
          const questionNumber = index + 1;
          const selected = answers[questionNumber];
          return (
            <div key={questionNumber} className="grid grid-cols-[2.75rem_1fr] items-center gap-2 rounded-2xl bg-slate-50 p-2">
              <span className="text-center text-xs font-black text-slate-500">{questionNumber}</span>
              <div className="grid grid-cols-5 gap-1">
                {answerOptions.map((answer) => (
                  <button
                    key={answer}
                    type="button"
                    onClick={() => onSelect(questionNumber, answer)}
                    className={`h-8 rounded-xl text-xs font-black transition ${
                      selected === answer
                        ? "bg-gradient-to-r from-[#2563EB] to-[#22D3EE] text-white shadow-sm"
                        : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-blue-50"
                    }`}
                    aria-label={`Questao ${questionNumber}, alternativa ${answer}`}
                  >
                    {answer}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
        <button
          type="button"
          disabled={!hasAnswerKey}
          onClick={() => setDocumentKind("answer")}
          className="estudaki-button estudaki-button-primary justify-center disabled:opacity-50"
        >
          <CheckCircle2 className="h-4 w-4" /> Conferir gabarito
        </button>
        <button type="button" onClick={onClear} className="estudaki-button estudaki-button-ghost justify-center">
          Limpar respostas
        </button>
      </div>
    </div>
  );
}

function ExternalButton({ href, label, icon }: { href: string | null; label: string; icon: React.ReactNode }) {
  if (!href) {
    return (
      <button type="button" disabled className="estudaki-button estudaki-button-ghost justify-start opacity-50">
        {icon}
        {label}
      </button>
    );
  }

  return (
    <a href={href} target="_blank" rel="noreferrer" className="estudaki-button estudaki-button-ghost justify-start">
      {icon}
      {label}
      <ExternalLink className="ml-auto h-3.5 w-3.5" />
    </a>
  );
}

function FallbackPaper({ exam, documentKind }: { exam: Exam; documentKind: DocumentKind }) {
  return (
    <div className="min-h-[840px] p-10">
      <div className="mb-8 flex items-center justify-between border-b border-slate-200 pb-6">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.18em] text-blue-600">{exam.vestibular.name}</p>
          <h2 className="mt-2 text-3xl font-black text-slate-950">{documentKind === "exam" ? exam.title : "Gabarito"}</h2>
        </div>
        <div className="rounded-2xl bg-blue-50 px-4 py-3 text-sm font-black text-blue-700">{exam.year}</div>
      </div>
      <p className="text-sm leading-7 text-slate-600">
        Este documento ainda nÃ£o possui um PDF cadastrado. Use a fonte oficial ou cadastre o arquivo no painel administrativo para abri-lo no editor.
      </p>
    </div>
  );
}
