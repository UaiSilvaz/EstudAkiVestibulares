"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  Bold,
  Check,
  Eye,
  ImageIcon,
  ImagePlus,
  ListChecks,
  Loader2,
  Plus,
  Save,
  Sigma,
  Sparkles,
  Table2,
  Trash2,
  X,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";

type Option = { id: string; name: string; subjectId?: string };

const letters = ["A", "B", "C", "D", "E"] as const;

type ImageItem = { id: string; name: string; size: number; type: string; previewUrl: string };

const difficultyColors: Record<string, string> = {
  EASY: "from-emerald-400 to-emerald-600",
  MEDIUM: "from-amber-400 to-orange-500",
  HARD: "from-rose-400 to-rose-600",
};

const statusColors: Record<string, string> = {
  DRAFT: "from-slate-400 to-slate-600",
  REVIEW: "from-amber-400 to-amber-600",
  PUBLISHED: "from-emerald-400 to-emerald-600",
};

export function QuestionEditor({
  vestibulares,
  subjects,
  topics,
}: {
  vestibulares: Option[];
  subjects: Option[];
  topics: Option[];
}) {
  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? "");
  const [form, setForm] = useState({
    vestibularId: vestibulares[0]?.id ?? "",
    topicId: "",
    year: new Date().getFullYear(),
    difficulty: "MEDIUM",
    statement:
      "Enunciado da questão. Use o editor para inserir imagem, fórmula em LaTeX, tabela ou texto destacado.",
    correctAlternative: "A",
    explanation: "Explique o caminho da resolução de forma clara, didática e objetiva.",
    pedagogyComment: "Mostre o erro comum e a melhor estratégia para o aluno.",
    tags: "enem, interpretação, base",
    source: "EstudAki CMS",
    status: "PUBLISHED",
  });
  const [alternatives, setAlternatives] = useState(
    letters.map((key) => ({ key, text: `Alternativa ${key}` })),
  );
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState<ImageItem[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredTopics = useMemo(
    () => topics.filter((topic) => !topic.subjectId || topic.subjectId === subjectId),
    [topics, subjectId],
  );

  function appendSnippet(snippet: string) {
    setForm((current) => ({
      ...current,
      statement: `${current.statement}\n\n${snippet}`,
    }));
  }

  function generateAnalysis() {
    const subjectName = subjects.find((item) => item.id === subjectId)?.name ?? "materia";
    const topicName = topics.find((item) => item.id === form.topicId)?.name ?? subjectName;
    const vestibularName = vestibulares.find((item) => item.id === form.vestibularId)?.name ?? "vestibular";
    const correct = alternatives.find((item) => item.key === form.correctAlternative);
    const difficultyLabel =
      form.difficulty === "EASY" ? "basica" : form.difficulty === "HARD" ? "avancada" : "intermediaria";
    const cleanTopic = topicName
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
    const nextTags = Array.from(
      new Set(
        [
          ...form.tags.split(",").map((tag) => tag.trim()).filter(Boolean),
          vestibularName.toLowerCase(),
          subjectName.toLowerCase(),
          cleanTopic,
          difficultyLabel,
        ].filter(Boolean),
      ),
    ).join(", ");

    setForm((current) => ({
      ...current,
      explanation:
        `Estrategia de resolucao: identifique o comando central do enunciado, destaque os dados uteis e conecte o assunto "${topicName}" com a habilidade cobrada em ${subjectName}.\n\n` +
        `Resolucao sugerida: a alternativa correta e ${form.correctAlternative}${correct ? `, pois ${correct.text}` : ""}. ` +
        `As demais alternativas devem ser eliminadas procurando erro conceitual, extrapolacao do texto ou calculo incompativel com os dados apresentados.`,
      pedagogyComment:
        `Analise pedagogica: esta e uma questao de nivel ${difficultyLabel}. Se o aluno errou, o ponto mais provavel de revisao e ${topicName}. ` +
        "A recomendacao e refazer a questao sem olhar o gabarito, escrever o motivo da alternativa correta e registrar o erro no caderno de revisao.",
      tags: nextTags,
    }));
    setMessage({ text: "Analise gerada com explicacao, comentario e tags.", type: "success" });
  }

  function handleFiles(filesList: FileList | null) {
    if (!filesList) return;
    const next: ImageItem[] = [];
    Array.from(filesList).forEach((file) => {
      if (!["image/png", "image/jpeg", "image/jpg", "image/webp"].includes(file.type)) return;
      next.push({
        id: `${file.name}-${file.size}-${Date.now()}-${Math.random()}`,
        name: file.name,
        size: file.size,
        type: file.type,
        previewUrl: URL.createObjectURL(file),
      });
    });
    setImages((current) => [...current, ...next]);
  }

  function removeImage(id: string) {
    setImages((current) => {
      const found = current.find((img) => img.id === id);
      if (found) URL.revokeObjectURL(found.previewUrl);
      return current.filter((img) => img.id !== id);
    });
  }

  async function submit() {
    setLoading(true);
    setMessage(null);

    const response = await fetch("/api/admin/questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        subjectId,
        alternatives,
        tags: form.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
      }),
    });

    setLoading(false);

    if (!response.ok) {
      const data = await response.json();
      setMessage({ text: data.error ?? "Não foi possível salvar.", type: "error" });
      return;
    }

    setMessage({ text: "Questão salva com sucesso!", type: "success" });
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[1.05fr_1.25fr_0.95fr]">
      {/* Coluna 1: Configuração */}
      <section className="relative overflow-hidden rounded-[28px] border border-slate-100 bg-white p-5 shadow-[0_18px_40px_-22px_rgba(15,23,42,0.10)] md:p-6">
        <div
          aria-hidden
          className="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-[#60A5FA] opacity-20 blur-3xl"
        />
        <div className="relative z-10">
          <div className="mb-5 flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#2563EB] via-[#22D3EE] to-[#86EFAC] text-white shadow-md">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <p className="font-display text-base font-extrabold text-[#0F172A]">Dados da questão</p>
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                Classificação
              </p>
            </div>
          </div>

          <div className="space-y-3.5">
            <Field label="Vestibular">
              <select
                className="ek-input"
                value={form.vestibularId}
                onChange={(event) => setForm({ ...form, vestibularId: event.target.value })}
              >
                {vestibulares.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Ano">
                <input
                  className="ek-input"
                  type="number"
                  value={form.year}
                  onChange={(event) => setForm({ ...form, year: Number(event.target.value) })}
                />
              </Field>
              <Field label="Dificuldade">
                <select
                  className="ek-input"
                  value={form.difficulty}
                  onChange={(event) => setForm({ ...form, difficulty: event.target.value })}
                >
                  <option value="EASY">Fácil</option>
                  <option value="MEDIUM">Média</option>
                  <option value="HARD">Difícil</option>
                </select>
              </Field>
            </div>

            <Field label="Matéria">
              <select
                className="ek-input"
                value={subjectId}
                onChange={(event) => {
                  setSubjectId(event.target.value);
                  setForm({ ...form, topicId: "" });
                }}
              >
                {subjects.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Assunto">
              <select
                className="ek-input"
                value={form.topicId}
                onChange={(event) => setForm({ ...form, topicId: event.target.value })}
              >
                <option value="">Sem assunto</option>
                {filteredTopics.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Status">
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: "DRAFT", label: "Rascunho" },
                  { value: "REVIEW", label: "Revisão" },
                  { value: "PUBLISHED", label: "Publicado" },
                ].map((opt) => {
                  const active = form.status === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setForm({ ...form, status: opt.value })}
                      className={`relative overflow-hidden rounded-2xl border p-2.5 text-xs font-extrabold transition ${
                        active
                          ? "border-transparent text-white shadow-md"
                          : "border-slate-200 bg-white text-slate-600 hover:border-blue-200"
                      }`}
                    >
                      {active && (
                        <span
                          className={`absolute inset-0 -z-0 bg-gradient-to-r ${statusColors[opt.value]}`}
                        />
                      )}
                      <span className="relative z-10">{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </Field>

            <Field label="Tags (separadas por vírgula)">
              <input
                className="ek-input"
                value={form.tags}
                onChange={(event) => setForm({ ...form, tags: event.target.value })}
              />
            </Field>

            <Field label="Fonte">
              <input
                className="ek-input"
                value={form.source}
                onChange={(event) => setForm({ ...form, source: event.target.value })}
              />
            </Field>
          </div>
        </div>
      </section>

      {/* Coluna 2: Editor */}
      <section className="relative overflow-hidden rounded-[28px] border border-slate-100 bg-white p-5 shadow-[0_18px_40px_-22px_rgba(15,23,42,0.10)] md:p-6">
        <div
          aria-hidden
          className="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-[#F97316] opacity-20 blur-3xl"
        />
        <div className="relative z-10">
          <div className="mb-5 flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#FACC15] via-[#F97316] to-[#FB7185] text-white shadow-md">
              <ListChecks className="h-4 w-4" />
            </div>
            <div>
              <p className="font-display text-base font-extrabold text-[#0F172A]">Editor da questão</p>
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                Enunciado, alternativas e imagens
              </p>
            </div>
          </div>

          <div className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-slate-100 bg-slate-50 p-2">
            {[
              { icon: Bold, title: "Negrito", snippet: "**Trecho em destaque**" },
              {
                icon: Sigma,
                title: "LaTeX",
                snippet: "Fórmula: \\\\(x^2 + y^2 = z^2\\\\)",
              },
              {
                icon: Table2,
                title: "Tabela",
                snippet: "| Coluna 1 | Coluna 2 |\n| --- | --- |\n| dado | dado |",
              },
              {
                icon: ListChecks,
                title: "Caixa de atenção",
                snippet: "Caixa de atenção: cuidado com unidades e palavras absolutas.",
              },
            ].map((tool) => {
              const Icon = tool.icon;
              return (
                <motion.button
                  key={tool.title}
                  type="button"
                  onClick={() => appendSnippet(tool.snippet)}
                  whileHover={{ y: -2 }}
                  className="flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-extrabold text-slate-600 transition hover:border-blue-200 hover:text-blue-700"
                >
                  <Icon className="h-3.5 w-3.5" />
                  {tool.title}
                </motion.button>
              );
            })}
            <motion.button
              type="button"
              onClick={generateAnalysis}
              whileHover={{ y: -2 }}
              className="ml-auto flex h-9 items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 text-xs font-extrabold text-blue-700 transition hover:border-blue-300 hover:bg-blue-100"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Gerar analise
            </motion.button>
          </div>

          <Field label="Enunciado">
            <textarea
              className="ek-input min-h-40"
              value={form.statement}
              onChange={(event) => setForm({ ...form, statement: event.target.value })}
            />
          </Field>

          {/* Upload */}
          <div className="mt-4">
            <p className="mb-2 text-[11px] font-black uppercase tracking-wider text-slate-500">
              Imagens da questão
            </p>
            <motion.label
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                handleFiles(e.dataTransfer.files);
              }}
              animate={{ scale: dragOver ? 1.01 : 1 }}
              className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-6 text-center transition ${
                dragOver
                  ? "border-blue-400 bg-blue-50"
                  : "border-blue-200 bg-gradient-to-br from-blue-50/40 to-white"
              }`}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#1E73FF] via-[#005CFF] to-[#00C896] text-white shadow-md">
                <ImagePlus className="h-6 w-6" />
              </div>
              <p className="text-sm font-extrabold text-[#0F172A]">
                Arraste suas imagens ou clique para enviar
              </p>
              <p className="text-xs font-semibold text-slate-500">
                PNG, JPG, JPEG ou WEBP. Você pode enviar mais de uma.
              </p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/png,image/jpeg,image/jpg,image/webp"
                className="hidden"
                onChange={(e) => handleFiles(e.target.files)}
              />
            </motion.label>

            {images.length > 0 && (
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                <AnimatePresence>
                  {images.map((img) => (
                    <motion.div
                      key={img.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={img.previewUrl}
                        alt={img.name}
                        className="aspect-[4/3] w-full object-cover"
                      />
                      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/70 to-transparent p-2 text-[10px] font-bold text-white">
                        <span className="truncate">{img.name}</span>
                        <button
                          type="button"
                          onClick={() => removeImage(img.id)}
                          className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20 text-white transition hover:bg-rose-500"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>

          <div className="mt-5">
            <p className="mb-2 text-[11px] font-black uppercase tracking-wider text-slate-500">
              Alternativas
            </p>
            <div className="space-y-2.5">
              {alternatives.map((alt, index) => (
                <div
                  key={alt.key}
                  className="group flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-2.5"
                >
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, correctAlternative: alt.key })}
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-black transition ${
                      form.correctAlternative === alt.key
                        ? "bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-md ring-2 ring-emerald-300"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                    title="Marcar como correta"
                  >
                    {form.correctAlternative === alt.key ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      alt.key
                    )}
                  </button>
                  <input
                    className="ek-input"
                    value={alt.text}
                    onChange={(event) => {
                      const next = [...alternatives];
                      next[index] = { ...alt, text: event.target.value };
                      setAlternatives(next);
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setAlternatives(alternatives.filter((a) => a.key !== alt.key))}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-300 transition hover:bg-rose-50 hover:text-rose-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => {
                  const nextLetter = String.fromCharCode(65 + alternatives.length);
                  const key = nextLetter as "A" | "B" | "C" | "D" | "E";
                  setAlternatives([...alternatives, { key, text: `Alternativa ${nextLetter}` }]);
                }}
                className="inline-flex items-center gap-2 rounded-2xl border border-dashed border-blue-300 bg-blue-50/50 px-4 py-2 text-xs font-extrabold text-blue-700 transition hover:border-blue-500 hover:bg-blue-50"
              >
                <Plus className="h-3.5 w-3.5" />
                Adicionar alternativa
              </button>
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <Field label="Explicação">
              <textarea
                className="ek-input min-h-32"
                value={form.explanation}
                onChange={(event) => setForm({ ...form, explanation: event.target.value })}
              />
            </Field>
            <Field label="Comentário pedagógico">
              <textarea
                className="ek-input min-h-32"
                value={form.pedagogyComment}
                onChange={(event) => setForm({ ...form, pedagogyComment: event.target.value })}
              />
            </Field>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <motion.button
              type="button"
              onClick={submit}
              disabled={loading}
              whileTap={{ scale: 0.97 }}
              className="ek-button ek-button-primary"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {loading ? "Salvando..." : "Salvar questão"}
            </motion.button>
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
                  {message.type === "success" ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    <X className="h-3.5 w-3.5" />
                  )}
                  {message.text}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </section>

      {/* Coluna 3: Preview */}
      <aside className="space-y-4">
        <section className="relative overflow-hidden rounded-[28px] border border-slate-100 bg-white p-5 shadow-[0_18px_40px_-22px_rgba(15,23,42,0.10)] md:p-6">
          <div
            aria-hidden
            className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-[#A78BFA] opacity-20 blur-3xl"
          />
          <div className="relative z-10">
            <div className="mb-5 flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#A78BFA] via-[#C4B5FD] to-[#FB7185] text-white shadow-md">
                <Eye className="h-4 w-4" />
              </div>
              <div>
                <p className="font-display text-base font-extrabold text-[#0F172A]">Preview</p>
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                  Como o aluno vê
                </p>
              </div>
            </div>

            <div className="mb-4 flex flex-wrap gap-1.5">
              <span className="rounded-full bg-gradient-to-r from-[#2563EB] to-[#86EFAC] px-3 py-1 text-[10px] font-black uppercase tracking-wider text-white">
                Preview
              </span>
              <span
                className={`rounded-full bg-gradient-to-r px-3 py-1 text-[10px] font-black uppercase tracking-wider text-white ${difficultyColors[form.difficulty]}`}
              >
                {form.difficulty === "EASY"
                  ? "Fácil"
                  : form.difficulty === "MEDIUM"
                    ? "Média"
                    : "Difícil"}
              </span>
              <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-black uppercase tracking-wider text-slate-600">
                {form.year}
              </span>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="whitespace-pre-line text-sm font-semibold leading-7 text-[#0F172A]">
                {form.statement}
              </p>
              {images.length > 0 && (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {images.map((img) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={img.id}
                      src={img.previewUrl}
                      alt={img.name}
                      className="rounded-xl border border-slate-100 object-cover"
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="mt-3 space-y-2">
              {alternatives.map((alt) => {
                const correct = form.correctAlternative === alt.key;
                return (
                  <div
                    key={alt.key}
                    className={`flex items-start gap-2.5 rounded-2xl border p-3 text-sm ${
                      correct
                        ? "border-emerald-200 bg-emerald-50"
                        : "border-slate-200 bg-white"
                    }`}
                  >
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[11px] font-black ${
                        correct
                          ? "bg-emerald-500 text-white"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {alt.key}
                    </span>
                    <p className="pt-0.5 font-semibold text-slate-700">{alt.text}</p>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-white p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-blue-700">
                Resolução
              </p>
              <p className="mt-1.5 text-sm font-medium leading-6 text-blue-900">
                {form.explanation}
              </p>
            </div>

            {form.pedagogyComment && (
              <div className="mt-3 rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50 to-white p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-700">
                  Comentário pedagógico
                </p>
                <p className="mt-1.5 text-sm font-medium leading-6 text-amber-900">
                  {form.pedagogyComment}
                </p>
              </div>
            )}
          </div>
        </section>

        <section
          className="relative overflow-hidden rounded-[28px] p-5 shadow-[0_18px_40px_-22px_rgba(167,139,250,0.30)] md:p-6"
          style={{
            background:
              "linear-gradient(135deg, #F5F3FF 0%, #EDE9FE 50%, #FCE7F3 100%)",
            border: "1px solid rgba(167, 139, 250, 0.20)",
          }}
        >
          <div className="ek-radial-glow" aria-hidden />
          <div className="relative z-10">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-purple-700">
              Dica
            </p>
            <p className="mt-1 font-display text-base font-extrabold text-[#0F172A]">
              Use enunciados visuais.
            </p>
            <p className="mt-1.5 text-sm font-medium text-slate-700">
              Questões com imagem aumentam o engajamento e a compreensão. Use gráficos,
              mapas, fórmulas e tabelas.
            </p>
            <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-purple-200 bg-white/80 px-3 py-1.5 text-[11px] font-extrabold text-purple-700 backdrop-blur">
              <ImageIcon className="h-3.5 w-3.5" /> Suporte a PNG, JPG, JPEG e WEBP
            </div>
          </div>
        </section>
      </aside>
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
