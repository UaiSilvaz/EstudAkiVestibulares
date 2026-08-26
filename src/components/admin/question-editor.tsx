"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  Check,
  ChevronDown,
  Eye,
  FileText,
  Loader2,
  Plus,
  RotateCcw,
  Save,
  Settings2,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ImageDropZone } from "@/components/admin/image-drop-zone";
import { RichTextEditor } from "@/components/admin/rich-text-editor";
import { useFeedback } from "@/components/feedback/feedback-provider";
import { QuestionRichText } from "@/components/question-rich-text";
import { richTextToPlainText } from "@/lib/question-rich-text";
import { cn } from "@/lib/utils";

type Option = { id: string; name: string; subjectId?: string };
type Alternative = { key: string; text: string; imageUrl: string };
type Message = { text: string; type: "success" | "error" };

const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

const defaultForm = () => ({
  vestibularId: "",
  subjectId: "",
  topicId: "",
  year: new Date().getFullYear(),
  exam: "",
  difficulty: "MEDIUM",
  supportText: "",
  statement: "",
  explanation: "",
  videoUrl: "",
  pedagogyComment: "",
  tags: "",
  source: "EstudAki",
  sourceUrl: "",
  sourceCitation: "",
  sourceAccessedAt: "",
  sourceType: "AUTHORIAL",
  status: "REVIEW",
});

function defaultAlternatives(): Alternative[] {
  return ["A", "B", "C", "D", "E"].map((key) => ({
    key,
    text: "",
    imageUrl: "",
  }));
}

