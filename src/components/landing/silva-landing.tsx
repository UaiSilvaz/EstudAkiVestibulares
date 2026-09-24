"use client";

import { ArrowRight, ArrowUpRight, BookOpen, CalendarDays, ChartNoAxesCombined, Check, ChevronRight, GraduationCap, HeartPulse, Landmark, Layers3, Play, Scale, Shield, Target } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { SilvaBrand } from "@/components/silva-brand";
import { trackIds, tracks, trackStyle, type TrackId } from "@/config/tracks";

const icons = { vestibulares: GraduationCap, enem: BookOpen, medicina: HeartPulse, oab: Scale, policia: Shield, concursos: Landmark };
const subjects = { vestibulares: ["Matemática", "Funções e aplicações", "Física", "Linguagens"], enem: ["Matemática", "Funções do 2º grau", "Biologia", "Redação"], medicina: ["Biologia", "Genética e hereditariedade", "Química", "Revisão de citologia"], oab: ["Direito Constitucional", "Direitos fundamentais", "Ética profissional", "Direito Civil"], policia: ["Direito Penal", "Teoria geral do crime", "Português", "Legislação especial"], concursos: ["Português", "Interpretação de textos", "Raciocínio lógico", "Direito Administrativo"] };

export function SilvaLanding() {
  const [track, setTrack] = useState<TrackId>("enem");
  const selected = tracks[track];
  const Icon = icons[track];
  const signup = "/login?signup=true&redirect=" + encodeURIComponent("/onboarding?profile=" + selected.vertical);

  return <main className="silva-landing" style={trackStyle(track)}>
    <header className="silva-public-nav"><Link href="/" aria-label="Página inicial"><SilvaBrand color /></Link><nav aria-label="Navegação institucional"><a href="#caminhos">Preparações</a><a href="#metodo">Como funciona</a><a href="#recursos">A plataforma</a></nav><Link className="silva-public-login" href="/login">Entrar<ArrowUpRight size={16} /></Link></header>
    <section className="silva-hero">
      <div className="silva-hero-copy"><span className="silva-public-kicker"><span />UM NOVO CAMINHO PARA O SEU FUTURO</span><h1>Estude para o que<br />realmente <em>importa.</em></h1><p>Uma plataforma. Diferentes caminhos.<br />Um plano para chegar lá.</p><div className="silva-hero-actions"><Link href={signup} className="silva-button">Começar minha preparação<ArrowRight size={17} /></Link><a href="#caminhos" className="silva-link">Encontrar meu caminho<ChevronRight size={16} /></a></div><div className="silva-hero-note"><Check size={15} />Seu objetivo no centro de cada estudo.</div></div>
      <div className="silva-preview-wrap" aria-label="Exemplo ilustrativo do painel de estudos">
        <div className="silva-preview-caption"><span className="silva-preview-dot" /> SUA PRÓXIMA CONQUISTA COMEÇA NA ROTINA</div>
        <div className="silva-preview">
          <div className="silva-preview-top"><SilvaBrand compact /><span className="flex items-center gap-2"><Icon size={15} />{selected.name}</span><span className="silva-avatar">S</span></div>
          <div className="silva-preview-body"><p className="silva-eyebrow">UM PASSO DE CADA VEZ</p><h2>Hoje é um bom dia para avançar.</h2><p className="silva-muted text-xs mt-2">Sua preparação continua aqui.</p>
            <div className="silva-preview-course"><div className="flex justify-between silva-eyebrow"><span>CONTINUE ESTUDANDO</span><Play size={14} /></div><h3>{subjects[track][0]}</h3><p>{subjects[track][1]}</p><div className="silva-progress mt-5"><span style={{ width: "68%" }} /></div><div className="mt-3 flex justify-between text-xs"><span>Seu ritmo. Seu progresso.</span><span className="font-semibold">Continuar →</span></div></div>
            <div className="silva-preview-plan"><p className="text-xs font-semibold mb-3">Seu plano de hoje</p>{[subjects[track][2], subjects[track][3]].map((subject, index) => <div key={subject} className="flex items-center gap-3 py-2"><span className="silva-task-check" data-completed={index === 0}>{index === 0 && <Check size={12} />}</span><span className="text-xs">{subject}</span><span className="ml-auto text-[10px] silva-muted">{index === 0 ? "Concluído" : "Próximo passo"}</span></div>)}</div>
          </div>
        </div>
        <span className="silva-preview-footnote">Visão ilustrativa · a experiência acompanha sua preparação</span>
      </div>
    </section>

    <section id="caminhos" className="silva-paths"><div className="silva-public-section-heading"><div><p className="silva-eyebrow">DIFERENTES OBJETIVOS. A MESMA DEDICAÇÃO.</p><h2>Escolha o seu caminho.</h2></div><p>O próximo capítulo da sua história<br />começa com uma escolha.</p></div><div className="silva-path-grid">{trackIds.map((id) => { const TrackIcon = icons[id]; return <button key={id} className="silva-path" aria-pressed={track === id} onClick={() => setTrack(id)} style={trackStyle(id)}><TrackIcon size={24} /><span>{tracks[id].name}</span><ArrowUpRight size={16} /></button>; })}</div><div className="silva-path-detail" aria-live="polite"><p><strong>{selected.name}.</strong> {selected.description}</p><Link href={signup}>Quero me preparar<ArrowRight size={15} /></Link></div></section>

    <section id="metodo" className="silva-method"><div><p className="silva-eyebrow">CLAREZA PARA COMEÇAR. CONSTÂNCIA PARA CHEGAR.</p><h2>Um objetivo grande.<br />Passos que cabem no seu dia.</h2><p>Você traz a vontade de aprender. A Silva ajuda a organizar o caminho, do primeiro estudo à próxima prova.</p><Link href={signup} className="silva-button-secondary">Criar meu plano<ArrowRight size={16} /></Link></div><ol>{[{ title: "Conte aonde quer chegar", text: "Escolha sua preparação, sua prova e o tempo que pode dedicar." }, { title: "Encontre seu ritmo", text: "Organize aulas, questões e revisões em uma rotina possível." }, { title: "Veja cada passo fazer diferença", text: "Acompanhe seu desempenho e ajuste o foco ao longo do caminho." }].map((step, index) => <li key={step.title}><span>0{index + 1}</span><div><h3>{step.title}</h3><p>{step.text}</p></div></li>)}</ol></section>

    <section id="recursos" className="silva-features"><p className="silva-eyebrow">TUDO CONECTADO AO SEU OBJETIVO</p><h2>Mais foco no que faz você aprender.</h2><div className="silva-feature-grid">{[{ icon: CalendarDays, title: "Um plano para você", text: "Suas metas e sua disponibilidade em uma rotina de estudos organizada." }, { icon: Target, title: "Aprender na prática", text: "Questões, simulados e um caderno de erros para transformar prática em evolução." }, { icon: Layers3, title: "Conhecimento que fica", text: "Aulas, materiais e flashcards para aprender, revisar e conectar ideias." }, { icon: ChartNoAxesCombined, title: "Progresso com clareza", text: "Entenda seus acertos e descubra onde vale dedicar mais atenção." }].map(({ icon: FeatureIcon, title, text }) => <article key={title}><FeatureIcon size={24} /><h3>{title}</h3><p>{text}</p></article>)}</div></section>
    <section className="silva-public-cta"><SilvaBrand /><h2>Seu futuro merece<br />o seu próximo passo.</h2><Link href={signup} className="silva-button">Começar agora<ArrowRight size={17} /></Link></section>
    <footer className="silva-public-footer"><SilvaBrand /><p>Silva Educacional · Conhecimento para seguir em frente.</p><Link href="/login">Área do aluno<ArrowUpRight size={15} /></Link></footer>
  </main>;
}
