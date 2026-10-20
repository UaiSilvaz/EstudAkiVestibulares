"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, ArrowUpRight, BookOpen, CalendarDays, ChartNoAxesCombined, Check, CheckCheck, ChevronDown, CirclePlay, ClipboardList, Layers3, Menu, Moon, ShieldCheck, Sun, UsersRound, X } from "lucide-react";
import { Brand, BrandMark } from "@/components/brand";
import { Aicon } from "@/components/visual/aicon";
import { getVerticalTheme, verticalThemeStyle, type StudyVertical } from "@/config/vertical-themes";
import { useProductAppearance } from "@/components/use-product-appearance";
import { publicFaculty } from "@/config/public-faculty";

const tracks: { id: StudyVertical; name: string; description: string; icon: "book" | "law" | "health" | "bank" | "target" }[] = [
  { id: "vestibular", name: "ENEM e vestibulares", description: "Da base ao próximo desafio.", icon: "book" },
  { id: "oab", name: "OAB e Direito", description: "Rigor e direção na preparação.", icon: "law" },
  { id: "medicina", name: "Medicina", description: "Precisão em cada etapa.", icon: "health" },
  { id: "concursos", name: "Concursos", description: "Um plano para sua carreira.", icon: "bank" },
  { id: "policia-militar", name: "Carreiras policiais", description: "Disciplina com estratégia.", icon: "target" },
];
const navigation = [["Preparações", "#preparacoes"], ["Método", "#metodo"], ["Aulas", "#professores"], ["Recursos", "#recursos"]] as const;
const features = [
  { icon: CalendarDays, title: "Plano que cabe na rotina", description: "Atividades organizadas a partir do seu tempo e do seu objetivo." },
  { icon: ClipboardList, title: "Prática com direção", description: "Questões por matéria e conteúdo para consolidar o que você aprende." },
  { icon: Layers3, title: "Revisão que faz sentido", description: "Retome seus erros e os assuntos que precisam de mais atenção." },
  { icon: ChartNoAxesCombined, title: "Evolução visível", description: "Acompanhe seus resultados e entenda onde concentrar seu esforço." },
  { icon: CirclePlay, title: "Conteúdo conectado", description: "Aulas, materiais e exercícios reunidos no seu percurso de estudo." },
  { icon: UsersRound, title: "Comunidade de estudo", description: "Troque dúvidas e organize seu estudo com outras pessoas." },
];
const questions = [
  ["Posso começar gratuitamente?", "Sim. A conta gratuita inclui o plano básico, acompanhamento de progresso e uma seleção de questões e atividades demonstrativas. Cursos e preparatórios são adquiridos individualmente."],
  ["Como escolho minha preparação?", "Depois de criar sua conta, você escolhe seu objetivo, as provas e a rotina de estudo. A organização e a identidade da plataforma acompanham essa preparação."],
  ["Preciso comprar uma assinatura para acessar um curso?", "Não. Os cursos oficiais são comprados individualmente, e o conteúdo incluído é liberado após a confirmação do pagamento. O Norte Preparatórios+ ainda não está disponível para contratação."],
  ["Posso estudar no celular?", "Sim. A interface se adapta ao celular, tablet e computador. Você pode organizar seu plano, responder questões e acompanhar seu progresso nesses dispositivos."],
  ["O Norte Preparatórios garante aprovação?", "Não. A plataforma oferece ferramentas para organizar e aprofundar seus estudos. Os resultados dependem da sua prática, da preparação e das exigências de cada prova."],
];