function uniqueFiles(files: File[]) {
  const seen = new Set<string>();
  return files.filter((file) => {
    const key = `${file.name}:${file.size}:${file.lastModified}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function hasMeaningfulText(value: string) {
  return Boolean(richTextToPlainText(value).trim());
}

async function readErrorMessage(response: Response) {
  const fallback = "Não foi possível salvar.";
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    try {
      const data = (await response.json()) as { error?: string };
      return data.error ?? fallback;
    } catch {
      return fallback;
    }
  }

  const text = await response.text();
  return text.trim() || fallback;
}

export function QuestionEditor({
  vestibulares,
  subjects,
  topics,
}: {
  vestibulares: Option[];
  subjects: Option[];
  topics: Option[];
}) {
  const { notify } = useFeedback();
  const [form, setForm] = useState(() => ({
    ...defaultForm(),
    vestibularId: vestibulares[0]?.id ?? "",
    subjectId: subjects[0]?.id ?? "",
  }));
  const [alternatives, setAlternatives] = useState<Alternative[]>(() => defaultAlternatives());
  const [correctAlternative, setCorrectAlternative] = useState("A");
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [alternativeImageFiles, setAlternativeImageFiles] = useState<Record<string, File[]>>({});
  const [message, setMessage] = useState<Message | null>(null);
  const [loading, setLoading] = useState(false);

  const filteredTopics = useMemo(
    () => topics.filter((topic) => !topic.subjectId || topic.subjectId === form.subjectId),
    [topics, form.subjectId],
  );

  const previewUrls = useMemo(
    () => imageFiles.map((file) => URL.createObjectURL(file)),
    [imageFiles],
  );
  const alternativePreviewUrls = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(alternativeImageFiles)
          .filter(([, files]) => files.length > 0)
          .map(([key, files]) => [key, URL.createObjectURL(files[0])]),
      ),
    [alternativeImageFiles],
  );

  useEffect(() => {
    return () => {
      previewUrls.forEach((url) => URL.revokeObjectURL(url));
      Object.values(alternativePreviewUrls).forEach((url) => URL.revokeObjectURL(url));
    };
  }, [alternativePreviewUrls, previewUrls]);

  function resetEditor() {
    setForm({
      ...defaultForm(),
      vestibularId: vestibulares[0]?.id ?? "",
      subjectId: subjects[0]?.id ?? "",
    });
    setAlternatives(defaultAlternatives());
    setCorrectAlternative("A");
    setImageFiles([]);
    setAlternativeImageFiles({});
  }

  function appendQuestionImages(files: File[]) {
    setImageFiles((current) => uniqueFiles([...current, ...files]));
  }

  function setAlternativeImages(key: string, files: File[]) {
    setAlternativeImageFiles((current) => ({
      ...current,
      [key]: files.slice(-1),
    }));
  }

  function updateAlternative(index: number, value: Partial<Alternative>) {
    setAlternatives((current) => {
      const next = [...current];
      next[index] = { ...next[index], ...value };
      return next;
    });
  }

  function addAlternative() {
    const key = letters[alternatives.length];
    if (!key) return;
    setAlternatives((current) => [...current, { key, text: "", imageUrl: "" }]);
  }

  function removeAlternative(key: string) {
    const survivors = alternatives.filter((item) => item.key !== key);
    const next = survivors.map((item, index) => ({ ...item, key: letters[index] }));
    const correctIndex = survivors.findIndex((item) => item.key === correctAlternative);
    setCorrectAlternative(correctIndex >= 0 ? letters[correctIndex] : next[0]?.key ?? "A");
    setAlternativeImageFiles((current) =>
      Object.fromEntries(
        survivors
          .map((item, index) => [letters[index], current[item.key] ?? []] as const)
          .filter(([, files]) => files.length > 0),
      ),
    );
    setAlternatives(next);
  }

  function validate() {
    const filledAlternatives = alternatives.filter(
      (item) =>
        hasMeaningfulText(item.text) ||
        item.imageUrl.trim() ||
        (alternativeImageFiles[item.key]?.length ?? 0) > 0,
    );

    if (!form.vestibularId || !form.subjectId) return "Escolha o vestibular e a matéria.";
    if (!hasMeaningfulText(form.statement)) return "Preencha a pergunta da questão.";
    if (filledAlternatives.length < 2) return "Preencha pelo menos duas alternativas.";
    if (!filledAlternatives.some((item) => item.key === correctAlternative)) return "Marque a resposta certa.";
    return null;
  }

  async function submit() {
    const validation = validate();
    if (validation) {
      setMessage({ text: validation, type: "error" });
      notify({
        tone: "warning",
        title: "Revise os campos da questão",
        message: validation,
      });
      return;
    }

    setLoading(true);
    setMessage(null);

    const filledAlternatives = alternatives.filter(
      (item) =>
        hasMeaningfulText(item.text) ||
        item.imageUrl.trim() ||
        (alternativeImageFiles[item.key]?.length ?? 0) > 0,
    );
    const filledAlternativeKeys = new Set(filledAlternatives.map((item) => item.key));

    const formData = new FormData();
    formData.set("vestibularId", form.vestibularId);
    formData.set("subjectId", form.subjectId);
    formData.set("topicId", form.topicId);
    formData.set("year", String(form.year));
    formData.set("exam", form.exam.trim());
    formData.set("difficulty", form.difficulty);
    formData.set("supportText", form.supportText.trim());
    formData.set("statement", form.statement.trim());
    formData.set(
      "alternatives",
      JSON.stringify(
        filledAlternatives.map(({ key, text, imageUrl }) => ({
          key,
          text: text.trim(),
          imageUrl: imageUrl.trim() || null,
        })),
      ),
    );
    formData.set("correctAlternative", correctAlternative);
    formData.set("alternativeExplanations", "{}");
    formData.set("explanation", form.explanation.trim());
    formData.set("videoUrl", form.videoUrl.trim());
    formData.set("pedagogyComment", form.pedagogyComment.trim());
    formData.set("tags", JSON.stringify(form.tags.split(",").map((tag) => tag.trim()).filter(Boolean)));
    formData.set("source", form.source.trim());
    formData.set("sourceName", form.source.trim());
    formData.set("sourceUrl", form.sourceUrl.trim());
    formData.set("sourceCitation", form.sourceCitation.trim());
    formData.set("sourceAccessedAt", form.sourceAccessedAt.trim());
    formData.set("sourceType", form.sourceType);
    formData.set("status", form.status);
    imageFiles.forEach((file) => formData.append("images", file));
    Object.entries(alternativeImageFiles).forEach(([key, files]) => {
      if (files[0] && filledAlternativeKeys.has(key)) formData.set(`alternativeImage_${key}`, files[0]);
    });

    const response = await fetch("/api/admin/questions", {
      method: "POST",
      body: formData,
    });

    setLoading(false);

    if (!response.ok) {
      const error = await readErrorMessage(response);
      setMessage({ text: error, type: "error" });
      notify({
        tone: "error",
        title: "Questão não salva",
        message: error,
      });
      return;
    }

    const data = (await response.json().catch(() => null)) as { question?: unknown } | null;
    const uploadedImages =
      imageFiles.length + Object.values(alternativeImageFiles).filter((files) => files.length > 0).length;
    if (data?.question) {
      window.dispatchEvent(
        new CustomEvent("estudaki:admin-question-saved", {
          detail: { question: data.question },
        }),
      );
    }
    resetEditor();
    setMessage({ text: "Questão salva. O editor voltou ao início.", type: "success" });
    notify({
      tone: "success",
      title: "Questão salva com sucesso",
      message: uploadedImages
        ? `${uploadedImages} imagem(ns) enviada(s) e cadastro pronto para revisão.`
        : "O cadastro foi concluído e o editor está pronto para a próxima questão.",
    });
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[340px_minmax(0,1fr)]">
      <section className="h-fit rounded-[18px] border border-slate-200 bg-white p-4 shadow-[0_18px_40px_-24px_rgba(15,23,42,0.16)] xl:sticky xl:top-4">
        <div className="mb-4 flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-base font-black text-slate-950">Nova questão</h2>
            <p className="text-xs font-semibold text-slate-500">Dados essenciais</p>
          </div>
        </div>

        <div className="space-y-3">
          <Field label="Vestibular">
            <select className="ek-input" value={form.vestibularId} onChange={(event) => setForm({ ...form, vestibularId: event.target.value })}>
              {vestibulares.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Ano">
              <input className="ek-input" type="number" value={form.year} onChange={(event) => setForm({ ...form, year: Number(event.target.value) })} />
            </Field>
            <Field label="Dificuldade">
              <select className="ek-input" value={form.difficulty} onChange={(event) => setForm({ ...form, difficulty: event.target.value })}>
                <option value="EASY">Fácil</option>
                <option value="MEDIUM">Média</option>
                <option value="HARD">Difícil</option>
              </select>
            </Field>
          </div>

          <Field label="Edição / prova">
            <input
              className="ek-input"
              placeholder="Ex.: ENEM 2024 ou ENEM 2023 PPL"
              value={form.exam}
              onChange={(event) => setForm({ ...form, exam: event.target.value })}
            />
          </Field>

          <Field label="Matéria">
            <select
              className="ek-input"
              value={form.subjectId}
              onChange={(event) => setForm({ ...form, subjectId: event.target.value, topicId: "" })}
            >
              {subjects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </Field>

          <Field label="Assunto">
            <select className="ek-input" value={form.topicId} onChange={(event) => setForm({ ...form, topicId: event.target.value })}>
              <option value="">Sem assunto</option>
              {filteredTopics.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Status">
              <select className="ek-input" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>
                <option value="REVIEW">Revisão</option>
                <option value="DRAFT">Rascunho</option>
                <option value="PUBLISHED">Publicado</option>
              </select>
            </Field>
            <Field label="Tipo da fonte">
              <select className="ek-input" value={form.sourceType} onChange={(event) => setForm({ ...form, sourceType: event.target.value })}>
                <option value="OFFICIAL">Oficial</option>
                <option value="AUTHORIAL">Autoral</option>
                <option value="WEB_PUBLIC">Web pública</option>
                <option value="LICENSE_REQUIRED">Licença</option>
              </select>
            </Field>
          </div>

          <Field label="Tags">
            <input className="ek-input" placeholder="enem, algebra, porcentagem" value={form.tags} onChange={(event) => setForm({ ...form, tags: event.target.value })} />
          </Field>

          <details className="group rounded-[12px] border border-slate-200 bg-slate-50/70 p-3">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-xs font-black uppercase tracking-wider text-slate-600">
              <span className="inline-flex items-center gap-2">
                <Settings2 className="h-3.5 w-3.5 text-blue-600" />
                Fonte e referência
              </span>
              <ChevronDown className="h-4 w-4 transition group-open:rotate-180" />
            </summary>
            <div className="mt-3 space-y-3">
              <Field label="Nome da fonte">
                <input className="ek-input" value={form.source} onChange={(event) => setForm({ ...form, source: event.target.value })} />
              </Field>
              <Field label="Referência / citação">
                <textarea
                  className="ek-input min-h-20"
                  placeholder="Autor, obra, veículo ou referência bibliográfica."
                  value={form.sourceCitation}
                  onChange={(event) => setForm({ ...form, sourceCitation: event.target.value })}
                />
              </Field>
              <Field label="URL da fonte">
                <input className="ek-input" value={form.sourceUrl} onChange={(event) => setForm({ ...form, sourceUrl: event.target.value })} />
              </Field>
              <Field label="Acesso em">
                <input className="ek-input" placeholder="Ex.: 20 fev. 2024" value={form.sourceAccessedAt} onChange={(event) => setForm({ ...form, sourceAccessedAt: event.target.value })} />
              </Field>
            </div>
          </details>
        </div>
      </section>

      <section className="rounded-[18px] border border-slate-200 bg-white p-4 shadow-[0_18px_40px_-24px_rgba(15,23,42,0.16)] sm:p-5">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
              <FileText className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-base font-black text-slate-950">Montagem</h2>
              <p className="text-xs font-semibold text-slate-500">Texto, imagens, alternativas e correção</p>
            </div>
          </div>
          <button type="button" onClick={addAlternative} className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-black text-blue-700">
            <Plus className="h-3.5 w-3.5" />
            Alternativa
          </button>
        </div>

        <div className="space-y-5">
          <RichTextEditor
            label="Texto de apoio"
            placeholder="Contexto, gráfico descrito, fórmula ou texto-base."
            value={form.supportText}
            onChange={(supportText) => setForm({ ...form, supportText })}
            onFilesSelected={appendQuestionImages}
            minHeight={132}
          />

          <div>
            <p className="mb-1.5 text-[11px] font-black uppercase tracking-wider text-slate-500">
              Imagens do enunciado
            </p>
            <ImageDropZone
              files={imageFiles}
              onFilesChange={setImageFiles}
              label="Adicionar imagens"
              description="Cole, arraste ou selecione arquivos."
              multiple
            />
          </div>

          <RichTextEditor
            label="Pergunta"
            placeholder="Comando exato que o aluno deve responder."
            value={form.statement}
            onChange={(statement) => setForm({ ...form, statement })}
            onFilesSelected={appendQuestionImages}
            minHeight={118}
          />

          <div>
            <p className="mb-2 text-[11px] font-black uppercase tracking-wider text-slate-500">Alternativas</p>
            <div className="space-y-3">
              {alternatives.map((alternative, index) => {
                const isCorrect = alternative.key === correctAlternative;
                return (
                  <div key={alternative.key} className={cn("rounded-[14px] border p-3", isCorrect ? "border-emerald-200 bg-emerald-50/60" : "border-slate-200 bg-white")}>
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => setCorrectAlternative(alternative.key)}
                        className={cn(
                          "inline-flex h-9 items-center gap-2 rounded-xl px-3 text-xs font-black transition",
                          isCorrect ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700",
                        )}
                        title="Marcar como resposta certa"
                      >
                        {isCorrect ? <Check className="h-4 w-4" /> : <span>{alternative.key}</span>}
                        {isCorrect ? "Correta" : "Marcar correta"}
                      </button>
                      {alternatives.length > 2 && (
                        <button
                          type="button"
                          onClick={() => removeAlternative(alternative.key)}
                          className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                          title="Remover alternativa"
                          aria-label={`Remover alternativa ${alternative.key}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>

                    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_260px]">
                      <RichTextEditor
                        label={`Alternativa ${alternative.key}`}
                        placeholder={`Texto da alternativa ${alternative.key}`}
                        value={alternative.text}
                        onChange={(text) => updateAlternative(index, { text })}
                        onFilesSelected={(files) => setAlternativeImages(alternative.key, files)}
                        minHeight={78}
                        compact
                      />
                      <div>
                        <Field label="Imagem">
                          <input
                            className="ek-input mb-2"
                            placeholder="URL da imagem"
                            value={alternative.imageUrl}
                            onChange={(event) => updateAlternative(index, { imageUrl: event.target.value })}
                          />
                        </Field>
                        <ImageDropZone
                          files={alternativeImageFiles[alternative.key] ?? []}
                          onFilesChange={(files) => setAlternativeImages(alternative.key, files)}
                          existingImages={
                            alternative.imageUrl && !(alternativeImageFiles[alternative.key]?.length)
                              ? [{ url: alternative.imageUrl, altText: `Imagem da alternativa ${alternative.key}` }]
                              : []
                          }
                          onRemoveExisting={() => updateAlternative(index, { imageUrl: "" })}
                          label="Arquivo"
                          compact
                        />
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <RichTextEditor
              label="Resolução (opcional)"
              placeholder="Resolução exibida depois que o aluno responder, se quiser preencher agora."
              value={form.explanation}
              onChange={(explanation) => setForm({ ...form, explanation })}
              minHeight={150}
            />
            <RichTextEditor
              label="Comentário pedagógico"
              placeholder="Dica de estudo, erro comum ou reforço."
              value={form.pedagogyComment}
              onChange={(pedagogyComment) => setForm({ ...form, pedagogyComment })}
              minHeight={150}
            />
          </div>

          <Field label="Resolução em vídeo">
            <input
              className="ek-input"
              placeholder="Cole a URL do YouTube, Vimeo ou aula hospedada"
              value={form.videoUrl}
              onChange={(event) => setForm({ ...form, videoUrl: event.target.value })}
            />
          </Field>

          <section className="rounded-[12px] border border-blue-100 bg-blue-50/30 p-4">
            <div className="mb-3 flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-white text-blue-700">
                <Eye className="h-4 w-4" />
              </span>
              <p className="text-[11px] font-black uppercase tracking-wider text-blue-600">
                Prévia da questão
              </p>
            </div>
            {hasMeaningfulText(form.supportText) && (
              <div className="mb-3 rounded-[8px] bg-white p-3 text-sm font-semibold leading-6 text-slate-600">
                <QuestionRichText value={form.supportText} />
              </div>
            )}
            {previewUrls.length > 0 && (
              <div className="mb-3 grid gap-3 sm:grid-cols-2">
                {previewUrls.map((url, index) => (
                  <div key={url} className="overflow-hidden rounded-[8px] border border-slate-200 bg-white">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt={`Preview da imagem ${index + 1}`}
                      className="max-h-80 w-full object-contain"
                    />
                  </div>
                ))}
              </div>
            )}
            <QuestionRichText
              value={form.statement}
              className="text-base font-black leading-7 text-slate-950"
              fallback={<p className="text-base font-black leading-7 text-slate-400">Pergunta ainda não preenchida.</p>}
            />
            <div className="mt-3 space-y-2">
              {alternatives.map((alternative) => (
                <div
                  key={alternative.key}
                  className={cn(
                    "flex gap-2 rounded-[8px] border p-2 text-sm font-semibold",
                    alternative.key === correctAlternative
                      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                      : "border-slate-200 bg-white text-slate-700",
                  )}
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-xs font-black">
                    {alternative.key}
                  </span>
                  <span className="min-w-0 flex-1">
                    <QuestionRichText
                      value={alternative.text}
                      inline
                      fallback={<span>{`Alternativa ${alternative.key}`}</span>}
                    />
                    {(alternativePreviewUrls[alternative.key] || alternative.imageUrl) && (
                      <span className="mt-2 block overflow-hidden rounded-lg border border-slate-200 bg-white p-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={alternativePreviewUrls[alternative.key] || alternative.imageUrl}
                          alt={`Imagem da alternativa ${alternative.key}`}
                          className="mx-auto max-h-32 max-w-full object-contain"
                        />
                      </span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4">
            <motion.button type="button" onClick={submit} disabled={loading} whileTap={{ scale: 0.97 }} className="ek-button ek-button-primary">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {loading ? "Salvando..." : "Salvar questão"}
            </motion.button>
            <button type="button" onClick={resetEditor} className="ek-button ek-button-ghost">
              <RotateCcw className="h-4 w-4" />
              Limpar
            </button>
            <AnimatePresence>
              {message && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-extrabold",
                    message.type === "success"
                      ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border border-rose-200 bg-rose-50 text-rose-700",
                  )}
                >
                  {message.type === "success" ? <Check className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
                  {message.text}
                  <button type="button" onClick={() => setMessage(null)} className="rounded-full p-0.5 hover:bg-white/70">
                    <X className="h-3 w-3" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-black uppercase tracking-wider text-slate-500">
        {label}
      </span>
      {children}
    </label>
  );
}
