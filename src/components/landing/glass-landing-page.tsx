"use client";

import Image from "next/image";
import { FastLink as Link } from "@/components/fast-link";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { ArrowDown, ArrowRight, ArrowUpRight, BookOpen, Moon, Pause, Play, Sun } from "lucide-react";
import { Brand, BrandMark } from "@/components/brand";
import { useProductAppearance } from "@/components/use-product-appearance";
import { getVerticalPalette, type StudyVertical } from "@/config/vertical-themes";
import styles from "./glass-landing.module.css";

const preparations: { id: StudyVertical; label: string; title: string; copy: string; subjects: string }[] = [
  { id: "vestibular", label: "ENEM & vestibulares", title: "Da base\nà universidade.", copy: "Linguagens, exatas, natureza, humanas e redação. Uma preparação que conecta as áreas da sua prova.", subjects: "ENEM · FUVEST · UNESP · UNICAMP" },
  { id: "medicina", label: "Medicina", title: "Profundidade\nem cada assunto.", copy: "As áreas do vestibular com atenção à preparação para Medicina. Conteúdo, prática e revisão no mesmo espaço.", subjects: "BIOLOGIA · QUÍMICA · FÍSICA · REDAÇÃO" },
  { id: "oab", label: "OAB & Direito", title: "O Direito.\nNa prática.", copy: "Estudo por disciplina, questões e revisão da legislação. Um ambiente com o tom da sua preparação jurídica.", subjects: "ÉTICA · CONSTITUCIONAL · CIVIL · PENAL" },
  { id: "concursos", label: "Concursos", title: "O próximo cargo\npede direção.", copy: "Organize as disciplinas do seu objetivo e use a prática para acompanhar o que ainda precisa estudar.", subjects: "PORTUGUÊS · RACIOCÍNIO LÓGICO · DIREITO" },
  { id: "policia-militar", label: "Carreiras policiais", title: "Disciplina\ntambém é método.", copy: "Conhecimentos básicos, Direito e legislação específica. Sua preparação organizada por assunto.", subjects: "LEGISLAÇÃO · DIREITO · CONHECIMENTOS BÁSICOS" },
];

const learning = [
  { label: "Entenda", title: "A aula abre o assunto.", copy: "Encontre as aulas por matéria, volte ao trecho que precisa de atenção e consulte o material de apoio.", photo: "study-group.webp", alt: "Imagem ilustrativa de estudantes compartilhando uma sessão de estudo" },
  { label: "Pratique", title: "A questão muda o olhar.", copy: "Teste o que sabe, confira a resolução e descubra onde sua compreensão precisa de mais prática.", photo: "study-online.webp", alt: "Imagem ilustrativa de uma sessão de aprendizagem com apoio digital" },
  { label: "Revise", title: "O aprendizado continua.", copy: "Retome os erros, revise os assuntos e acompanhe os resultados das suas atividades.", photo: "study-campus.webp", alt: "Imagem ilustrativa de estudantes em um ambiente de aprendizagem" },
];

function Entry({ light = false }: { light?: boolean }) {
  return <Link href="/login" className={`${styles.entry} ${light ? styles.entryLight : ""}`}><span>Entrar</span><span><ArrowUpRight aria-hidden="true" /></span></Link>;
}

