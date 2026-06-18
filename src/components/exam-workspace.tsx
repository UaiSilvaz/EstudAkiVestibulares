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
  Strikethrough,
  Trash2,
  Undo2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import {
  PointerEvent,
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

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
      <section className="estudaki-card overflow-hidden rounded-[32px]">
        <div className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 p-3 backdrop-blur-xl">
          <div className="flex flex-wrap items-center gap-2">
            {toolMeta.map((item) => (
              <ToolButton key={item.id} active={tool === item.id} title={item.label} onClick={() => setTool(item.id)}>
                {item.icon}
              </ToolButton>
            ))}

            <div className="mx-1 hidden h-8 w-px bg-slate-200 sm:block" />

            {colors.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setColor(item)}
                className={`h-8 w-8 rounded-full border-2 ${color === item ? "border-slate-950" : "border-white"}`}
                style={{ background: item }}
                title={`Cor ${item}`}
              />
            ))}

            <ControlLabel label="Espessura">
              <input
                type="range"
                min={2}
                max={18}
                value={size}
                onChange={(event) => setSize(Number(event.target.value))}
                className="w-24"
              />
            </ControlLabel>

            <ControlLabel label="Opacidade">
              <input
                type="range"
                min={15}
                max={100}
                value={opacity}
                onChange={(event) => setOpacity(Number(event.target.value))}
                className="w-24"
              />
            </ControlLabel>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <SegmentButton active={documentKind === "exam"} onClick={() => setDocumentKind("exam")}>
              Prova
            </SegmentButton>
            <SegmentButton active={documentKind === "answer"} onClick={() => setDocumentKind("answer")} disabled={!exam.answerKeyUrl}>
              Gabarito
            </SegmentButton>

            <div className="mx-1 hidden h-8 w-px bg-slate-200 sm:block" />

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
            <IconButton title={`Refazer${redoStack.length ? ` (${redoStack.length})` : ""}`} onClick={redo}>
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
        </div>

        <div className="relative min-h-[760px] overflow-auto bg-slate-100 p-3 sm:p-5">
          <div
            className="relative mx-auto min-h-[720px] w-[980px] max-w-none origin-top rounded-[18px] bg-white shadow-2xl"
            style={{ transform: `scale(${zoom / 100})`, marginBottom: `${Math.max(0, zoom - 100) * 6}px` }}
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
      </section>

      <aside className="space-y-5">
        <div className="estudaki-card rounded-[30px] p-6">
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

        <div className="estudaki-card rounded-[30px] p-6">
          <p className="mb-3 text-sm font-black text-slate-800">Arquivos oficiais</p>
          <div className="grid gap-2">
            <ExternalButton href={exam.pdfUrl} label="Abrir PDF original" icon={<Download className="h-4 w-4" />} />
            <ExternalButton href={exam.answerKeyUrl} label="Abrir gabarito" icon={<KeyRound className="h-4 w-4" />} />
            <ExternalButton href={exam.sourceUrl} label="Ver fonte oficial" icon={<LinkIcon className="h-4 w-4" />} />
          </div>
        </div>

        <div className="estudaki-card rounded-[30px] p-6">
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
