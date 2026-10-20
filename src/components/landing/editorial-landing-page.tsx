"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { ArrowDown, ArrowRight, ArrowUpRight, BookOpen, CalendarDays, ChartNoAxesCombined, Check, ChevronDown, CirclePlay, ClipboardList, Menu, Moon, ShieldCheck, Sun, Target, X } from "lucide-react";
import { Brand, BrandMark } from "@/components/brand";
import { Aicon } from "@/components/visual/aicon";
import { useProductAppearance } from "@/components/use-product-appearance";
import { getVerticalPalette, getVerticalTheme, verticalThemeStyle, type StudyVertical } from "@/config/vertical-themes";
import { publicFaculty } from "@/config/public-faculty";

const sections = [
  ["inicio", "Início"], ["conteudo", "Aulas e conteúdo"], ["diferenciais", "Por que Norte Preparatórios"],
  ["preparacoes", "Preparações"], ["recursos", "Sua rotina"], ["metodo", "Como começar"],
  ["acesso", "Acesso e dúvidas"], ["comece", "Comece agora"],
] as const;
const navigation = [["Preparações", "preparacoes"], ["Aulas", "conteudo"], ["Como funciona", "metodo"]] as const;
const tracks: { id: StudyVertical; title: string; description: string; icon: "book" | "health" | "law" | "bank" | "target" }[] = [
  { id: "vestibular", title: "ENEM e vestibulares", description: "Construa sua base. Avance até a prova.", icon: "book" },
  { id: "medicina", title: "Medicina", description: "Foco e profundidade em cada etapa.", icon: "health" },
  { id: "oab", title: "OAB e Direito", description: "Uma preparação com rigor e direção.", icon: "law" },
  { id: "concursos", title: "Concursos", description: "Organização para o seu próximo cargo.", icon: "bank" },
  { id: "policia-militar", title: "Carreiras policiais", description: "Disciplina para seguir seu objetivo.", icon: "target" },
];
const learningCards = [
  { photo: "portrait-exatas.webp", title: "Entenda o assunto", description: "Aulas e materiais", color: "coral" },
  { photo: "portrait-natureza.webp", title: "Coloque em prática", description: "Questões e exercícios", color: "green" },
  { photo: "portrait-linguagens.webp", title: "Revise e avance", description: "Seu próximo passo", color: "yellow" },
];
const features = [
  { icon: CalendarDays, title: "Plano do dia", copy: "Organize o estudo a partir do seu tempo." },
  { icon: CirclePlay, title: "Aulas", copy: "Aprenda por matéria e assunto." },
  { icon: ClipboardList, title: "Questões", copy: "Treine e retome o que precisa de atenção." },
  { icon: Target, title: "Simulados", copy: "Prepare-se para o ritmo da prova." },
  { icon: BookOpen, title: "Materiais", copy: "Tenha o conteúdo de apoio por perto." },
  { icon: ChartNoAxesCombined, title: "Progresso", copy: "Acompanhe resultados reais da sua prática." },
];
const faq = [
  ["Posso começar gratuitamente?", "Sim. Você pode criar sua conta sem pagar e explorar o plano básico, o progresso e uma seleção de questões e atividades demonstrativas."],
  ["Como funciona o acesso aos cursos?", "Os cursos oficiais são comprados individualmente. Consulte as aulas e os materiais incluídos; o acesso é liberado após a confirmação do pagamento."],
  ["Como escolho minha preparação?", "Depois de criar a conta, você escolhe seu objetivo e organiza sua rotina. A plataforma acompanha a preparação selecionada."],
  ["Posso estudar pelo celular?", "Sim. A interface se adapta ao celular, tablet e computador para você organizar seu plano e seguir estudando."],
] as const;
const photoPath = (file: string) => `/assets/landing-editorial/${file}`;