export function GlassLandingPage() {
  const root = useRef<HTMLDivElement>(null);
  const { mode, toggleMode } = useProductAppearance();
  const [paused, setPaused] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeLesson, setActiveLesson] = useState(0);
  const [selected, setSelected] = useState<StudyVertical>("vestibular");
  const lesson = learning[activeLesson];
  const preparation = preparations.find(item => item.id === selected)!;
  const palette = getVerticalPalette(selected, mode);

  useEffect(() => {
    const page = root.current;
    if (!page) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const desktop = window.matchMedia("(min-width: 900px)");
    let observer: IntersectionObserver | undefined;
    let frame = 0;
    const configure = () => {
      observer?.disconnect();
      page.dataset.motionOff = String(paused || reduced.matches);
      if (paused || reduced.matches || !("IntersectionObserver" in window)) delete page.dataset.enhanced;
      else {
        page.dataset.enhanced = "true";
        observer = new IntersectionObserver(entries => {
          for (const entry of entries) if (entry.isIntersecting) {
            (entry.target as HTMLElement).dataset.revealed = "true";
            observer?.unobserve(entry.target);
          }
        }, { threshold: 0 });
        page.querySelectorAll<HTMLElement>("[data-reveal]").forEach(element => observer?.observe(element));
      }
      schedule();
    };
    const update = () => {
      frame = 0;
      const max = document.documentElement.scrollHeight - innerHeight;
      page.style.setProperty("--reading-progress", `${max > 0 ? Math.min(100, scrollY / max * 100) : 0}%`);
      const passed = scrollY > innerHeight * .6;
      if (page.dataset.scrolled !== String(passed)) { page.dataset.scrolled = String(passed); setScrolled(passed); }
      const canMove = !paused && !reduced.matches && desktop.matches;
      page.style.setProperty("--hero-shift", `${canMove ? Math.min(100, scrollY * .13) : 0}px`);
      page.querySelectorAll<HTMLElement>("[data-parallax]").forEach(element => {
        const bounds = element.getBoundingClientRect();
        if (!canMove) element.style.setProperty("--photo-shift", "0px");
        else if (bounds.bottom > 0 && bounds.top < innerHeight) element.style.setProperty("--photo-shift", `${Math.max(-24, Math.min(24, (innerHeight * .5 - bounds.top - bounds.height * .5) * .07))}px`);
      });
    };
    function schedule() { if (!frame) frame = requestAnimationFrame(update); }
    configure();
    reduced.addEventListener("change", configure);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => { observer?.disconnect(); cancelAnimationFrame(frame); reduced.removeEventListener("change", configure); window.removeEventListener("scroll", schedule); window.removeEventListener("resize", schedule); };
  }, [paused]);

  return <div ref={root} className={styles.root} data-glass-landing data-theme-mode={mode}>
    <a href="#conteudo" className={styles.skip}>Ir para o conteúdo</a>
    <div className={styles.progress} aria-hidden="true" />
    <nav className={styles.dock} aria-label="Navegação da página" inert={!scrolled || undefined} aria-hidden={!scrolled || undefined}>
      <a href="#inicio" aria-label="Norte Preparatórios, voltar ao início"><BrandMark /></a><a href="#conteudo">A experiência</a><a href="#preparacoes">Preparações</a><Link href="/login">Entrar <ArrowUpRight aria-hidden="true" /></Link>
    </nav>
    <main>
      <section id="inicio" className={styles.hero} aria-labelledby="glass-title">
        <header className={styles.header}>
          <Brand href="#inicio" light />
          <nav className={styles.headerNav} aria-label="Navegação principal"><a href="#conteudo">A experiência</a><a href="#preparacoes">Preparações</a></nav>
          <button className={styles.themeButton} type="button" onClick={toggleMode} aria-label={mode === "dark" ? "Ativar modo claro" : "Ativar modo escuro"} title={mode === "dark" ? "Modo claro" : "Modo escuro"}>{mode === "dark" ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}</button>
          <button className={styles.motionButton} type="button" aria-label={paused ? "Ativar animações" : "Pausar animações"} aria-pressed={paused} onClick={() => setPaused(!paused)}>{paused ? <Play aria-hidden="true" /> : <Pause aria-hidden="true" />}</button>
        </header>
        <div className={styles.heroBody}>
          <p className={styles.heroEyebrow}><span /> AULAS. QUESTÕES. NOVAS CONEXÕES.</p>
          <div className={styles.titleStage}>
            <h1 id="glass-title">Seu futuro.<span>Tem Norte.</span></h1>
            <div className={styles.heroScene}>
              <BrandMark className={styles.sceneMark} />
              <Link href="/cursos" className={styles.glassTile} aria-label="Conhecer as aulas e os cursos do Norte Preparatórios"><BrandMark /><span>AULAS <span>&</span> PRÁTICA</span><ArrowUpRight aria-hidden="true" /></Link>
              <span className={styles.redSeal} aria-hidden="true"><BookOpen /></span>
            </div>
          </div>
          <div className={styles.heroActions}><Entry /><Link href="/login?signup=true" className={styles.signup}>Primeiro acesso? <span>Crie sua conta.</span></Link></div>
        </div>
        <div className={styles.heroBottom}><span>NORTE PREPARATÓRIOS</span><a href="#conteudo">Conheça seu espaço <ArrowDown aria-hidden="true" /></a></div>
        <div className={styles.heroGrid} aria-hidden="true" />
        <div className={styles.heroOrbit} aria-hidden="true" />
      </section>

      <div className={styles.ribbon} aria-label="Preparações para ENEM, Medicina, OAB e concursos"><div className={styles.ribbonTrack} aria-hidden="true">{[0,1,2].map(index => <span key={index}>ENEM <BrandMark /> MEDICINA <BrandMark /> OAB <BrandMark /> CONCURSOS <BrandMark /></span>)}</div></div>

      <section id="conteudo" className={styles.content} tabIndex={-1} aria-labelledby="content-title">
        <div className={styles.sectionLabel} data-reveal><span>01 / A EXPERIÊNCIA</span><span>UMA AULA É SÓ O COMEÇO.</span></div>
        <div className={styles.sectionHeading} data-reveal><h2 id="content-title">Entender.<br /><span><BrandMark /><span className={styles.srOnly}>&amp; </span>resolver.</span></h2><p>A aula encontra a questão.<br />A questão mostra o que revisar.</p></div>
        <div className={styles.learningStage} data-reveal>
          <div className={styles.learningPhoto} data-parallax><Image key={lesson.photo} src={`/assets/landing-editorial/${lesson.photo}`} alt={lesson.alt} width={1100} height={733} sizes="(max-width: 760px) 90vw, 52vw" /><span className={styles.photoTag}>NORTE PREPARATÓRIOS <span>EM MOVIMENTO.</span></span></div>
          <div className={styles.learningPanel}>
            <div className={styles.learningTabs} aria-label="Conhecer o método de estudo">{learning.map((item,index) => <button key={item.label} type="button" aria-pressed={activeLesson === index} aria-controls="glass-learning-detail" onClick={() => setActiveLesson(index)}>{item.label}</button>)}</div>
            <div id="glass-learning-detail" key={lesson.label} className={styles.learningDetail}><span className={styles.lessonNumber}>0{activeLesson+1}<span>/ 03</span></span><h3>{lesson.title}</h3><p>{lesson.copy}</p></div>
            <Link href="/cursos" className={styles.textLink}>Conhecer os cursos <ArrowUpRight aria-hidden="true" /></Link>
            <span className={styles.learningBadge} aria-hidden="true"><BrandMark /></span>
          </div>
        </div>
        <p className={styles.photoCaption}>Imagens ilustrativas. Explore os conteúdos disponíveis em cada curso.</p>
      </section>

      <section id="conexoes" className={styles.connections} tabIndex={-1} aria-labelledby="connections-title">
        <div className={styles.sectionLabel} data-reveal><span>02 / MAIS CONEXÕES</span><span>CONTEÚDO & PRÁTICA & REVISÃO.</span></div>
        <div className={styles.quoteStage} data-reveal><BrandMark className={styles.quoteMark} /><div className={styles.quoteGlass}><p>NORTE PREPARATÓRIOS É SOBRE CONECTAR.</p><h2 id="connections-title">O que você aprende.<br /><span>O que você faz<br />com isso.</span></h2><a href="#preparacoes">Encontre sua preparação <ArrowUpRight aria-hidden="true" /></a></div><span className={styles.quoteSeal} aria-hidden="true">&</span></div>
      </section>

      <section id="preparacoes" className={styles.preparations} tabIndex={-1} aria-labelledby="preparations-title" style={{ "--preparation-ink": palette.primary, "--preparation-wash": palette.surfaceAlt } as CSSProperties}>
        <div className={styles.sectionLabel} data-reveal><span>03 / SEU OBJETIVO</span><span>A MESMA MARCA. OUTRO TOM.</span></div>
        <div className={styles.sectionHeading} data-reveal><h2 id="preparations-title">Escolha<br /><span className={styles.blueText}>o seu caminho.</span></h2><p>Uma experiência para cada preparação.<br />Norte acompanha o seu próximo passo.</p></div>
        <div className={styles.preparationChoices} aria-label="Prévia das preparações" data-reveal>{preparations.map(item => <button key={item.id} type="button" aria-pressed={selected === item.id} aria-controls="glass-preparation-preview" onClick={() => setSelected(item.id)} style={{ "--item-ink": getVerticalPalette(item.id,"light").primary } as CSSProperties}><span />{item.label}</button>)}</div>
        <div id="glass-preparation-preview" className={styles.preparationStage} data-selected={selected} data-reveal>
          <div className={styles.preparationPhoto} data-parallax><Image src="/assets/landing-editorial/study-campus.webp" alt="Imagem ilustrativa de estudantes em uma biblioteca" width={1100} height={733} sizes="(max-width: 760px) 90vw, 46vw" /><span><BrandMark /></span></div>
          <div className={styles.preparationPanel}><div key={selected} className={styles.preparationDetail}><p className={styles.preparationEyebrow}>{preparation.label}</p><h3>{preparation.title}</h3><p>{preparation.copy}</p><span className={styles.subjects}>{preparation.subjects}</span></div><Link href="/login?redirect=%2Fexplorar" className={styles.textLink}>Conhecer preparatórios <ArrowUpRight aria-hidden="true" /></Link><BrandMark className={styles.preparationMark} /></div>
        </div>
        <p className={styles.photoCaption}>Na sua conta, escolha a preparação e consulte os cursos disponíveis.</p>
      </section>

      <section id="acesso" className={styles.access} tabIndex={-1} aria-labelledby="access-title">
        <div className={styles.sectionLabel} data-reveal><span>04 / O SEU ESPAÇO</span><BrandMark /></div>
        <div className={styles.accessBody} data-reveal><p>O PRÓXIMO PASSO ESTÁ AQUI.</p><h2 id="access-title">Seu estudo.<br /><span>Tem Norte.</span></h2><Entry light /><Link href="/login?signup=true" className={styles.signup}>Ainda não tem conta? <span>Crie a sua <ArrowRight aria-hidden="true" /></span></Link></div>
        <footer className={styles.footer}><p>Conta gratuita. Cursos completos adquiridos separadamente.</p><div><Brand href="#inicio" light /><span>© {new Date().getFullYear()} Norte Preparatórios</span><a href="#inicio">Voltar ao início <ArrowUpRight aria-hidden="true" /></a></div></footer>
        <BrandMark className={styles.accessMark} />
      </section>
    </main>
  </div>;
}
