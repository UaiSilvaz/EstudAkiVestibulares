"use client";

import { FilePlus2, LinkIcon, UploadCloud } from "lucide-react";
import { useState } from "react";
import { loopImageForVestibular } from "@/lib/assets";

type Vestibular = { id: string; name: string; slug: string; color: string };
type Exam = {
  id: string;
  title: string;
  year: number;
  phase: string;
  day: string | null;
  pdfUrl: string | null;
  answerKeyUrl: string | null;
  sourceUrl: string | null;
  questionCount: number | null;
  durationMinutes: number | null;
  vestibular: { name: string };
};

export function ExamManager({
  vestibulares,
  exams,
}: {
  vestibulares: Vestibular[];
  exams: Exam[];
}) {
  const firstVestibular = vestibulares[0];
  const [form, setForm] = useState({
    vestibularId: firstVestibular?.id ?? "",
    title: "",
    year: new Date().getFullYear(),
    phase: "Primeira fase",
    day: "Unico",
    pdfUrl: "",
    answerKeyUrl: "",
    sourceUrl: "",
    imageUrl: firstVestibular?.slug ? loopImageForVestibular(firstVestibular.slug) : "",
    questionCount: 90,
    durationMinutes: 300,
    color: firstVestibular?.color ?? "#1E73FF",
  });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState<"pdfUrl" | "answerKeyUrl" | null>(null);

  async function uploadPdf(file: File, field: "pdfUrl" | "answerKeyUrl") {
    setUploading(field);
    setMessage("");

    const payload = new FormData();
    payload.append("file", file);

    const response = await fetch("/api/admin/uploads/exam-pdf", {
      method: "POST",
      body: payload,
    });
    const data = (await response.json().catch(() => null)) as { url?: string; error?: string } | null;
    setUploading(null);

    if (!response.ok || !data?.url) {
      setMessage(data?.error ?? "Nao foi possivel enviar o PDF.");
      return;
    }

    setForm((current) => ({ ...current, [field]: data.url }));
    setMessage(field === "pdfUrl" ? "PDF da prova enviado." : "Gabarito enviado.");
  }

  async function submit() {
    setLoading(true);
    setMessage("");
    const response = await fetch("/api/admin/exams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setLoading(false);
    setMessage(response.ok ? "Prova cadastrada." : "Nao foi possivel cadastrar.");
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[0.86fr_1fr]">
      <section className="estudaki-card rounded-[30px] p-6">
        <h2 className="mb-5 text-2xl font-black text-slate-950">Nova prova</h2>
        <div className="grid gap-4">
          <label>
            <span className="mb-2 block text-sm font-black text-slate-700">Vestibular</span>
            <select
              className="estudaki-input"
              value={form.vestibularId}
              onChange={(event) => {
                const selected = vestibulares.find((item) => item.id === event.target.value);
                setForm({
                  ...form,
                  vestibularId: event.target.value,
                  color: selected?.color ?? form.color,
                  imageUrl: selected?.slug ? loopImageForVestibular(selected.slug) : form.imageUrl,
                });
              }}
            >
              {vestibulares.map((vestibular) => (
                <option key={vestibular.id} value={vestibular.id}>
                  {vestibular.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className="mb-2 block text-sm font-black text-slate-700">Titulo</span>
            <input
              className="estudaki-input"
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
              placeholder="ENEM 2025 - Dia 1 - Caderno Azul"
            />
          </label>

          <div className="grid gap-4 md:grid-cols-3">
            <label>
              <span className="mb-2 block text-sm font-black text-slate-700">Ano</span>
              <input
                className="estudaki-input"
                type="number"
                value={form.year}
                onChange={(event) => setForm({ ...form, year: Number(event.target.value) })}
              />
            </label>
            <label>
              <span className="mb-2 block text-sm font-black text-slate-700">Fase</span>
              <input
                className="estudaki-input"
                value={form.phase}
                onChange={(event) => setForm({ ...form, phase: event.target.value })}
              />
            </label>
            <label>
              <span className="mb-2 block text-sm font-black text-slate-700">Dia/Caderno</span>
              <input
                className="estudaki-input"
                value={form.day}
                onChange={(event) => setForm({ ...form, day: event.target.value })}
              />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label>
              <span className="mb-2 block text-sm font-black text-slate-700">Questoes</span>
              <input
                className="estudaki-input"
                type="number"
                value={form.questionCount}
                onChange={(event) => setForm({ ...form, questionCount: Number(event.target.value) })}
              />
            </label>
            <label>
              <span className="mb-2 block text-sm font-black text-slate-700">Duracao (min)</span>
              <input
                className="estudaki-input"
                type="number"
                value={form.durationMinutes}
                onChange={(event) => setForm({ ...form, durationMinutes: Number(event.target.value) })}
              />
            </label>
          </div>

          <label>
            <span className="mb-2 block text-sm font-black text-slate-700">URL do PDF</span>
            <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
              <input
                className="estudaki-input"
                value={form.pdfUrl}
                onChange={(event) => setForm({ ...form, pdfUrl: event.target.value })}
                placeholder="https://... ou /uploads/exams/prova.pdf"
              />
              <label className="estudaki-button estudaki-button-ghost min-h-12 cursor-pointer">
                <UploadCloud className="h-4 w-4" />
                {uploading === "pdfUrl" ? "Enviando..." : "Upload"}
                <input
                  type="file"
                  accept="application/pdf,.pdf"
                  className="hidden"
                  disabled={uploading !== null}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void uploadPdf(file, "pdfUrl");
                    event.currentTarget.value = "";
                  }}
                />
              </label>
            </div>
          </label>

          <label>
            <span className="mb-2 block text-sm font-black text-slate-700">URL do gabarito / respostas</span>
            <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
              <input
                className="estudaki-input"
                value={form.answerKeyUrl}
                onChange={(event) => setForm({ ...form, answerKeyUrl: event.target.value })}
                placeholder="https://... ou /uploads/exams/gabarito.pdf"
              />
              <label className="estudaki-button estudaki-button-ghost min-h-12 cursor-pointer">
                <UploadCloud className="h-4 w-4" />
                {uploading === "answerKeyUrl" ? "Enviando..." : "Upload"}
                <input
                  type="file"
                  accept="application/pdf,.pdf"
                  className="hidden"
                  disabled={uploading !== null}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void uploadPdf(file, "answerKeyUrl");
                    event.currentTarget.value = "";
                  }}
                />
              </label>
            </div>
          </label>

          <label>
            <span className="mb-2 block text-sm font-black text-slate-700">Fonte oficial / acervo</span>
            <input
              className="estudaki-input"
              value={form.sourceUrl}
              onChange={(event) => setForm({ ...form, sourceUrl: event.target.value })}
              placeholder="https://..."
            />
          </label>

          <button
            type="button"
            onClick={submit}
            disabled={loading}
            className="estudaki-button estudaki-button-primary"
          >
            <FilePlus2 className="h-4 w-4" />
            Salvar prova
          </button>
          {message && <p className="text-sm font-bold text-slate-600">{message}</p>}
        </div>
      </section>

      <section className="estudaki-card rounded-[30px] p-6">
        <h2 className="mb-5 text-2xl font-black text-slate-950">Acervo cadastrado</h2>
        <div className="max-h-[760px] space-y-3 overflow-y-auto pr-2 thin-scrollbar">
          {exams.map((exam) => (
            <div key={exam.id} className="rounded-2xl border border-slate-100 bg-white p-4">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-600">
                {exam.vestibular.name} - {exam.year}
              </p>
              <p className="mt-2 font-black text-slate-950">{exam.title}</p>
              <p className="mt-1 text-sm font-semibold text-slate-500">
                {exam.phase} - {exam.day ?? "Caderno unico"} - {exam.pdfUrl ? "PDF" : "sem PDF"} -{" "}
                {exam.answerKeyUrl ? "gabarito" : "sem gabarito"}
              </p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-slate-500">
                <span className="rounded-full bg-slate-100 px-2.5 py-1">
                  {exam.questionCount ?? "--"} questoes
                </span>
                <span className="rounded-full bg-slate-100 px-2.5 py-1">
                  {exam.durationMinutes ?? "--"} min
                </span>
                {exam.sourceUrl && (
                  <a
                    href={exam.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-blue-700"
                  >
                    <LinkIcon className="h-3 w-3" />
                    fonte
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
