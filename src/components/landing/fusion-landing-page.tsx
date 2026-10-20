"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { ArrowDown, ArrowRight, ArrowUpRight, Minus, Plus } from "lucide-react";
import { BrandMark } from "@/components/brand";
import { getVerticalPalette, type StudyVertical } from "@/config/vertical-themes";
import styles from "./fusion-landing.module.css";

const experience = [
  { title: "A aula.", detail: "O assunto, por inteiro.", copy: "Encontre as aulas por matéria e assunto. Volte ao trecho que precisa de atenção e consulte o material de apoio." },
  { title: "A questão.", detail: "O conhecimento em movimento.", copy: "Responda, confira a resolução e descubra onde sua compreensão precisa de mais prática." },
  { title: "A revisão.", detail: "O que fica com você.", copy: "Retome os erros, revise os assuntos e acompanhe os resultados das suas atividades." },
];
const preparations: { id: StudyVertical; label: string; title: string; copy: string; subjects: string }[] = [
  { id: "vestibular", label: "ENEM & vestibulares", title: "Da base\nà universidade.", copy: "Linguagens, exatas, natureza, humanas e redação. Uma preparação que conecta as áreas da sua prova.", subjects: "ENEM · FUVEST · UNESP · UNICAMP" },
  { id: "medicina", label: "Medicina", title: "Profundidade\nem cada assunto.", copy: "As áreas do vestibular com atenção à preparação para Medicina. Conteúdo, prática e revisão no mesmo espaço.", subjects: "BIOLOGIA · QUÍMICA · FÍSICA · REDAÇÃO" },
  { id: "oab", label: "OAB & Direito", title: "O Direito.\nNa prática.", copy: "Estudo por disciplina, questões e revisão da legislação. Um ambiente com o tom da sua preparação jurídica.", subjects: "ÉTICA · CONSTITUCIONAL · CIVIL · PENAL" },
  { id: "concursos", label: "Concursos", title: "O próximo cargo\npede direção.", copy: "Organize as disciplinas do seu objetivo e use a prática para acompanhar o que ainda precisa estudar.", subjects: "PORTUGUÊS · RACIOCÍNIO LÓGICO · DIREITO" },
  { id: "policia-militar", label: "Carreiras policiais", title: "Disciplina\ntambém é método.", copy: "Conhecimentos básicos, Direito e legislação específica. Sua preparação organizada por assunto.", subjects: "LEGISLAÇÃO · DIREITO · CONHECIMENTOS BÁSICOS" },
];

function EntryLink({ inverted = false }: { inverted?: boolean }) {
  return <Link href="/login" className={`${styles.entry} ${inverted ? styles.entryInverted : ""}`}>
    <span>Entrar</span><span className={styles.entryArrow} aria-hidden="true"><ArrowUpRight /></span>
  </Link>;
}

