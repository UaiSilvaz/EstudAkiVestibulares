"use client";

import {
  Brush,
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

export function ExamWorkspace({ exam }: { exam: Exam }) {
  const storageKey = useMemo(() => `estudaki-exam-${exam.id}-annotations-v2`, [exam.id]);
  const surfaceRef = useRef<HTMLDivElement | null>(null);
  const [annotations, setAnnotations] = useState<Annotation[]>(() => readSavedAnnotations(storageKey));
  const [redoStack, setRedoStack] = useState<Annotation[]>([]);
  const [currentStroke, setCurrentStroke] = useState<StrokeAnnotation | null>(null);
  const [tool, setTool] = useState<Tool>("marker");
  const [documentKind, setDocumentKind] = useState<DocumentKind>("exam");
  const [color, setColor] = useState(colors[0]);
  const [size, setSize] = useState(4);
  const [opacity, setOpacity] = useState(55);
  const [zoom, setZoom] = useState(100);
  const [noteText, setNoteText] = useState("Revisar esta parte");
  const [toolsOpen, setToolsOpen] = useState(false);

  const activeUrl = documentKind === "exam" ? exam.pdfUrl : exam.answerKeyUrl;
  const visibleAnnotations = annotations.filter((annotation) => annotation.document === documentKind);
  const canDraw = tool !== "pan";

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(annotations));
  }, [annotations, storageKey]);

  function pointFromEvent(event: PointerEvent<HTMLDivElement>): Point | null {
    const surface = surfaceRef.current;
    if (!surface) return null;

    const rect = surface.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * 100,
      y: ((event.clientY - rect.top) / rect.height) * 100,
    };
  }

  function createStroke(point: Point): StrokeAnnotation {
    const strokeType = tool === "erase-brush" || tool === "erase-stroke" || tool === "note" || tool === "pan" ? "pen" : tool;
    const isMarker = strokeType === "highlight" || strokeType === "marker";
    return {
      id: crypto.randomUUID(),
      document: documentKind,
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

  function eraseNear(point: Point, radius = 3.5) {
    setAnnotations((current) =>
      current.filter((annotation) => {
        if (annotation.document !== documentKind) return true;
        if (annotation.type === "note") {
          return distance(point, { x: annotation.x, y: annotation.y }) > radius * 1.4;
        }
        return !annotation.points.some((strokePoint) => distance(point, strokePoint) <= radius);
      }),
    );
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (tool === "pan") return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = pointFromEvent(event);
    if (!point) return;

    if (tool === "erase-stroke" || tool === "erase-brush") {
      eraseNear(point, tool === "erase-brush" ? size * 1.2 : 4);
      return;
    }

    if (tool === "note") {
      pushAnnotation({
        id: crypto.randomUUID(),
        document: documentKind,
        type: "note",
        x: point.x,
        y: point.y,
        text: noteText,
        color,
        createdAt: new Date().toISOString(),
      });
      return;
    }

    setCurrentStroke(createStroke(point));
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!canDraw) return;
    const point = pointFromEvent(event);
    if (!point) return;

    if (tool === "erase-brush" && event.buttons === 1) {
      eraseNear(point, size * 1.2);
      return;
    }

    if (!currentStroke) return;
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
              <div
                className="relative mx-auto min-h-[720px] rounded-[22px] bg-white shadow-[0_22px_54px_-32px_rgba(15,23,42,0.55)] ring-1 ring-slate-200/80"
                style={{
                  width: zoom <= 100 ? "min(100%, 980px)" : `${zoom}%`,
                  maxWidth: zoom <= 100 ? "980px" : `${Math.round(980 * (zoom / 100))}px`,
                  minWidth: zoom > 120 ? `${Math.round(760 * (zoom / 100))}px` : undefined,
                }}
              >
            {activeUrl ? (
              <PdfDocument
                url={activeUrl}
                title={documentKind === "exam" ? exam.title : `${exam.title} - gabarito`}
              />
            ) : (
              <FallbackPaper exam={exam} documentKind={documentKind} />
            )}

            <div
              ref={surfaceRef}
              className={`absolute inset-0 rounded-[18px] ${canDraw ? "touch-none cursor-crosshair" : "pointer-events-none"}`}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={finishStroke}
              onPointerCancel={finishStroke}
              onPointerLeave={finishStroke}
            >
              <svg className="h-full w-full overflow-visible rounded-[18px]" viewBox="0 0 100 100" preserveAspectRatio="none">
                {[...visibleAnnotations, ...(currentStroke ? [currentStroke] : [])].map((annotation) =>
                  annotation.type === "note" ? null : (
                    <polyline
                      key={annotation.id}
                      points={annotation.points.map((point) => `${point.x},${point.y}`).join(" ")}
                      vectorEffect="non-scaling-stroke"
                      fill="none"
                      stroke={annotation.color}
                      strokeWidth={annotation.size}
                      strokeLinecap={annotation.type === "pencil" ? "round" : "round"}
                      strokeLinejoin="round"
                      opacity={annotation.opacity}
                      style={{
                        mixBlendMode: annotation.type === "highlight" || annotation.type === "marker" ? "multiply" : "normal",
                      }}
                    />
                  ),
                )}
              </svg>
              {visibleAnnotations
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
          </div>
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
            <MiniStat label="Questoes" value={exam.questionCount ? String(exam.questionCount) : "--"} />
            <MiniStat label="Tempo" value={exam.durationMinutes ? `${exam.durationMinutes}m` : "--"} />
          </div>
        </div>

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

function proxiedPdfUrl(url: string) {
  if (url.startsWith("/")) return url;
  return `/api/pdf-proxy?url=${encodeURIComponent(url)}`;
}

function PdfDocument({ url, title }: { url: string; title: string }) {
  const holderRef = useRef<HTMLDivElement | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const holder = holderRef.current;
    if (!holder) return;

    async function renderPdf() {
      const currentHolder = holderRef.current;
      if (!currentHolder) return;
      setError("");
      setPageCount(0);
      currentHolder.innerHTML = "";

      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/build/pdf.worker.min.mjs",
          import.meta.url,
        ).toString();

        const pdf = await pdfjs.getDocument({ url: proxiedPdfUrl(url) }).promise;
        if (cancelled) return;
        setPageCount(pdf.numPages);

        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
          if (cancelled) return;
          const page = await pdf.getPage(pageNumber);
          const viewport = page.getViewport({ scale: 1.35 });
          const canvas = document.createElement("canvas");
          const context = canvas.getContext("2d");
          if (!context) continue;

          canvas.width = viewport.width;
          canvas.height = viewport.height;
          canvas.className = "mx-auto mb-4 block max-w-full rounded-sm bg-white shadow-[0_10px_24px_-18px_rgba(15,23,42,0.55)]";
          canvas.setAttribute("aria-label", `${title} pagina ${pageNumber}`);
          currentHolder.appendChild(canvas);

          await page.render({ canvas, canvasContext: context, viewport }).promise;
        }
      } catch {
        if (!cancelled) setError("Nao foi possivel renderizar este PDF dentro do editor.");
      }
    }

    void renderPdf();

    return () => {
      cancelled = true;
    };
  }, [title, url]);

  if (error) {
    return (
      <div className="min-h-[840px] p-10">
        <p className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-800">
          {error}
        </p>
        <a href={url} target="_blank" rel="noreferrer" className="estudaki-button estudaki-button-primary mt-4">
          Abrir PDF original
          <ExternalLink className="h-4 w-4" />
        </a>
      </div>
    );
  }

  return (
    <div className="min-h-[840px] bg-[#f8fafc] px-3 py-5">
      <div className="mb-4 flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700">
        <span>{title}</span>
        <span>{pageCount ? `${pageCount} paginas` : "Carregando PDF..."}</span>
      </div>
      <div ref={holderRef} />
    </div>
  );
}

function distance(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.y - b.y);
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
        Este documento ainda nao tem PDF direto cadastrado. Use a fonte oficial ou cadastre o PDF no painel admin para abrir dentro do editor.
      </p>
    </div>
  );
}
