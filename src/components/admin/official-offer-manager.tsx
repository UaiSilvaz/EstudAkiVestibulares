"use client";
import { useState } from "react";
type Item = { id: string; name: string; priceCents: number; isFree: boolean; courseIds: string[] };
export function OfficialOfferManager({ courses, preparations }: { courses: Item[]; preparations: Item[] }) {
  const [kind, setKind] = useState("preparation");
  const [id, setId] = useState("");
  const [price, setPrice] = useState("");
  const [isFree, setIsFree] = useState(false);
  const [courseIds, setCourseIds] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const items = kind === "course" ? courses : preparations;
  function select(value: string) { const item = items.find(item => item.id === value); setId(value); setPrice(item ? (item.priceCents / 100).toFixed(2) : ""); setIsFree(kind === "course" && Boolean(item?.isFree)); setCourseIds(item?.courseIds ?? []); setMessage(""); }
  async function save(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/admin/offers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind, id, priceCents: Math.round(Number(price.replace(",", ".")) * 100), isFree, ...(kind === "preparation" ? { courseIds } : {}) }) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error); setMessage(result.message); window.location.reload();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Falha ao salvar."); } finally { setBusy(false); }
  }
  return <form onSubmit={save} className="space-y-4 rounded-3xl bg-white p-6 shadow-sm">
    <label className="block">Tipo<select className="mt-2 block w-full rounded-xl border p-3" value={kind} onChange={e => { setKind(e.target.value); setId(""); setIsFree(false); setCourseIds([]); }}><option value="preparation">Preparatório completo</option><option value="course">Curso individual</option></select></label>
    <label className="block">Produto oficial<select required className="mt-2 block w-full rounded-xl border p-3" value={id} onChange={e => select(e.target.value)}><option value="">Selecione</option>{items.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
    {kind === "course" && <label className="flex gap-2"><input type="checkbox" checked={isFree} onChange={e => setIsFree(e.target.checked)} />Curso gratuito de demonstração</label>}
    {!isFree && <label className="block">Preço único (R$)<input required type="text" inputMode="decimal" value={price} onChange={e => setPrice(e.target.value)} className="mt-2 block w-full rounded-xl border p-3" /></label>}
    {kind === "preparation" && <fieldset className="space-y-2"><legend className="mb-2 font-bold">Cursos incluídos neste preparatório</legend>{courses.map(course => <label key={course.id} className="flex gap-2"><input type="checkbox" checked={courseIds.includes(course.id)} onChange={e => setCourseIds(previous => e.target.checked ? [...previous, course.id] : previous.filter(id => id !== course.id))} />{course.name}</label>)}</fieldset>}
    <p className="text-sm text-slate-600">Os cursos são produtos oficiais Norte Preparatórios. Professores não definem preços nem abrem lojas. Ofertas sem conteúdo publicado ou pagamento configurado aparecem como Em breve.</p>
    {message && <p role="status" className="rounded-xl bg-blue-50 p-3">{message}</p>}
    <button disabled={busy || !id} className="rounded-xl bg-blue-600 px-5 py-3 font-bold text-white disabled:opacity-50">{busy ? "Salvando…" : "Salvar oferta oficial"}</button>
  </form>;
}