export function LandingPlanPreview() {
  return <div className="landing-plan-preview" aria-label="Exemplo ilustrativo da organização de estudo">
    <div className="plan-preview-top"><BrandMark /><span>Seu espaço de estudo</span><span className="plan-preview-dot" /></div>
    <div className="plan-preview-content"><p className="plan-preview-eyebrow">FOCO E CONSTÂNCIA</p><h3>Um plano.<br />Um próximo passo.</h3>
      <div className="plan-preview-row"><span><BookOpen /></span><div><strong>Aprenda o conteúdo</strong><p>Aulas e material de apoio</p></div><Check className="preview-check" /></div>
      <div className="plan-preview-row plan-preview-row--active"><span><ClipboardList /></span><div><strong>Coloque em prática</strong><p>Questões com foco no assunto</p></div><ArrowUpRight /></div>
      <div className="plan-preview-row"><span><Layers3 /></span><div><strong>Revise e avance</strong><p>Seu aprendizado, conectado</p></div><ArrowRight /></div>
      <div className="plan-preview-bottom"><ShieldCheck /><span>Clareza para estudar.<br /><strong>Direção para seguir.</strong></span></div>
    </div><p className="plan-preview-caption">Visão ilustrativa da plataforma</p>
  </div>;
}

export function PremiumLandingPage() {
  const [activeTrack, setActiveTrack] = useState<StudyVertical>("vestibular");
  const { mode, toggleMode } = useProductAppearance();
  const [menuOpen, setMenuOpen] = useState(false);
  const menu = useRef<HTMLDivElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const activeTheme = getVerticalTheme(activeTrack);
  useEffect(() => {
    if (!menuOpen) return;
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") { setMenuOpen(false); menuButton.current?.focus(); } };
    const outside = (event: PointerEvent) => { if (!menu.current?.contains(event.target as Node) && !menuButton.current?.contains(event.target as Node)) setMenuOpen(false); };
    document.addEventListener("keydown", close); document.addEventListener("pointerdown", outside);
    return () => { document.removeEventListener("keydown", close); document.removeEventListener("pointerdown", outside); };
  }, [menuOpen]);


  return <div className="premium-landing" style={verticalThemeStyle("vestibular", mode)} data-theme-mode={mode}>
    <a className="premium-skip-link" href="#principal">Ir para o conteúdo</a>
    <header className="premium-header"><div className="premium-container premium-header-inner"><Brand href="/" />
      <nav className="premium-desktop-nav" aria-label="Navegação principal">{navigation.map(([label, href]) => <a href={href} key={href}>{label}</a>)}</nav>
      <div className="premium-header-actions"><button className="premium-mode-toggle" onClick={toggleMode} type="button" aria-label={mode === "light" ? "Ativar modo escuro" : "Ativar modo claro"}>{mode === "light" ? <Moon /> : <Sun />}</button><Link className="premium-signin" href="/login">Entrar</Link><Link className="premium-button premium-button--primary header-signup" href="/login?signup=true">Começar agora <ArrowUpRight /></Link><button ref={menuButton} type="button" className="premium-menu-button" aria-label={menuOpen ? "Fechar menu" : "Abrir menu"} aria-controls="premium-mobile-menu" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X /> : <Menu />}</button></div>
    </div>{menuOpen && <div ref={menu} id="premium-mobile-menu" className="premium-mobile-menu"><nav aria-label="Navegação móvel">{navigation.map(([label, href]) => <a key={href} href={href} onClick={() => setMenuOpen(false)}>{label}<ArrowUpRight /></a>)}<Link href="/login" onClick={() => setMenuOpen(false)}>Acessar minha conta <ArrowRight /></Link><Link href="/login?signup=true" className="premium-button premium-button--primary">Criar conta gratuita</Link></nav></div>}</header>
    <main id="principal">
      <section className="premium-hero-wrap"><div className="premium-container"><div className="premium-hero">
        <div className="premium-hero-grid" aria-hidden="true" /><div className="premium-hero-copy"><p className="premium-eyebrow premium-eyebrow--light"><span />PREPARAÇÃO COM DIREÇÃO</p><h1>Grandes objetivos.<br /><span>Um próximo passo</span><br />todos os dias.</h1><p className="premium-hero-description">Transforme sua vontade de chegar mais longe em uma rotina de estudo clara, organizada e feita para você.</p><div className="premium-hero-actions"><Link href="/login?signup=true" className="premium-button premium-button--white">Criar minha conta <ArrowUpRight /></Link><a href="#metodo" className="premium-button premium-button--outline">Conhecer o método <ArrowRight /></a></div><p className="premium-hero-note"><CheckCheck />Conta gratuita. Comece no seu ritmo.</p></div>
        <div className="premium-hero-visual"><LandingPlanPreview /><div className="premium-hero-orbit" aria-hidden="true"><Aicon name="calendar" tone="outline" /><Aicon name="book" tone="outline" /><Aicon name="chart" tone="outline" /></div></div>
        <div className="premium-hero-footer"><span>Norte <b>Preparatórios</b></span><span>Estratégia. Constância. Evolução.</span></div>
      </div></div></section>
      <div className="premium-container premium-assurance"><div><ShieldCheck /><span>Seu objetivo no centro</span></div><div><CalendarDays /><span>Rotina com clareza</span></div><div><ChartNoAxesCombined /><span>Progresso com contexto</span></div><div><BookOpen /><span>Conteúdo e prática juntos</span></div></div>

      <section id="preparacoes" className="premium-section"><div className="premium-container"><div className="premium-section-heading"><div><p className="premium-eyebrow">CADA OBJETIVO, UM CAMINHO</p><h2>A preparação certa<br />para o seu próximo capítulo.</h2></div><p>A mesma plataforma. Uma experiência que acompanha as exigências do seu objetivo.</p></div>
        <div className="premium-tracks">{tracks.map(track => <button key={track.id} type="button" className="premium-track-card" aria-pressed={activeTrack === track.id} aria-controls="preparation-overview" onClick={() => setActiveTrack(track.id)} style={{ "--track-color": getVerticalTheme(track.id).colors.primary } as React.CSSProperties}><span className="premium-track-icon"><Aicon name={track.icon} tone="outline" size={24} /></span><strong>{track.name}</strong><span className="premium-track-description">{track.description}</span><span className="premium-track-bottom">Conhecer preparação <ArrowUpRight /></span></button>)}</div>
        <div id="preparation-overview" className="premium-track-overview" style={verticalThemeStyle(activeTrack, mode)} data-vertical={activeTrack}><div><p className="premium-eyebrow">{activeTheme.shortName}</p><h3>{activeTheme.copy.heroTitle}</h3><p>{activeTheme.copy.heroDescription}</p><div className="premium-subject-pills">{activeTheme.subjects.slice(0, 5).map(subject => <span key={subject.slug}>{subject.name}</span>)}</div></div><Link href="/login?signup=true" className="premium-button premium-button--primary">Começar minha preparação <ArrowUpRight /></Link></div>
      </div></section>

      <section id="metodo" className="premium-section premium-section--soft"><div className="premium-container premium-method"><div className="premium-method-copy"><p className="premium-eyebrow">ESTUDO COM ESTRATÉGIA</p><h2>Seu esforço merece<br />uma direção clara.</h2><p>Estudar melhor começa por saber o que fazer. O Norte Preparatórios conecta seu objetivo às atividades de cada dia.</p><a href="#recursos" className="premium-text-link">Conheça as ferramentas <ArrowRight /></a><div className="premium-method-signature"><BrandMark /><span>Um próximo passo.<br /><strong>Todos os dias.</strong></span></div></div><div className="premium-method-steps">{[
          ["01", "Encontre seu ponto de partida", "Escolha sua preparação e organize o tempo que você tem disponível."],
          ["02", "Aprenda e coloque em prática", "Conecte conteúdo, aulas e questões em uma rotina possível."],
          ["03", "Revise o que precisa de atenção", "Retome os erros e consolide o aprendizado antes de seguir."],
          ["04", "Acompanhe e ajuste o caminho", "Use seus próprios resultados para orientar os próximos passos."],
        ].map(([number, title, description]) => <article key={number}><span>{number}</span><div><h3>{title}</h3><p>{description}</p></div></article>)}</div></div></section>

      <section id="professores" className="premium-section"><div className="premium-container"><div className="premium-section-heading"><div><p className="premium-eyebrow">APRENDER COM CONTEXTO</p><h2>Conteúdo para entender.<br />Prática para consolidar.</h2></div><p>Conheça os cursos e os professores responsáveis pelo conteúdo da sua preparação.</p></div>
        {publicFaculty.length > 0 ? <div className="premium-faculty">{publicFaculty.map(teacher => <article key={teacher.name} className="premium-teacher-card"><div><Image src={teacher.photo} alt={teacher.name} width={640} height={720} className="premium-teacher-photo" /></div><p className="premium-eyebrow">{teacher.specialty}</p><h3>{teacher.name}</h3><p>{teacher.description}</p><Link href={teacher.courseHref} className="premium-text-link">Conhecer as aulas <ArrowUpRight /></Link></article>)}</div> : <div className="premium-learning-banner"><div><p className="premium-eyebrow premium-eyebrow--light">O CONTEÚDO FAZ PARTE DO CAMINHO</p><h3>A aula abre o assunto.<br />A prática constrói o aprendizado.</h3><p>Explore os cursos, consulte os conteúdos incluídos e escolha a formação que faz sentido para sua preparação.</p><Link href="/cursos" className="premium-button premium-button--white">Explorar cursos <ArrowUpRight /></Link></div><div className="premium-learning-icons" aria-hidden="true"><Aicon name="video" tone="outline" size={52} /><Aicon name="book" tone="outline" size={52} /><Aicon name="essay" tone="outline" size={52} /><Aicon name="target" tone="outline" size={52} /></div></div>}
      </div></section>

      <section id="recursos" className="premium-section premium-section--soft"><div className="premium-container"><div className="premium-section-heading"><div><p className="premium-eyebrow">UM SISTEMA PARA SUA ROTINA</p><h2>Tudo se conecta.<br />Você segue em frente.</h2></div><p>Menos tempo organizando ferramentas. Mais clareza para estudar e avançar.</p></div><div className="premium-features">{features.map(feature => <article key={feature.title}><span><feature.icon /></span><h3>{feature.title}</h3><p>{feature.description}</p></article>)}</div></div></section>

      <section className="premium-section" id="acesso"><div className="premium-container premium-access"><div><p className="premium-eyebrow">CLAREZA DESDE O COMEÇO</p><h2>Conheça a plataforma.<br />Escolha com confiança.</h2><p>Crie sua conta gratuitamente e explore a experiência antes de escolher um curso.</p></div><div className="premium-access-options"><article><span>01</span><div><h3>Conta gratuita</h3><p>Plano básico, progresso e uma seleção de questões e atividades demonstrativas.</p></div><Check /></article><article><span>02</span><div><h3>Cursos oficiais, compra individual</h3><p>Consulte aulas e materiais incluídos. O acesso é liberado após a confirmação do pagamento.</p></div><BookOpen /></article><Link href="/login?signup=true" className="premium-button premium-button--primary">Conhecer com uma conta gratuita <ArrowUpRight /></Link></div></div></section>

      <section id="duvidas" className="premium-section premium-section--soft"><div className="premium-container premium-faq"><div><p className="premium-eyebrow">RESPOSTAS CLARAS</p><h2>Antes do seu<br />próximo passo.</h2></div><div>{questions.map(([question, answer]) => <details key={question}><summary>{question}<ChevronDown /></summary><p>{answer}</p></details>)}</div></div></section>
      <section className="premium-final-wrap"><div className="premium-container"><div className="premium-final"><BrandMark /><p className="premium-eyebrow premium-eyebrow--light">SEU OBJETIVO MERECE UM PLANO</p><h2>O próximo capítulo<br />começa com você.</h2><p>Organize seus estudos. Encontre seu ritmo. Dê o primeiro passo.</p><Link href="/login?signup=true" className="premium-button premium-button--white">Começar minha preparação <ArrowUpRight /></Link></div></div></section>
    </main>
    <footer className="premium-footer"><div className="premium-container"><div className="premium-footer-top"><Brand href="/" /><p>Um próximo passo.<br />Todos os dias.</p><nav aria-label="Navegação do rodapé"><a href="#preparacoes">Preparações</a><a href="#recursos">Recursos</a><a href="#duvidas">Dúvidas</a><Link href="/login">Minha conta</Link></nav></div><div className="premium-footer-bottom"><span>© {new Date().getFullYear()} Norte Preparatórios.</span><span>Clareza para estudar. Direção para seguir.</span></div></div></footer>
  </div>;
}