export function EditorialLandingPage() {
  const { mode, toggleMode } = useProductAppearance();
  const [active, setActive] = useState(0);
  const [progress, setProgress] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [selected, setSelected] = useState<StudyVertical>("vestibular");
  const scroller = useRef<HTMLDivElement>(null);
  const header = useRef<HTMLElement>(null);
  useEffect(() => {
    const root = scroller.current;
    if (!root) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const line = root.getBoundingClientRect().top + root.clientHeight * .35;
      const index = sections.findIndex(([id]) => {
        const bounds = root.querySelector(`#${id}`)?.getBoundingClientRect();
        return bounds && bounds.top <= line && bounds.bottom > line;
      });
      if (index >= 0) setActive(index);
      const max = root.scrollHeight - root.clientHeight;
      setProgress(max > 0 ? Math.min(100, root.scrollTop / max * 100) : 0);
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    const resize = new ResizeObserver(schedule);
    resize.observe(root);
    root.addEventListener("scroll", schedule, { passive: true });
    schedule();
    return () => { cancelAnimationFrame(frame); resize.disconnect(); root.removeEventListener("scroll", schedule); };
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const outside = (event: PointerEvent) => { if (!header.current?.contains(event.target as Node)) setMenuOpen(false); };
    const escape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") { setMenuOpen(false); header.current?.querySelector<HTMLButtonElement>(".editorial-menu-toggle")?.focus(); }
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", escape); };
  }, [menuOpen]);

  function goTo(id: string) {
    const root = scroller.current;
    const target = root?.querySelector<HTMLElement>(`#${id}`);
    if (!root || !target) return;
    const top = target.getBoundingClientRect().top - root.getBoundingClientRect().top + root.scrollTop - (header.current?.offsetHeight ?? 80);
    root.scrollTo({ top, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
    setMenuOpen(false);
  }
  function keyboard(event: KeyboardEvent<HTMLDivElement>) {
    if ((event.target as HTMLElement).closest("a,button,input,select,textarea,summary,[contenteditable=true]")) return;
    const next = ["ArrowDown", "PageDown"].includes(event.key) ? Math.min(active + 1, sections.length - 1)
      : ["ArrowUp", "PageUp"].includes(event.key) ? Math.max(active - 1, 0) : -1;
    if (next >= 0) { event.preventDefault(); goTo(sections[next][0]); }
  }
  const currentTheme = getVerticalTheme(selected);

  return <div className="editorial-landing" style={verticalThemeStyle("vestibular", mode)} data-theme-mode={mode}>
    <div ref={scroller} className="editorial-scroller" tabIndex={0} aria-label="Página de apresentação do Norte Preparatórios" onKeyDown={keyboard}>
      <a href="#inicio" className="editorial-skip" onClick={event => { event.preventDefault(); goTo("inicio"); scroller.current?.querySelector<HTMLHeadingElement>("h1")?.focus(); }}>Ir para o conteúdo</a>
      <header ref={header} className="editorial-header">
        <div className="editorial-header-inner"><Brand href="/" className="estudaki-brand--sm" />
          <nav className="editorial-desktop-nav" aria-label="Navegação principal">{navigation.map(([label,id]) => <a key={id} href={`#${id}`} onClick={event => { event.preventDefault(); goTo(id); }}>{label}</a>)}</nav>
          <div className="editorial-header-actions"><button type="button" onClick={toggleMode} className="editorial-icon-button" aria-label={mode === "light" ? "Ativar modo escuro" : "Ativar modo claro"}>{mode === "light" ? <Moon /> : <Sun />}</button><Link href="/login" className="editorial-signin">Entrar</Link><Link href="/login?signup=true" className="editorial-button editorial-button--blue editorial-header-cta">Começar agora <ArrowUpRight /></Link><button type="button" className="editorial-icon-button editorial-menu-toggle" aria-label={menuOpen ? "Fechar menu" : "Abrir menu"} aria-controls="editorial-mobile-menu" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X /> : <Menu />}</button></div>
        </div>
        {menuOpen && <nav id="editorial-mobile-menu" className="editorial-mobile-menu" aria-label="Navegação móvel">{navigation.map(([label,id]) => <a key={id} href={`#${id}`} onClick={event => { event.preventDefault(); goTo(id); }}>{label}<ArrowUpRight /></a>)}<Link href="/login?signup=true" className="editorial-button editorial-button--blue">Criar minha conta <ArrowUpRight /></Link></nav>}
        <div className="editorial-scroll-progress" aria-hidden="true"><span style={{ width: `${progress}%` }} /></div>
      </header>
      <nav className="editorial-dots" aria-label="Navegação por seções" data-on-blue={[0,4,7].includes(active)}>{sections.map(([id,label],index) => <a key={id} href={`#${id}`} aria-label={label} aria-current={active === index ? "location" : undefined} onClick={event => { event.preventDefault(); goTo(id); }}><span className="editorial-dot-label">{label}</span><span /></a>)}</nav>
      <main>
        <section id="inicio" className="editorial-slide editorial-hero" aria-labelledby="editorial-title">
          <div className="editorial-hero-art" aria-hidden="true"><div className="editorial-yellow-bar" /><div className="editorial-yellow-loop" /><div className="editorial-green-dot" /><BrandMark /></div>
          <div className="editorial-hero-copy"><p className="editorial-eyebrow editorial-eyebrow--light">SEU OBJETIVO, COM DIREÇÃO</p><h1 id="editorial-title" tabIndex={-1}>Estude.<br />Avance.<br /><span>Conquiste.</span></h1><p className="editorial-hero-description">Aulas, questões e um plano para seguir. Do seu primeiro estudo ao próximo desafio.</p><div className="editorial-hero-actions"><Link href="/login?signup=true" className="editorial-button editorial-button--yellow">Criar minha conta <ArrowUpRight /></Link><a href="#metodo" className="editorial-hero-link" onClick={event => { event.preventDefault(); goTo("metodo"); }}>Como funciona <ArrowRight /></a></div><p className="editorial-hero-note"><Check />Comece com uma conta gratuita.</p></div>
          <div className="editorial-hero-visual"><div className="editorial-hero-photo"><Image src={photoPath("hero-portrait.webp")} alt="Retrato ilustrativo da apresentação da plataforma" width={1000} height={1500} sizes="(max-width: 700px) 90vw, 44vw" loading="eager" fetchPriority="high" /></div><div className="editorial-float-card"><span><BookOpen /></span><div><strong>Um próximo passo.</strong><p>Conteúdo. Prática. Revisão.</p></div></div><div className="editorial-hero-caption"><ShieldCheck />Seu estudo, em um só lugar.</div></div>
          <div className="editorial-hero-footer"><span>Norte Preparatórios</span><a href="#conteudo" onClick={event => { event.preventDefault(); goTo("conteudo"); }}>Conheça a plataforma <ArrowDown /></a></div>
        </section>

        <section id="conteudo" className="editorial-slide editorial-content" aria-labelledby="editorial-content-title">
          <div className="editorial-lesson-layout"><article className="editorial-lesson-intro"><p className="editorial-eyebrow editorial-eyebrow--light">APRENDER COM CLAREZA</p><h2 id="editorial-content-title">Boas aulas.<br />Novos caminhos.</h2><p>Conheça o conteúdo disponível e os professores que assinam cada curso.</p><Link href="/cursos" className="editorial-circle-link" aria-label="Explorar cursos"><ArrowRight /></Link></article>
            <div className="editorial-portraits">{publicFaculty.length > 0 ? publicFaculty.slice(0,3).map((teacher,index) => <Link key={teacher.name} href={teacher.courseHref} className={`editorial-portrait editorial-portrait--${["coral","green","yellow"][index]}`}><Image src={teacher.photo} alt={teacher.name} width={700} height={1050} sizes="(max-width: 700px) 85vw, 23vw" /><div className="editorial-portrait-label"><h3>{teacher.name}</h3><p>{teacher.specialty}</p><ArrowUpRight /></div></Link>) : learningCards.map(card => <Link key={card.title} href="/cursos" className={`editorial-portrait editorial-portrait--${card.color}`}><Image src={photoPath(card.photo)} alt={`Retrato ilustrativo: ${card.title.toLowerCase()}`} width={700} height={1050} sizes="(max-width: 700px) 85vw, 23vw" /><div className="editorial-portrait-label"><h3>{card.title}</h3><p>{card.description}</p><ArrowUpRight /></div></Link>)}</div>
          </div>{publicFaculty.length === 0 && <p className="editorial-photo-caption">Imagens ilustrativas. Conheça os professores e conteúdos apresentados em cada curso.</p>}
        </section>

        <section id="diferenciais" className="editorial-slide editorial-difference" aria-labelledby="editorial-difference-title"><div className="editorial-ring-art" aria-hidden="true" /><div className="editorial-split"><div className="editorial-section-copy"><p className="editorial-eyebrow">ESTUDO COM PROPÓSITO</p><h2 id="editorial-difference-title">Você sabe<br />o que fazer.<br /><span>E segue.</span></h2><p>Uma experiência que conecta o conteúdo à sua rotina. Mais clareza em cada sessão de estudo.</p><a href="#recursos" className="editorial-text-link" onClick={event => { event.preventDefault(); goTo("recursos"); }}>Conheça as ferramentas <ArrowUpRight /></a></div><div className="editorial-bento">{[
          { title: "Entenda", copy: "Aulas e materiais para construir sua base.", icon: BookOpen, color: "yellow" },
          { title: "Organize", copy: "Um plano que considera seu objetivo e seu tempo.", icon: CalendarDays, color: "green" },
          { title: "Pratique", copy: "Questões para transformar teoria em aprendizado.", icon: ClipboardList, color: "blue" },
          { title: "Evolua", copy: "Resultados reais para orientar o próximo passo.", icon: ChartNoAxesCombined, color: "coral" },
        ].map(item => <article key={item.title} className={`editorial-bento-card editorial-bento-card--${item.color}`}><item.icon /><h3>{item.title}</h3><p>{item.copy}</p></article>)}</div></div></section>

        <section id="preparacoes" className="editorial-slide editorial-preparations" aria-labelledby="editorial-preparations-title"><div className="editorial-split"><div className="editorial-section-copy"><p className="editorial-eyebrow">UM CAMINHO PARA CADA OBJETIVO</p><h2 id="editorial-preparations-title">A preparação<br />que faz sentido<br /><span>para você.</span></h2><p>ENEM, vestibulares, Medicina, OAB e concursos. Escolha o seu caminho e conheça uma experiência com a sua identidade.</p><Link href="/explorar" className="editorial-text-link">Explorar preparações <ArrowUpRight /></Link></div><div className="editorial-preparation-visual"><div className="editorial-track-photo"><Image src={photoPath("study-group.webp")} alt="Imagem ilustrativa de um grupo estudando em conjunto" width={1100} height={733} sizes="(max-width: 700px) 90vw, 49vw" /></div><div className="editorial-track-picker" aria-label="Conhecer as preparações">{tracks.map(track => <button type="button" key={track.id} aria-pressed={selected === track.id} aria-controls="editorial-track-overview" onClick={() => setSelected(track.id)} style={{ "--track-accent": getVerticalPalette(track.id,mode).primary } as CSSProperties}><Aicon name={track.icon} tone="outline" size={18} /><span>{track.title}</span>{selected === track.id ? <Check /> : <ArrowUpRight />}</button>)}</div><div id="editorial-track-overview" className="editorial-track-overview" data-vertical={selected} style={verticalThemeStyle(selected,mode)}><p className="editorial-eyebrow">{currentTheme.shortName}</p><h3>{tracks.find(track => track.id === selected)?.description}</h3><Link href="/login?signup=true">Começar minha preparação <ArrowUpRight /></Link></div><div className="editorial-preparation-dot" aria-hidden="true" /></div></div></section>

        <section id="recursos" className="editorial-slide editorial-resources" aria-labelledby="editorial-resources-title"><div className="editorial-resources-top"><div><p className="editorial-eyebrow editorial-eyebrow--light">TUDO SE CONECTA</p><h2 id="editorial-resources-title">Da aula à prática.<br />Do plano<br /><span>ao progresso.</span></h2><p>Seu estudo não precisa ficar espalhado.</p><BrandMark /></div><div className="editorial-resources-photo"><Image src={photoPath("study-online.webp")} alt="Imagem ilustrativa de uma sessão de aprendizagem online" width={900} height={600} sizes="(max-width: 700px) 90vw, 45vw" /><span className="editorial-photo-pill">Seu ritmo. Seu próximo passo.</span></div></div><div className="editorial-resource-grid">{features.map((feature,index) => <article key={feature.title}><span className="editorial-resource-number">0{index+1}</span>{index === 3 ? <Aicon name="target" tone="outline" size={20} /> : <feature.icon className="editorial-resource-icon" />}<h3>{feature.title}</h3><p>{feature.copy}</p></article>)}</div></section>

        <section id="metodo" className="editorial-slide editorial-method" aria-labelledby="editorial-method-title"><div className="editorial-split"><div className="editorial-section-copy"><p className="editorial-eyebrow">COMEÇAR PODE SER SIMPLES</p><h2 id="editorial-method-title">Um objetivo.<br />Um plano.<br /><span>Seu caminho.</span></h2><div className="editorial-method-photo"><Image src={photoPath("study-campus.webp")} alt="Imagem ilustrativa de estudantes compartilhando uma rotina de aprendizagem" width={1100} height={733} sizes="(max-width: 700px) 85vw, 38vw" /><p>Clareza para estudar.<br />Direção para seguir.</p></div></div><ol className="editorial-steps">{[
          ["Escolha seu objetivo", "Crie sua conta e selecione a preparação que faz sentido para você."],
          ["Organize sua rotina", "Defina seu tempo e use o plano para orientar o estudo de cada dia."],
          ["Pratique e acompanhe", "Aprenda, responda, revise. Use seus resultados para ajustar o caminho."],
        ].map(([title,copy],index) => <li key={title}><span>0{index+1}</span><div><h3>{title}</h3><p>{copy}</p></div></li>)}<li className="editorial-steps-cta"><Link href="/login?signup=true" className="editorial-button editorial-button--blue">Dar o primeiro passo <ArrowUpRight /></Link></li></ol></div></section>

        <section id="acesso" className="editorial-slide editorial-access" aria-labelledby="editorial-access-title"><div className="editorial-split"><div className="editorial-section-copy"><p className="editorial-eyebrow">CLAREZA DESDE O COMEÇO</p><h2 id="editorial-access-title">Conheça.<br />Experimente.<br /><span>Escolha.</span></h2><div className="editorial-access-note"><ShieldCheck /><div><h3>Uma conta para começar.</h3><p>Crie sua conta gratuitamente. Cursos oficiais são adquiridos individualmente, com os conteúdos incluídos apresentados antes da compra.</p></div></div><Link href="/login?signup=true" className="editorial-button editorial-button--blue">Conhecer o Norte Preparatórios <ArrowUpRight /></Link></div><div className="editorial-faq">{faq.map(([question,answer]) => <details key={question}><summary>{question}<ChevronDown /></summary><p>{answer}</p></details>)}<p className="editorial-faq-note">Seu resultado depende da sua prática, da preparação e das exigências de cada prova.</p></div></div></section>

        <section id="comece" className="editorial-slide editorial-final" aria-labelledby="editorial-final-title"><div className="editorial-final-art" aria-hidden="true"><BrandMark /><div /></div><p className="editorial-eyebrow editorial-eyebrow--light">NORTE PREPARATÓRIOS</p><div className="editorial-final-copy"><h2 id="editorial-final-title">Seu próximo<br />capítulo<br /><span>começa aqui.</span></h2><Link href="/login?signup=true" className="editorial-button editorial-button--yellow">Começar agora <ArrowUpRight /></Link></div><footer className="editorial-footer"><Brand href="/" light className="estudaki-brand--sm" /><div><p>Um próximo passo. Todos os dias.</p><span>© {new Date().getFullYear()} Norte Preparatórios.</span></div><nav aria-label="Navegação do rodapé"><Link href="/login">Minha conta <ArrowUpRight /></Link><Link href="/cursos">Conhecer cursos <ArrowUpRight /></Link><a href="#inicio" onClick={event => { event.preventDefault(); goTo("inicio"); }}>Voltar ao início <ArrowUpRight /></a></nav></footer></section>
      </main>
    </div>
  </div>;
}
