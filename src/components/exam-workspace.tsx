"use client";

import {
  Download,
  Eraser,
  ExternalLink,
  FileDown,
  Highlighter,
  KeyRound,
  LinkIcon,
  MessageSquarePlus,
  Moon,
  Pencil,
  Save,
  Strikethrough,
  Sun,
  Trash2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { MouseEvent, useEffect, useMemo, useState } from "react";

type AnnotationMode = "highlight" | "note" | "pen" | "strike" | "erase";

type Annotation = {
  id: string;
  x: number;
  y: number;
  color: string;
  mode: Exclude<AnnotationMode, "erase">;
  size: number;
  text?: string;
  createdAt: string;
};

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

const colors = ["#2563EB", "#FACC15", "#22C55E", "#FB7185", "#7C3AED", "#0F172A"];

export function ExamWorkspace({ exam }: { exam: Exam }) {
  const storageKey = useMemo(() => `estudaki-exam-${exam.id}-annotations`, [exam.id]);
  const [annotations, setAnnotations] = useState<Annotation[]>(() =>
    readSavedAnnotations(`estudaki-exam-${exam.id}-annotations`),
  );
  const [mode, setMode] = useState<AnnotationMode>("highlight");
  const [color, setColor] = useState(colors[0]);
  const [zoom, setZoom] = useState(100);
  const [dark, setDark] = useState(false);
  const [noteText, setNoteText] = useState("Revisar esta parte");
  const [size, setSize] = useState(1);

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(annotations));
  }, [annotations, storageKey]);

  function addAnnotation(event: MouseEvent<HTMLDivElement>) {
    if (mode === "erase") return;

    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    const next: Annotation = {
      id: crypto.randomUUID(),
      x,
      y,
      color,
      mode,
      size,
      text: mode === "note" ? noteText : undefined,
      createdAt: new Date().toISOString(),
    };
    setAnnotations((current) => [...current, next]);
  }

  function removeAnnotation(id: string) {
    setAnnotations((current) => current.filter((annotation) => annotation.id !== id));
  }

  function clearAnnotations() {
    setAnnotations([]);
    window.localStorage.removeItem(storageKey);
  }

  function exportAnnotatedVersion() {
    const rows = annotations
      .map(
        (annotation, index) =>
          `<li><strong>${index + 1}. ${annotation.mode}</strong> - ${Math.round(annotation.x)}%, ${Math.round(annotation.y)}% - ${annotation.text ?? ""}</li>`,
      )
      .join("");
    const html = `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>${exam.title} - anotada</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 24px; color: #0f172a; }
    iframe { width: 100%; height: 820px; border: 1px solid #cbd5e1; border-radius: 12px; }
    .meta { color: #475569; margin-bottom: 16px; }
    li { margin: 8px 0; }
  </style>
</head>
<body>
  <h1>${exam.title}</h1>
  <p class="meta">${exam.vestibular.name} - ${exam.year} - ${exam.phase} - ${exam.day ?? "Caderno unico"}</p>
  ${exam.pdfUrl ? `<iframe src="${exam.pdfUrl}"></iframe>` : "<p>Sem PDF vinculado.</p>"}
  <h2>Anotacoes</h2>
  <ol>${rows || "<li>Nenhuma anotacao.</li>"}</ol>
  ${exam.answerKeyUrl ? `<p><a href="${exam.answerKeyUrl}">Gabarito / respostas esperadas</a></p>` : ""}
</body>
</html>`;
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${exam.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-anotada.html`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
      <section className="estudaki-card overflow-hidden rounded-[32px]">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-white p-3">
          <ToolButton active={mode === "highlight"} title="Marca-texto" onClick={() => setMode("highlight")}>
            <Highlighter className="h-4 w-4" />
          </ToolButton>
          <ToolButton active={mode === "pen"} title="Caneta" onClick={() => setMode("pen")}>
            <Pencil className="h-4 w-4" />
          </ToolButton>
          <ToolButton active={mode === "strike"} title="Riscar" onClick={() => setMode("strike")}>
            <Strikethrough className="h-4 w-4" />
          </ToolButton>
          <ToolButton active={mode === "note"} title="Nota" onClick={() => setMode("note")}>
            <MessageSquarePlus className="h-4 w-4" />
          </ToolButton>
          <ToolButton active={mode === "erase"} title="Apagar item" onClick={() => setMode("erase")}>
            <Eraser className="h-4 w-4" />
          </ToolButton>

          <div className="mx-2 h-8 w-px bg-slate-200" />

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

          <label className="ml-1 flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600">
            Tamanho
            <input
              type="range"
              min={1}
              max={4}
              value={size}
              onChange={(event) => setSize(Number(event.target.value))}
              className="w-20"
            />
          </label>

          <div className="mx-2 h-8 w-px bg-slate-200" />

          <IconButton title="Diminuir zoom" onClick={() => setZoom((value) => Math.max(70, value - 10))}>
            <ZoomOut className="h-4 w-4" />
          </IconButton>
          <span className="min-w-14 text-center text-sm font-black text-slate-700">{zoom}%</span>
          <IconButton title="Aumentar zoom" onClick={() => setZoom((value) => Math.min(180, value + 10))}>
            <ZoomIn className="h-4 w-4" />
          </IconButton>

          <IconButton title="Modo escuro" onClick={() => setDark((value) => !value)} className="ml-auto">
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </IconButton>
          <IconButton title="Salvar">
            <Save className="h-4 w-4" />
          </IconButton>
          <IconButton title="Baixar prova anotada" onClick={exportAnnotatedVersion}>
            <FileDown className="h-4 w-4" />
          </IconButton>
          <IconButton title="Limpar tudo" onClick={clearAnnotations}>
            <Trash2 className="h-4 w-4" />
          </IconButton>
        </div>

        <div className={`relative min-h-[760px] overflow-auto p-5 ${dark ? "bg-slate-950" : "bg-slate-100"}`}>
          <div
            className="relative mx-auto min-h-[720px] w-full max-w-5xl origin-top rounded-[18px] bg-white shadow-2xl"
            style={{ transform: `scale(${zoom / 100})`, marginBottom: `${Math.max(0, zoom - 100) * 5}px` }}
          >
            {exam.pdfUrl ? (
              <iframe title={exam.title} src={exam.pdfUrl} className="h-[760px] w-full rounded-[18px]" />
            ) : (
              <FallbackPaper exam={exam} />
            )}

            <div className="absolute inset-0 rounded-[18px]" onClick={addAnnotation}>
              {annotations.map((annotation) => (
                <button
                  key={annotation.id}
                  type="button"
                  className="absolute -translate-x-1/2 -translate-y-1/2 text-left"
                  style={{ left: `${annotation.x}%`, top: `${annotation.y}%` }}
                  onClick={(event) => {
                    if (mode === "erase") {
                      event.stopPropagation();
                      removeAnnotation(annotation.id);
                    }
                  }}
                  title={mode === "erase" ? "Apagar anotacao" : undefined}
                >
                  <AnnotationMark annotation={annotation} />
                </button>
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
            <MiniStat label="Marcacoes" value={String(annotations.length)} />
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
            Escolha uma ferramenta e clique sobre a prova. No modo borracha, clique em uma marcacao para apagar.
          </p>
        </div>
      </aside>
    </div>
  );
}

function readSavedAnnotations(storageKey: string) {
  if (typeof window === "undefined") return [];
  try {
    const saved = window.localStorage.getItem(storageKey);
    return saved ? (JSON.parse(saved) as Annotation[]) : [];
  } catch {
    return [];
  }
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
  className = "",
}: {
  title: string;
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button type="button" onClick={onClick} className={`estudaki-button estudaki-button-ghost h-11 px-3 ${className}`} title={title}>
      {children}
    </button>
  );
}

function AnnotationMark({ annotation }: { annotation: Annotation }) {
  const scale = annotation.size;
  if (annotation.mode === "note") {
    return (
      <div className="max-w-[260px] rounded-2xl border bg-white p-3 text-xs font-bold text-slate-700 shadow-xl" style={{ borderColor: annotation.color }}>
        {annotation.text}
      </div>
    );
  }
  if (annotation.mode === "pen") {
    return <div className="rounded-full opacity-85" style={{ width: 20 * scale, height: 20 * scale, background: annotation.color }} />;
  }
  if (annotation.mode === "strike") {
    return <div className="rotate-[-4deg] rounded-full opacity-90" style={{ width: 118 * scale, height: 5 * scale, background: annotation.color }} />;
  }
  return <div className="rounded-lg opacity-35" style={{ width: 118 * scale, height: 24 * scale, background: annotation.color }} />;
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

function FallbackPaper({ exam }: { exam: Exam }) {
  return (
    <div className="min-h-[760px] p-10">
      <div className="mb-8 flex items-center justify-between border-b border-slate-200 pb-6">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.18em] text-blue-600">{exam.vestibular.name}</p>
          <h2 className="mt-2 text-3xl font-black text-slate-950">{exam.title}</h2>
        </div>
        <div className="rounded-2xl bg-blue-50 px-4 py-3 text-sm font-black text-blue-700">{exam.year}</div>
      </div>
      <p className="text-sm leading-7 text-slate-600">
        Esta prova tem fonte oficial cadastrada, mas ainda nao tem PDF direto. Use o botao de fonte oficial para baixar o arquivo no acervo original, ou cadastre a URL do PDF no painel admin.
      </p>
      <div className="mt-8 grid gap-4">
        {["Bloco de leitura", "Questoes objetivas", "Revisao e gabarito"].map((title) => (
          <div key={title} className="rounded-[22px] border border-slate-200 p-5">
            <p className="mb-3 text-sm font-black text-slate-950">{title}</p>
            <p className="text-sm leading-7 text-slate-600">
              Clique nesta folha para criar marcacoes enquanto consulta a prova pelo acervo oficial.
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
