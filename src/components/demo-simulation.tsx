"use client";
import { useState } from "react";
import { QuestionRichText } from "@/components/question-rich-text";
type Question = { id: string; statement: string; supportText: string | null; alternatives: { key: string; text: string }[] };
export function DemoSimulation({ questions }: { questions: Question[] }) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<number | null>(null);
  const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  async function finish(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      let correct = 0;
      for (const question of questions) {
        const response = await fetch(`/api/questions/${question.id}/attempt`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ selectedAlternative: answers[question.id] }) });
        const data = await response.json(); if (!response.ok) throw new Error(data.error); if (data.correct) correct++;
      }
      setResult(correct);
    } catch (error) { setError(error instanceof Error ? error.message : "Tente novamente."); } finally { setBusy(false); }
  }
  if (!questions.length) return <p className="rounded-3xl bg-white p-6">A equipe está preparando as questões demonstrativas.</p>;
  if (result !== null) return <section role="status" className="rounded-3xl bg-emerald-50 p-6"><h2 className="text-2xl font-semibold">Resultado: {result} de {questions.length} acertos</h2><p className="mt-3">Suas respostas foram salvas no progresso da conta. Consulte o banco de questões para revisar.</p></section>;
  return <form onSubmit={finish} className="space-y-5"><fieldset disabled={busy} className="space-y-5">{questions.map((question, index) => <article key={question.id} className="rounded-3xl bg-white p-6 shadow-sm"><h2 className="mb-3 font-bold">Questão {index + 1}</h2>{question.supportText && <QuestionRichText value={question.supportText} />}<QuestionRichText value={question.statement} /><div className="mt-4 space-y-3">{question.alternatives.map(option => <label key={option.key} className="flex items-start gap-3 rounded-xl border p-3"><input required type="radio" name={question.id} value={option.key} checked={answers[question.id] === option.key} onChange={() => setAnswers(previous => ({ ...previous, [question.id]: option.key }))} /><span className="font-bold">{option.key}</span><QuestionRichText value={option.text} /></label>)}</div></article>)}</fieldset>
    {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-red-800">{error}</p>}
    <button disabled={busy} className="rounded-xl bg-blue-600 px-5 py-3 font-bold text-white disabled:opacity-50">{busy ? "Salvando respostas…" : "Finalizar simulado demonstrativo"}</button>
  </form>;
}
