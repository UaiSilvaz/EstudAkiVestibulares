"use client";

import { motion } from "framer-motion";
import {
  BookOpen,
  Loader2,
  Plus,
  RotateCcw,
  Search,
  Share2,
  Star,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useFeedback } from "@/components/feedback/feedback-provider";

type Card = {
  id: string;
  front: string;
  back: string;
  deck: string | null;
  ownerId: string | null;
  shared: boolean;
  favorite: boolean;
  subject: { id: string; name: string; color: string } | null;
  topic: { name: string } | null;
  owner: { id: string; name: string } | null;
};

export function FlashcardDeck({
  subjects,
  decks,
  currentUserId,
  initialSubject = "",
}: {
  subjects: Array<{ id: string; name: string }>;
  decks: Array<{ subjectId: string | null; name: string }>;
  currentUserId: string;
  initialSubject?: string;
}) {
  const { notify } = useFeedback();
  const [cards, setCards] = useState<Card[]>([]);
  const [flipped, setFlipped] = useState<Record<string, boolean>>({});
  const [subject, setSubject] = useState(initialSubject);
  const [deck, setDeck] = useState("");
  const [scope, setScope] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ subjectId: subjects[0]?.id ?? "", deck: "Meus flashcards", front: "", back: "", shared: false });

  const availableDecks = useMemo(
    () => decks.filter((item) => !subject || item.subjectId === subject),
    [decks, subject],
  );

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setLoading(true);
      const params = new URLSearchParams();
      if (subject) params.set("subject", subject);
      if (deck) params.set("deck", deck);
      if (scope) params.set("scope", scope);
      if (search.trim()) params.set("q", search.trim());
      const response = await fetch(`/api/flashcards?${params}`, { signal: controller.signal });
      const data = (await response.json().catch(() => null)) as { cards?: Card[] } | null;
      if (response.ok) setCards(data?.cards ?? []);
      setLoading(false);
    }, 220);
    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [deck, scope, search, subject]);

  async function favorite(card: Card) {
    const response = await fetch(`/api/flashcards/${card.id}/favorite`, { method: "POST" });
    if (!response.ok) return;
    const data = (await response.json()) as { favorite: boolean };
    setCards((current) => current.map((item) => item.id === card.id ? { ...item, favorite: data.favorite } : item));
    notify({ tone: data.favorite ? "success" : "info", title: data.favorite ? "Flashcard favoritado" : "Removido dos favoritos", duration: 2800 });
  }

  async function createCard() {
    if (!form.front.trim() || !form.back.trim()) {
      notify({ tone: "warning", title: "Complete o flashcard", message: "Preencha frente e verso." });
      return;
    }
    const response = await fetch("/api/flashcards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = (await response.json().catch(() => null)) as { card?: Card; error?: string } | null;
    if (!response.ok || !data?.card) {
      notify({ tone: "error", title: "Flashcard não criado", message: data?.error ?? "Tente novamente." });
      return;
    }
    setCards((current) => [data.card!, ...current]);
    setForm((current) => ({ ...current, front: "", back: "" }));
    setCreating(false);
    notify({ tone: "success", title: "Flashcard criado", message: form.shared ? "Ele já pode ser estudado por seus colegas." : "Ele ficou privado na sua coleção." });
  }

  async function toggleShare(card: Card) {
    const response = await fetch("/api/flashcards", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: card.id, shared: !card.shared }),
    });
    if (!response.ok) return;
    setCards((current) => current.map((item) => item.id === card.id ? { ...item, shared: !item.shared } : item));
    notify({ tone: "success", title: card.shared ? "Flashcard privado" : "Compartilhado com colegas" });
  }

  return (
    <div className="space-y-5">
      <section className="rounded-[26px] border border-slate-100 bg-white p-4 shadow-sm">
        <div className="grid gap-2 md:grid-cols-[1fr_180px_220px_auto]">
          <label className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar frente ou resposta" className="ek-input ek-input-with-icon w-full !pl-11" /></label>
          <select value={subject} onChange={(event) => { setSubject(event.target.value); setDeck(""); }} className="ek-input"><option value="">Todas as matérias</option>{subjects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
          <select value={deck} onChange={(event) => setDeck(event.target.value)} className="ek-input"><option value="">Todos os baralhos</option>{availableDecks.map((item) => <option key={`${item.subjectId}-${item.name}`} value={item.name}>{item.name}</option>)}</select>
          <button onClick={() => setCreating((value) => !value)} className="flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 px-4 text-xs font-black text-white shadow-md"><Plus className="h-4 w-4" /> Criar</button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {[{ value: "", label: "Todos" }, { value: "favorites", label: "Favoritos" }, { value: "mine", label: "Meus cards" }].map((item) => <button key={item.value} onClick={() => setScope(item.value)} className={`rounded-full px-3 py-1.5 text-xs font-black ${scope === item.value ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-600"}`}>{item.label}</button>)}
          <span className="ml-auto text-xs font-bold text-slate-400">{cards.length} exibidos</span>
        </div>
      </section>

      {creating && (
        <section className="rounded-[26px] border border-blue-100 bg-gradient-to-br from-blue-50 to-white p-5">
          <div className="grid gap-3 md:grid-cols-2">
            <select value={form.subjectId} onChange={(event) => setForm({ ...form, subjectId: event.target.value })} className="ek-input">{subjects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
            <input value={form.deck} onChange={(event) => setForm({ ...form, deck: event.target.value })} className="ek-input" placeholder="Nome do baralho" />
            <textarea value={form.front} onChange={(event) => setForm({ ...form, front: event.target.value })} className="ek-input min-h-28" placeholder="Frente: pergunta ou conceito" />
            <textarea value={form.back} onChange={(event) => setForm({ ...form, back: event.target.value })} className="ek-input min-h-28" placeholder="Verso: resposta ou explicação" />
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-sm font-bold text-slate-600"><input type="checkbox" checked={form.shared} onChange={(event) => setForm({ ...form, shared: event.target.checked })} className="h-4 w-4 accent-blue-600" /> Compartilhar com colegas</label>
            <button onClick={() => void createCard()} className="rounded-2xl bg-blue-600 px-5 py-2.5 text-sm font-black text-white">Salvar flashcard</button>
          </div>
        </section>
      )}

      {loading ? (
        <div className="flex min-h-64 items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-blue-600" /></div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {cards.map((card, index) => {
            const isFlipped = flipped[card.id];
            const color = card.subject?.color ?? "#2563EB";
            return (
              <motion.article key={card.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(index, 12) * 0.025 }} className="relative h-72">
                <button onClick={() => void favorite(card)} aria-label={card.favorite ? "Remover dos favoritos" : "Favoritar flashcard"} className="absolute right-3 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-xl bg-white/90 text-amber-500 shadow-md"><Star className="h-4 w-4" fill={card.favorite ? "currentColor" : "none"} /></button>
                {card.ownerId === currentUserId && <button onClick={() => void toggleShare(card)} aria-label="Compartilhar flashcard" className="absolute right-14 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-xl bg-white/90 text-blue-600 shadow-md">{card.shared ? <Users className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}</button>}
                <button type="button" onClick={() => setFlipped((current) => ({ ...current, [card.id]: !isFlipped }))} className="ek-flip-card h-full w-full text-left" data-flipped={isFlipped ? "true" : "false"}>
                  <div className="ek-flip-inner h-full w-full">
                    <div className="ek-flip-face flex h-full w-full flex-col rounded-[26px] border border-slate-100 bg-white p-6 shadow-[0_18px_40px_-22px_rgba(15,23,42,0.22)]">
                      <span className="w-fit rounded-full px-3 py-1 text-[10px] font-black text-white" style={{ background: `linear-gradient(135deg, ${color}, #22D3EE)` }}>{card.subject?.name ?? "Geral"}</span>
                      <p className="mt-5 text-[10px] font-black uppercase tracking-wider text-slate-400">{card.deck ?? "Flashcard"}</p>
                      <p className="mt-3 line-clamp-5 text-lg font-black leading-7 text-slate-950">{card.front}</p>
                      <span className="mt-auto flex items-center gap-2 text-xs font-bold text-slate-400"><RotateCcw className="h-4 w-4" /> Clique para virar</span>
                    </div>
                    <div className="ek-flip-face ek-flip-back flex h-full w-full flex-col rounded-[26px] border p-6 shadow-[0_18px_40px_-22px_rgba(15,23,42,0.22)]" style={{ background: `linear-gradient(135deg, ${color}18, #DBEAFE)`, borderColor: `${color}40` }}>
                      <span className="w-fit rounded-full bg-slate-950 px-3 py-1 text-[10px] font-black text-white">Resposta</span>
                      <p className="mt-5 line-clamp-7 text-base font-bold leading-7 text-slate-800">{card.back}</p>
                      <span className="mt-auto flex items-center gap-2 text-xs font-bold text-slate-500"><BookOpen className="h-4 w-4" /> {card.owner?.name ?? "Acervo EstudAki"}</span>
                    </div>
                  </div>
                </button>
              </motion.article>
            );
          })}
        </div>
      )}
      {!loading && !cards.length && <p className="rounded-[24px] border border-dashed border-slate-200 bg-white p-10 text-center text-sm font-semibold text-slate-500">Nenhum flashcard encontrado para estes filtros.</p>}
    </div>
  );
}
