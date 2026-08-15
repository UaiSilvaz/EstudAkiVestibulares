"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  Check,
  Loader2,
  Plus,
  RotateCcw,
  Save,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useFeedback } from "@/components/feedback/feedback-provider";
import { ImageDropZone } from "@/components/admin/image-drop-zone";

type Option = { id: string; name: string; subjectId?: string };
type Alternative = { key: string; text: string; explanation: string; imageUrl: string };
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
    explanation: "",
    imageUrl: "",
  }));
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
    setAlternatives((current) => [...current, { key, text: "", explanation: "", imageUrl: "" }]);
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
        item.text.trim() ||
        item.imageUrl.trim() ||
        (alternativeImageFiles[item.key]?.length ?? 0) > 0,
    );

    if (!form.vestibularId || !form.subjectId) return "Escolha o vestibular e a matéria.";
    if (!form.statement.trim()) return "Preencha a pergunta da questão.";
    if (filledAlternatives.length < 2) return "Preencha pelo menos duas alternativas.";
    if (filledAlternatives.length !== alternatives.length) {
      return "Cada alternativa precisa ter texto ou imagem.";
    }
    if (!filledAlternatives.some((item) => item.key === correctAlternative)) return "Marque a resposta certa.";
    if (!form.explanation.trim()) return "Preencha a resolução que será mostrada ao aluno.";

    const missingWrongReason = filledAlternatives.find(
      (item) => item.key !== correctAlternative && !item.explanation.trim(),
    );
    if (missingWrongReason) {
      return `Explique por que a alternativa ${missingWrongReason.key} está errada.`;
    }

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

    const alternativeExplanations = Object.fromEntries(
      alternatives
        .filter((item) => item.explanation.trim())
        .map((item) => [item.key, item.explanation.trim()]),
    );

    const formData = new FormData();
    formData.set("vestibularId", form.vestibularId);
    formData.set("subjectId", form.subjectId);
    formData.set("topicId", form.topicId);
    formData.set("year", String(form.year));
    formData.set("exam", form.exam.trim());
    formData.set("difficulty", form.difficulty);
    formData.set("supportText", form.supportText.trim());
    formData.set("statement", form.statement.trim());
    formData.set("alternatives", JSON.stringify(alternatives.map(({ key, text, imageUrl }) => ({ key, text: text.trim(), imageUrl: imageUrl.trim() || null }))));
    formData.set("correctAlternative", correctAlternative);
    formData.set("alternativeExplanations", JSON.stringify(alternativeExplanations));
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
      if (files[0]) formData.set(`alternativeImage_${key}`, files[0]);
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

    const uploadedImages = imageFiles.length +
      Object.values(alternativeImageFiles).filter((files) => files.length > 0).length;
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
    <div className="grid gap-5 xl:grid-cols-[0.85fr_1.35fr]">
      <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_18px_40px_-24px_rgba(15,23,42,0.16)]">
        <div className="mb-5 flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-base font-black text-slate-950">Dados da questão</h2>
            <p className="text-xs font-semibold text-slate-500">Classificação e publicação</p>
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

          <Field label="Edição / tipo da prova">
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

          <Field label="Status">
            <select className="ek-input" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>
              <option value="REVIEW">Revisão</option>
              <option value="DRAFT">Rascunho</option>
              <option value="PUBLISHED">Publicado</option>
            </select>
          </Field>

          <Field label="Tags">
            <input className="ek-input" placeholder="enem, algebra, porcentagem" value={form.tags} onChange={(event) => setForm({ ...form, tags: event.target.value })} />
          </Field>

          <Field label="Tipo da fonte">
            <select className="ek-input" value={form.sourceType} onChange={(event) => setForm({ ...form, sourceType: event.target.value })}>
              <option value="OFFICIAL">Oficial</option>
              <option value="AUTHORIAL">Autoral</option>
              <option value="WEB_PUBLIC">Web pública</option>
              <option value="LICENSE_REQUIRED">Requer licença</option>
            </select>
          </Field>

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

          <div className="grid grid-cols-2 gap-3">
            <Field label="URL da fonte">
              <input className="ek-input" value={form.sourceUrl} onChange={(event) => setForm({ ...form, sourceUrl: event.target.value })} />
            </Field>
            <Field label="Acesso em">
              <input className="ek-input" placeholder="Ex.: 20 fev. 2024" value={form.sourceAccessedAt} onChange={(event) => setForm({ ...form, sourceAccessedAt: event.target.value })} />
            </Field>
          </div>
        </div>
      </section>

      <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_18px_40px_-24px_rgba(15,23,42,0.16)]">
        <div className="space-y-5">
          <Field label="Enunciado / contexto">
            <textarea
              className="ek-input min-h-28"
              placeholder="Texto de apoio, caso a questão tenha um contexto antes da pergunta."
              value={form.supportText}
              onChange={(event) => setForm({ ...form, supportText: event.target.value })}
            />
          </Field>

          <div>
            <p className="mb-1.5 text-[11px] font-black uppercase tracking-wider text-slate-500">
              Imagens do enunciado
            </p>
            <ImageDropZone
              files={imageFiles}
              onFilesChange={setImageFiles}
              label="Cole ou arraste as imagens do enunciado"
              description="Use Ctrl+V quantas vezes precisar. As imagens serão convertidas para WebP ao salvar."
              multiple
            />
          </div>

          <Field label="Pergunta">
            <textarea
              className="ek-input min-h-28"
              placeholder="Escreva aqui exatamente o que o aluno deve responder."
              value={form.statement}
              onChange={(event) => setForm({ ...form, statement: event.target.value })}
            />
          </Field>

          <div>
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="text-[11px] font-black uppercase tracking-wider text-slate-500">Alternativas</p>
              <button type="button" onClick={addAlternative} className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-black text-blue-700">
                <Plus className="h-3.5 w-3.5" />
                Adicionar
              </button>
            </div>

            <div className="space-y-3">
              {alternatives.map((alternative, index) => {
                const isCorrect = alternative.key === correctAlternative;
                return (
                  <div key={alternative.key} className={`rounded-2xl border p-3 ${isCorrect ? "border-emerald-200 bg-emerald-50/60" : "border-slate-200 bg-white"}`}>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setCorrectAlternative(alternative.key)}
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-black ${isCorrect ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600"}`}
                        title="Marcar como resposta certa"
                      >
                        {isCorrect ? <Check className="h-4 w-4" /> : alternative.key}
                      </button>
                      <input
                        className="ek-input"
                        placeholder={`Texto da alternativa ${alternative.key}`}
                        value={alternative.text}
                        onChange={(event) => updateAlternative(index, { text: event.target.value })}
                      />
                      {alternatives.length > 2 && (
                        <button
                          type="button"
                          onClick={() => removeAlternative(alternative.key)}
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                          title="Remover alternativa"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    {!isCorrect && (
                      <textarea
                        className="ek-input mt-2 min-h-20"
                        placeholder={`Por que a alternativa ${alternative.key} está errada?`}
                        value={alternative.explanation}
                        onChange={(event) => updateAlternative(index, { explanation: event.target.value })}
                      />
                    )}
                    <div className="mt-2">
                      <input
                        className="ek-input mb-2"
                        placeholder={`URL da imagem da alternativa ${alternative.key}`}
                        value={alternative.imageUrl}
                        onChange={(event) => updateAlternative(index, { imageUrl: event.target.value })}
                      />
                      <ImageDropZone
                        files={alternativeImageFiles[alternative.key] ?? []}
                        onFilesChange={(files) =>
                          setAlternativeImageFiles((current) => ({
                            ...current,
                            [alternative.key]: files,
                          }))
                        }
                        existingImages={
                          alternative.imageUrl && !(alternativeImageFiles[alternative.key]?.length)
                            ? [{ url: alternative.imageUrl, altText: `Imagem da alternativa ${alternative.key}` }]
                            : []
                        }
                        onRemoveExisting={() => updateAlternative(index, { imageUrl: "" })}
                        label={`Imagem da alternativa ${alternative.key}`}
                        compact
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <Field label="Resolução">
              <textarea
                className="ek-input min-h-36"
                placeholder="Resolução exibida depois que o aluno responder."
                value={form.explanation}
                onChange={(event) => setForm({ ...form, explanation: event.target.value })}
              />
            </Field>
            <Field label="Comentário pedagógico">
              <textarea
                className="ek-input min-h-36"
                placeholder="Opcional: dica de estudo, erro comum ou reforco."
                value={form.pedagogyComment}
                onChange={(event) => setForm({ ...form, pedagogyComment: event.target.value })}
              />
            </Field>
          </div>

          <Field label="Resolucao em video">
            <input
              className="ek-input"
              placeholder="Cole a URL do YouTube, Vimeo ou aula hospedada"
              value={form.videoUrl}
              onChange={(event) => setForm({ ...form, videoUrl: event.target.value })}
            />
          </Field>

          <section className="rounded-[8px] border border-blue-100 bg-blue-50/30 p-4">
            <p className="mb-3 text-[11px] font-black uppercase tracking-wider text-blue-600">
              Prévia da questão
            </p>
            {form.supportText.trim() && (
              <p className="mb-3 whitespace-pre-line rounded-[8px] bg-white p-3 text-sm font-semibold leading-6 text-slate-600">
                {form.supportText}
              </p>
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
            <p className="whitespace-pre-line text-base font-black leading-7 text-slate-950">
              {form.statement.trim() || "Pergunta ainda não preenchida."}
            </p>
            <div className="mt-3 space-y-2">
              {alternatives.map((alternative) => (
                <div
                  key={alternative.key}
                  className={`flex gap-2 rounded-[8px] border p-2 text-sm font-semibold ${
                    alternative.key === correctAlternative
                      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                      : "border-slate-200 bg-white text-slate-700"
                  }`}
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-xs font-black">
                    {alternative.key}
                  </span>
                  <span className="flex-1">
                    {alternative.text.trim() || `Alternativa ${alternative.key}`}
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
                  className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-extrabold ${
                    message.type === "success"
                      ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border border-rose-200 bg-rose-50 text-rose-700"
                  }`}
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-black uppercase tracking-wider text-slate-500">
        {label}
      </span>
      {children}
    </label>
  );
}
