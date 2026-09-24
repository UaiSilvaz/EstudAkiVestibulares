"use client";

import { ArrowRight, Search, X } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { SilvaIllustration, subjectIllustration } from "@/components/silva-illustration";

type Subject = { id: string; name: string; slug: string; description: string | null; questionCount: number; lessonCount: number; accuracy: number | null };
const normalize = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
function areaFor(subject: Subject) {
  const name = normalize(subject.slug + " " + subject.name);
  if (/matemat|geometr|algebra|raciocinio/.test(name)) return "Exatas";
  if (/fisica|quimica|biolog|natureza/.test(name)) return "Natureza";
  if (/historia|geograf|filosof|sociolog|humanas/.test(name)) return "Humanas";
  if (/portugues|literatura|lingua|ingles|espanhol/.test(name)) return "Linguagens";
  if (/redacao/.test(name)) return "Redação";
  return "Específicas";
}
const descriptions: Record<string, string> = {
  calculator: "Conecte conceitos, interprete problemas e descubra novos caminhos para resolver.",
  compass: "Visualize formas, explore medidas e encontre a lógica de cada construção.",
  cradle: "Entenda o movimento, a energia e os fenômenos que fazem parte do seu mundo.",
  flask: "Das pequenas partículas às grandes transformações: descubra como tudo se conecta.",
  dna: "Explore a vida, seus processos e as relações que mantêm tudo em equilíbrio.",
  globe: "Conecte lugares, sociedades e acontecimentos para compreender o mundo.",
  pencil: "Organize suas ideias, construa argumentos e dê clareza à sua escrita.",
  letter: "Leia além das palavras e desenvolva seu olhar para a linguagem.",
  book: "Aprofunde os fundamentos e transforme cada conceito em conhecimento.",
};

export function SubjectCatalog({ subjects, examSlug }: { subjects: Subject[]; examSlug?: string | null }) {
  const [area, setArea] = useState("Todas");
  const [query, setQuery] = useState("");
  const areas = useMemo(() => ["Todas", ...new Set(subjects.map(areaFor))], [subjects]);
  const visible = subjects.filter((subject) => (area === "Todas" || areaFor(subject) === area) && normalize(subject.name).includes(normalize(query)));

  return <section aria-label="Catálogo de disciplinas">
    <div className="silva-section-heading"><div><h2>Explore suas disciplinas</h2><p className="silva-muted text-xs mt-2">Escolha por onde começar. Cada descoberta abre um novo caminho.</p></div></div>
    <div className="silva-subject-toolbar">
      <div className="silva-subject-filters" aria-label="Filtrar disciplinas por área">{areas.map((item) => <button key={item} type="button" aria-pressed={area === item} onClick={() => setArea(item)}>{item}</button>)}</div>
      <label className="silva-subject-search"><Search size={16} /><input aria-label="Buscar disciplina" placeholder="Buscar disciplina..." value={query} onChange={(event) => setQuery(event.target.value)} />{query && <button type="button" onClick={() => setQuery("")} aria-label="Limpar busca"><X size={15} /></button>}</label>
    </div>
    {visible.length ? <div className="silva-subject-grid">{visible.map((subject, index) => {
      const art = subjectIllustration(subject.name);
      const href = "/questions?subject=" + encodeURIComponent(subject.id) + (examSlug ? "&vestibular=" + encodeURIComponent(examSlug) : "");
      return <article key={subject.id} className="silva-subject-card" data-art={art} style={{ animationDelay: `${Math.min(index, 7) * 45}ms` }}>
        <div className="silva-subject-art"><SilvaIllustration name={art} /></div>
        <div className="silva-subject-content">
          <div className="silva-subject-meta"><span>{subject.accuracy === null ? "Uma nova descoberta" : `${subject.accuracy}% de acertos`}</span><span>{subject.questionCount} questões</span></div>
          <h3>{subject.name}</h3><p>{descriptions[art]}</p>
          {subject.accuracy !== null ? <div className="silva-progress" role="progressbar" aria-label={`Taxa de acerto em ${subject.name}`} aria-valuenow={subject.accuracy} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${subject.accuracy}%` }} /></div> : <span className="silva-small-label">{subject.lessonCount ? `${subject.lessonCount} aulas para explorar` : "Aprenda no seu ritmo"}</span>}
          <Link href={href} aria-label={`Praticar ${subject.name}`}>Praticar disciplina<ArrowRight size={15} /></Link>
        </div>
      </article>;
    })}</div> : <div className="silva-catalog-empty"><SilvaIllustration name="compass" /><h3>{subjects.length ? "Vamos tentar outro caminho?" : "Prepare seu próximo passo"}</h3><p>{subjects.length ? "Nenhuma disciplina encontrada com esses filtros." : "Escolha sua preparação para encontrar as disciplinas do seu objetivo."}</p>{subjects.length ? <button className="silva-button-secondary" onClick={() => { setArea("Todas"); setQuery(""); }}>Limpar filtros</button> : <Link href="/explorar" className="silva-button">Explorar preparações<ArrowRight size={15} /></Link>}</div>}
    <p className="silva-subject-count" role="status">{visible.length} {visible.length === 1 ? "disciplina disponível" : "disciplinas disponíveis"}{subjects.some((subject) => subject.accuracy !== null) ? " · Acertos nas suas últimas 240 respostas" : ""}</p>
  </section>;
}