export function FusionLandingPage() {
  const root = useRef<HTMLDivElement>(null);
  const [pastHero, setPastHero] = useState(false);
  const [openExperience, setOpenExperience] = useState(0);
  const [selected, setSelected] = useState<StudyVertical>("vestibular");
  const preparation = preparations.find(item => item.id === selected)!;
  const palette = getVerticalPalette(selected, "light");

  useEffect(() => {
    const page = root.current;
    if (!page) return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    let observer: IntersectionObserver | undefined;
    const enhance = () => {
      observer?.disconnect();
      if (media.matches || !("IntersectionObserver" in window)) {
        delete page.dataset.enhanced;
        return;
      }
      page.dataset.enhanced = "true";
      observer = new IntersectionObserver(entries => {
        for (const entry of entries) if (entry.isIntersecting) {
          (entry.target as HTMLElement).dataset.revealed = "true";
          observer?.unobserve(entry.target);
        }
      }, { threshold: 0 });
      page.querySelectorAll<HTMLElement>("[data-reveal]").forEach(element => observer?.observe(element));
    };
    enhance();
    media.addEventListener("change", enhance);
    let frame = 0;
    const update = () => {
      frame = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      page.style.setProperty("--reading-progress", `${max > 0 ? Math.min(100, window.scrollY / max * 100) : 0}%`);
      const passed = window.scrollY > window.innerHeight * .72;
      if (page.dataset.pastHero !== String(passed)) {
        page.dataset.pastHero = String(passed);
        setPastHero(passed);
      }
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    schedule();
    return () => {
      observer?.disconnect();
      media.removeEventListener("change", enhance);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      cancelAnimationFrame(frame);
    };
  }, []);

  return <div ref={root} className={styles.root} data-fusion-landing>
    <a href="#experiencia" className={styles.skip}>Ir para o conteúdo</a>
    <div className={styles.readingProgress} aria-hidden="true" />
    <nav className={styles.floatingNav} aria-label="Navegação da página" inert={!pastHero || undefined} aria-hidden={!pastHero || undefined}>
      <a href="#inicio" aria-label="Norte Preparatórios, voltar ao início"><BrandMark /></a>
      <a href="#preparacoes">Preparações</a>
      <Link href="/login">Entrar <ArrowUpRight aria-hidden="true" /></Link>
    </nav>
    <main>
      <section id="inicio" className={styles.hero} aria-labelledby="signature-title">
        <header className={styles.topline}>
          <span className={styles.imprint}><span /> NORTE PREPARATÓRIOS</span>
          <a href="#conteudo">Conheça o Norte Preparatórios <ArrowDown aria-hidden="true" /></a>
        </header>
        <div className={styles.heroCenter}>
          <h1 id="signature-title" className={styles.heroBrand}>
            <BrandMark className={styles.heroMark} />
            <span className={styles.heroWord}>Norte<span className={styles.heroSubtitle}>PREPARATÓRIOS</span></span>
          </h1>
          <div className={styles.heroEntry}><EntryLink /></div>
          <Link href="/login?signup=true" className={styles.firstAccess}>Primeiro acesso? <span>Crie sua conta.</span></Link>
        </div>
        <div className={styles.heroBaseline}>
          <span>ENEM / MEDICINA / OAB / CONCURSOS</span>
          <a href="#conteudo" className={styles.explore}>Continue <span><ArrowDown aria-hidden="true" /></span></a>
        </div>
        <div className={styles.horizon} aria-hidden="true" />
      </section>

      <section id="conteudo" className={styles.editorial} tabIndex={-1} aria-labelledby="editorial-title">
        <div className={styles.sectionLabel} data-reveal><span>01 / CONTEÚDO & PRÁTICA</span><span>NORTE PREPARATÓRIOS, POR DENTRO.</span></div>
        <div className={styles.editorialStage} data-reveal>
          <div className={styles.editorialCopy}>
            <p className={styles.editorialEyebrow}>UM ASSUNTO. NOVAS CONEXÕES.</p>
            <h2 id="editorial-title">Da aula<br />à <span>prática.</span></h2>
            <p>Aprenda o assunto. Teste o que sabe.<br />Retome o que precisa de atenção.</p>
            <Link href="/cursos" className={styles.editorialLink}>Conhecer as aulas <span><ArrowUpRight aria-hidden="true" /></span></Link>
            <BrandMark className={styles.editorialCopyMark} />
          </div>
          <div className={styles.editorialPhoto}>
            <Image src="/assets/landing-editorial/study-group.webp" alt="Imagem ilustrativa de estudantes compartilhando uma sessão de estudo" width={1100} height={733} sizes="(max-width: 760px) 90vw, 53vw" />
            <span className={styles.photoSignature} aria-hidden="true"><BrandMark /></span>
          </div>
          <div className={styles.editorialLoop} aria-hidden="true" />
        </div>
        <div className={styles.editorialCaption}><span>CONTEÚDO. PRÁTICA. REVISÃO.</span><span>Imagens ilustrativas.</span></div>
      </section>

      <section id="experiencia" className={styles.experience} tabIndex={-1} aria-labelledby="experience-title">
        <div className={styles.sectionLabel} data-reveal><span>02 / A EXPERIÊNCIA</span><span>APRENDER É CONECTAR.</span></div>
        <div className={styles.experienceLayout}>
          <div className={styles.connection} data-reveal>
            <h2 id="experience-title">Entender.<br /><span className={styles.connectionSecond}><BrandMark /><span className={styles.screenReader}>&amp; </span>resolver.</span></h2>
            <p>A aula encontra a questão.<br />A questão mostra o que revisar.</p>
            <Link href="/cursos" className={styles.textLink}>Conhecer os cursos <ArrowUpRight aria-hidden="true" /></Link>
          </div>
          <div className={styles.experienceList} data-reveal>
            <div className={styles.experiencePhoto}>
              <Image src="/assets/landing-editorial/study-online.webp" alt="Imagem ilustrativa de uma sessão de aprendizagem com apoio digital" width={900} height={600} sizes="(max-width: 760px) 90vw, 41vw" />
              <span>Aula <span>&</span> prática.</span>
            </div>
            {experience.map((item, index) => <article key={item.title} className={styles.experienceItem} data-open={openExperience === index}>
              <h3><button type="button" aria-expanded={openExperience === index} aria-controls={`experience-panel-${index}`} onClick={() => setOpenExperience(openExperience === index ? -1 : index)}>
                <span className={styles.itemNumber}>0{index + 1}</span><span>{item.title}</span>{openExperience === index ? <Minus aria-hidden="true" /> : <Plus aria-hidden="true" />}
              </button></h3>
              <div id={`experience-panel-${index}`} hidden={openExperience !== index} className={styles.experiencePanel}>
                <p className={styles.itemDetail}>{item.detail}</p><p>{item.copy}</p>
              </div>
            </article>)}
          </div>
        </div>
      </section>

      <section id="preparacoes" className={styles.preparations} tabIndex={-1} aria-labelledby="preparations-title" style={{ "--preparation-ink": palette.primary, "--preparation-wash": palette.surfaceAlt } as CSSProperties}>
        <div className={styles.sectionLabel} data-reveal><span>03 / AS PREPARAÇÕES</span><span>A MESMA MARCA. OUTRO TOM.</span></div>
        <div className={styles.preparationsHeader} data-reveal><h2 id="preparations-title">O seu objetivo<br />muda o tom.</h2><p>Escolha uma área.<br />Veja o Norte Preparatórios na sua preparação.</p></div>
        <div className={styles.preparationsLayout} data-reveal>
          <div className={styles.preparationChoices} aria-label="Prévia das preparações">
            {preparations.map((item, index) => <button key={item.id} type="button" aria-pressed={selected === item.id} aria-controls="signature-preparation-preview" onClick={() => setSelected(item.id)} style={{ "--item-accent": getVerticalPalette(item.id, "light").primary } as CSSProperties}>
              <span className={styles.itemNumber}>0{index + 1}</span><span>{item.label}</span><ArrowUpRight aria-hidden="true" />
            </button>)}
          </div>
          <div id="signature-preparation-preview" className={styles.preparationPreview} data-selected={selected}>
            <div className={styles.preparationPhoto}>
              <Image src="/assets/landing-editorial/study-campus.webp" alt="Imagem ilustrativa de estudantes em um ambiente de aprendizagem" width={1100} height={733} sizes="(max-width: 760px) 90vw, 42vw" />
              <span className={styles.preparationPhotoMark} aria-hidden="true"><BrandMark /></span>
            </div>
            <div className={styles.previewMark} aria-hidden="true"><BrandMark /></div>
            <div className={styles.previewText} key={selected}>
              <p className={styles.previewEyebrow}>{preparation.label}</p>
              <h3>{preparation.title}</h3><p className={styles.previewDescription}>{preparation.copy}</p>
              <p className={styles.previewSubjects}>{preparation.subjects}</p>
            </div>
            <Link href="/login?redirect=%2Fexplorar" className={styles.previewLink}>Conhecer preparatórios <ArrowUpRight aria-hidden="true" /></Link>
          </div>
        </div>
        <p className={styles.preparationsNote}>Na sua conta, você escolhe a preparação e consulta os cursos disponíveis.</p>
      </section>

      <section id="acesso" className={styles.access} tabIndex={-1} aria-labelledby="access-title">
        <div className={styles.sectionLabel} data-reveal><span>04 / O SEU ESPAÇO</span><BrandMark /></div>
        <div className={styles.accessCenter} data-reveal>
          <h2 id="access-title">Seu estudo.<br /><span>Tem Norte.</span></h2>
          <EntryLink inverted />
          <Link href="/login?signup=true" className={styles.accessSignup}>Ainda não tem conta? <span>Crie a sua <ArrowRight aria-hidden="true" /></span></Link>
        </div>
        <footer className={styles.footer}>
          <p>Conta gratuita. Cursos completos adquiridos separadamente.</p>
          <div><span>© {new Date().getFullYear()} Norte Preparatórios</span><a href="#inicio">Voltar ao início <ArrowUpRight aria-hidden="true" /></a></div>
        </footer>
        <BrandMark className={styles.accessWatermark} />
      </section>
    </main>
  </div>;
}
