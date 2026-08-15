"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import {
  ArrowUpRight,
  BookOpen,
  Check,
  CreditCard,
  Flame,
  GraduationCap,
  Home,
  Library,
  LifeBuoy,
  ListChecks,
  LogIn,
  Menu,
  Minus,
  Play,
  Plus,
  Timer,
  X,
} from "lucide-react";

const asset = (name: string) => `/landing-cloud/assets/${name}`;

type NavItem = {
  label: string;
  href: string;
  icon: ReactNode;
};

const navItems: NavItem[] = [
  { label: "Início", href: "#inicio", icon: <Home /> },
  { label: "Questões", href: "#recursos", icon: <ListChecks /> },
  { label: "Matérias", href: "#materias", icon: <BookOpen /> },
  { label: "Vestibulares", href: "#vestibulares", icon: <GraduationCap /> },
  { label: "Biblioteca", href: "#recursos", icon: <Library /> },
  { label: "Simulados", href: "#resultados", icon: <Timer /> },
  { label: "Materiais", href: "/materials", icon: <BookOpen /> },
  { label: "Planos", href: "#planos", icon: <CreditCard /> },
  { label: "Ajuda", href: "#duvidas", icon: <LifeBuoy /> },
];

const footerNavItems = [
  { label: "Método", href: "#metodo" },
  { label: "Recursos", href: "#recursos" },
  { label: "Resultados", href: "#resultados" },
  { label: "Dúvidas", href: "#duvidas" },
];

const subjects = [
  {
    title: "Matemática",
    copy: "Resolução, prática orientada e evolução por habilidade.",
    icon: "math-icon.png",
  },
  {
    title: "Biologia",
    copy: "Conteúdos essenciais, revisões rápidas e interpretação de temas.",
    icon: "biologia-icon.png",
  },
  {
    title: "Física",
    copy: "Conceitos, fórmulas e listas para destravar os exercícios.",
    icon: "fisica-icon.png",
  },
  {
    title: "Química",
    copy: "Estude teoria, aplicação prática e análise de questões.",
    icon: "quimica-icon.png",
  },
  {
    title: "Geografia",
    copy: "Atualidades, mapas, espaço geográfico e leitura de dados.",
    icon: "geography-icon.png",
  },
  {
    title: "Ciências Humanas",
    copy: "História, filosofia e sociologia com organização clara.",
    icon: "humanas-icon.png",
  },
  {
    title: "Linguagens",
    copy: "Leitura, interpretação, gramática e análise textual.",
    icon: "linguagens-icon.png",
  },
  {
    title: "Redação",
    copy: "Treino por competências, repertório e estrutura de texto.",
    icon: "redacao-icon.png",
  },
];

const resources = [
  {
    number: "01",
    tag: "Rotina",
    title: "Plano de estudos inteligente",
    copy: "Metas objetivas, revisão espaçada e prioridade baseada na sua evolução.",
  },
  {
    number: "02",
    tag: "Prática",
    title: "Banco de questões completo",
    copy: "Filtros por prova, matéria, conteúdo, dificuldade e desempenho.",
  },
  {
    number: "03",
    tag: "Redação",
    title: "Evolução competência por competência",
    copy: "Feedback claro para transformar cada correção em um próximo passo.",
  },
];

const faqs = [
  {
    question: "A plataforma serve apenas para o ENEM?",
    answer:
      "Não. O EstudAki também organiza conteúdos e questões para ETEC, FATEC, FUVEST, UNESP, UNICAMP e Provão Paulista.",
  },
  {
    question: "Consigo montar uma rotina personalizada?",
    answer:
      "Sim. Você define seus objetivos, disponibilidade e matérias prioritárias para receber uma trilha adaptada à sua rotina.",
  },
  {
    question: "Posso acompanhar meu desempenho?",
    answer:
      "Sim. O painel mostra acertos, evolução por matéria, constância, tarefas realizadas e pontos que precisam de revisão.",
  },
  {
    question: "Funciona no celular?",
    answer:
      "Sim. A landing page e a plataforma foram pensadas para funcionar bem em computador, tablet e celular.",
  },
];

const testimonials = [
  {
    initials: "ML",
    name: "Marina L.",
    meta: "3º ano • ENEM",
    quote:
      "Antes eu estudava muito e não sabia se estava avançando. Com o plano, finalmente consigo enxergar minha semana.",
  },
  {
    initials: "RC",
    name: "Rafael C.",
    meta: "FATEC • Desenvolvimento",
    quote:
      "O banco de questões por conteúdo mudou minha revisão. Parei de repetir o que já sabia e comecei a atacar meus erros.",
    featured: true,
  },
  {
    initials: "AS",
    name: "Ana S.",
    meta: "ENEM • Medicina",
    quote:
      "Minha redação saiu de 720 para 900 porque o feedback mostrou exatamente qual competência eu precisava melhorar.",
  },
];

function CtaArrow() {
  return (
    <span className="round-arrow" aria-hidden="true">
      <ArrowUpRight />
    </span>
  );
}

export function CloudLandingPage({ className = "" }: { className?: string }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState(0);

  const closeMenu = () => setMenuOpen(false);

  function renderNavItem(item: NavItem, className: string, onClick?: () => void) {
    const content = (
      <>
        <span className="nav-icon" aria-hidden="true">
          {item.icon}
        </span>
        <span>{item.label}</span>
      </>
    );

    if (item.href.startsWith("/")) {
      return (
        <Link key={item.label} href={item.href} className={className} onClick={onClick}>
          {content}
        </Link>
      );
    }

    return (
      <a key={item.label} href={item.href} className={className} onClick={onClick}>
        {content}
      </a>
    );
  }

  return (
    <div className={`cloud-landing ${className}`}>
      <header className="cloud-pill-header" id="top">
        <nav className="cloud-pill-nav" aria-label="Navegação principal">
          <a className="cloud-pill-brand" href="#inicio" aria-label="EstudAki - voltar ao início">
            <Image
              src="/brand/estudaki-logo.png"
              alt="EstudAki Vestibulares"
              width={180}
              height={56}
              priority
            />
          </a>

          <div className="cloud-pill-links">
            {navItems.map((item) => renderNavItem(item, "cloud-pill-link"))}
          </div>

          <Link className="cloud-pill-cta" href="/login?signup=true">
            <LogIn aria-hidden="true" />
            <span>Entrar grátis</span>
          </Link>

          <button
            className="cloud-pill-menu-button"
            type="button"
            aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((current) => !current)}
          >
            {menuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
          </button>
        </nav>

        <div className={`cloud-mobile-menu${menuOpen ? " open" : ""}`} aria-hidden={!menuOpen}>
          <div className="cloud-mobile-menu-grid">
            {navItems.map((item) => renderNavItem(item, "cloud-mobile-link", closeMenu))}
          </div>
          <Link className="cloud-mobile-cta" href="/login?signup=true" onClick={closeMenu}>
            <LogIn aria-hidden="true" />
            Entrar grátis
          </Link>
        </div>
      </header>

      <main>
        <section className="hero" id="inicio" aria-labelledby="hero-title">
          <div className="sky-glow sky-glow-a" aria-hidden="true" />
          <div className="sky-glow sky-glow-b" aria-hidden="true" />
          <div className="stars" aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
            <i />
          </div>

          <div className="container hero-content">
            <div className="eyebrow hero-eyebrow">
              Preparação inteligente para vestibulares <span />
            </div>
            <h1 id="hero-title">
              Estude com direção.
              <br />
              <em>Chegue mais alto.</em>
            </h1>
            <p className="hero-copy">
              Uma plataforma completa para organizar seus estudos, praticar com questões reais e
              evoluir todos os dias, sem se perder no caminho.
            </p>

            <div className="hero-cta">
              <Link className="btn btn-lime btn-large" href="/login?signup=true">
                Quero começar <CtaArrow />
              </Link>
              <a className="btn btn-video" href="#demonstracao">
                <span className="play" aria-hidden="true">
                  <Play fill="currentColor" />
                </span>
                Ver como funciona
              </a>
            </div>

            <div className="hero-proof">
              <div className="avatar-stack" aria-hidden="true">
                <span>MA</span>
                <span>JP</span>
                <span>LS</span>
                <span>+8k</span>
              </div>
              <p>
                <strong>Feito para quem tem um objetivo.</strong>
                <br />
                ENEM, ETEC, FATEC e principais vestibulares.
              </p>
            </div>
          </div>

          <div className="learning-orbit container" aria-hidden="true">
            <article className="float-card card-progress" data-depth="0.65">
              <span className="mini-label">Progresso semanal</span>
              <div className="progress-number">84%</div>
              <div className="progress-bar">
                <i />
              </div>
              <small>Você está no ritmo certo</small>
            </article>

            <article className="float-card card-streak" data-depth="0.45">
              <span className="card-icon">
                <Flame fill="currentColor" />
              </span>
              <div>
                <strong>12 dias</strong>
                <small>de sequência</small>
              </div>
            </article>

            <article className="float-card card-redacao" data-depth="0.8">
              <span className="mini-label">Última redação</span>
              <div className="score-row">
                <strong>920</strong>
                <span>+80 pts</span>
              </div>
              <div className="sparkline">
                <i />
                <i />
                <i />
                <i />
                <i />
                <i />
              </div>
            </article>

            <article className="float-card card-question" data-depth="0.55">
              <div className="question-top">
                <span>Matemática</span>
                <b>ENEM</b>
              </div>
              <p>Você consegue resolver?</p>
              <div className="answer-pills">
                <i>A</i>
                <i>B</i>
                <i className="active">C</i>
                <i>D</i>
              </div>
            </article>

            <article className="float-card card-plan" data-depth="0.72">
              <div className="plan-check">
                <Check aria-hidden="true" />
              </div>
              <div>
                <strong>Plano do dia</strong>
                <small>4 de 5 tarefas concluídas</small>
              </div>
            </article>
          </div>

          <div className="cloud-field" aria-hidden="true">
            {Array.from({ length: 5 }, (_, index) => (
              <div key={index} className={`cloud cloud-${index + 1}`}>
                <i />
                <i />
                <i />
                <i />
              </div>
            ))}
          </div>

          <div className="hero-bottom-fade" aria-hidden="true" />
        </section>

        <section className="ticker" id="vestibulares" aria-label="Vestibulares atendidos">
          <div className="ticker-track">
            {[0, 1].map((group) => (
              <div key={group} className="ticker-group" aria-hidden={group === 1}>
                <span>ENEM</span>
                <i>✦</i>
                <span>ETEC</span>
                <i>✦</i>
                <span>FATEC</span>
                <i>✦</i>
                <span>FUVEST</span>
                <i>✦</i>
                <span>UNESP</span>
                <i>✦</i>
                <span>UNICAMP</span>
                <i>✦</i>
                <span>PROVÃO PAULISTA</span>
                <i>✦</i>
              </div>
            ))}
          </div>
        </section>

        <section className="section subjects" id="materias">
          <div className="container">
            <div className="section-heading centered reveal">
              <div className="eyebrow dark">
                <span /> Matérias base
              </div>
              <h2>
                Estude cada matéria com mais foco.
                <br />
                <em>Tudo organizado em um só lugar.</em>
              </h2>
              <p>
                O EstudAki reúne as matérias mais importantes com trilhas, questões, revisões e
                acompanhamento de desempenho.
              </p>
            </div>

            <div className="subjects-grid">
              {subjects.map((subject) => (
                <article key={subject.title} className="subject-card reveal">
                  <div className="subject-icon-wrap">
                    <Image
                      src={asset(subject.icon)}
                      alt={`Ícone de ${subject.title}`}
                      width={104}
                      height={104}
                    />
                  </div>
                  <h3>{subject.title}</h3>
                  <p>{subject.copy}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section method" id="metodo">
          <div className="container">
            <div className="section-heading centered reveal">
              <div className="eyebrow dark">
                <span /> O método EstudAki
              </div>
              <h2>
                Menos dúvida sobre o que estudar.
                <br />
                <em>Mais clareza para evoluir.</em>
              </h2>
              <p>Seu estudo vira um caminho visual, organizado e possível de acompanhar.</p>
            </div>

            <div className="method-grid">
              <article className="feature-card feature-photo reveal">
                <div className="abstract-student" aria-hidden="true">
                  <div className="student-head" />
                  <div className="student-body" />
                  <div className="student-book" />
                  <span className="orbit-dot dot-a" />
                  <span className="orbit-dot dot-b" />
                  <span className="orbit-line" />
                </div>
                <div className="glass-stat">
                  <strong>
                    <span className="count" data-target="2000">
                      2.000
                    </span>
                    +
                  </strong>
                  <small>questões organizadas por conteúdo</small>
                </div>
              </article>

              <article className="feature-card feature-light reveal">
                <span className="feature-kicker">Planejamento que cabe na rotina</span>
                <h3>Seu próximo passo sempre visível.</h3>
                <p>
                  Receba uma trilha prática com metas diárias, revisões e prioridades para não
                  estudar no escuro.
                </p>
                <div className="mini-avatars">
                  <span>1</span>
                  <span>2</span>
                  <span>3</span>
                  <span>
                    <Check aria-hidden="true" />
                  </span>
                </div>
              </article>

              <article className="feature-card feature-lime reveal">
                <span className="feature-kicker">Aprendizado mensurável</span>
                <strong className="big-stat">
                  <span className="count" data-target="87">
                    87
                  </span>
                  %
                </strong>
                <p>de acertos nas listas do plano semanal</p>
                <div className="trend-pill">+14% nesta semana</div>
              </article>

              <article className="feature-card feature-dark reveal">
                <span className="feature-kicker">Tudo conectado</span>
                <strong className="big-stat">
                  <span className="count" data-target="7">
                    7
                  </span>{" "}
                  em 1
                </strong>
                <p>cronograma, questões, simulados, redação, PDFs, aulas e desempenho</p>
              </article>
            </div>
          </div>
        </section>

        <section className="section resources" id="recursos">
          <div className="container">
            <div className="section-heading split-heading reveal">
              <div>
                <div className="eyebrow dark">
                  <span /> Recursos que fazem diferença
                </div>
                <h2>
                  Uma plataforma para estudar
                  <br />
                  <em>do seu jeito.</em>
                </h2>
              </div>
              <p>
                Do primeiro diagnóstico à revisão final, cada ferramenta foi pensada para deixar
                seu estudo mais simples, consistente e estratégico.
              </p>
            </div>

            <div className="resource-grid">
              {resources.map((resource) => (
                <article key={resource.number} className="resource-card reveal">
                  <div className="resource-icon">{resource.number}</div>
                  <span className="resource-tag">{resource.tag}</span>
                  <h3>{resource.title}</h3>
                  <p>{resource.copy}</p>
                  <Link href="/login?signup=true">
                    Explorar recurso <ArrowUpRight aria-hidden="true" />
                  </Link>
                </article>
              ))}

              <article className="resource-card resource-visual reveal" id="demonstracao">
                <div className="demo-window">
                  <div className="demo-top">
                    <i />
                    <i />
                    <i />
                    <span>Visão geral</span>
                  </div>
                  <div className="demo-layout">
                    <aside>
                      <b>&amp;</b>
                      <i />
                      <i />
                      <i />
                      <i />
                    </aside>
                    <div className="demo-content">
                      <div className="demo-welcome">
                        <small>Boa tarde, estudante</small>
                        <strong>Seu foco de hoje</strong>
                      </div>
                      <div className="demo-chart">
                        {["37%", "55%", "48%", "72%", "83%", "67%", "94%"].map((height) => (
                          <span key={height} style={{ height }} />
                        ))}
                      </div>
                      <div className="demo-cards">
                        <i />
                        <i />
                        <i />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="visual-caption">
                  <span>04</span>
                  <div>
                    <strong>Dashboard que mostra o que importa</strong>
                    <p>Progresso claro, sem excesso de informação.</p>
                  </div>
                </div>
              </article>
            </div>
          </div>
        </section>

        <section className="section journey" id="resultados">
          <div className="container journey-shell">
            <div className="journey-copy reveal">
              <div className="eyebrow light">
                <span /> Evolução contínua
              </div>
              <h2>
                Você não precisa estudar mais.
                <br />
                <em>Precisa estudar melhor.</em>
              </h2>
              <p>
                Transformamos dados de desempenho em decisões simples: o que revisar, onde praticar
                e quando avançar.
              </p>
              <Link href="/login?signup=true" className="btn btn-lime btn-large">
                Montar meu plano <CtaArrow />
              </Link>
            </div>

            <div className="journey-path reveal" aria-label="Etapas do método">
              <div className="path-line">
                <i />
              </div>
              {[
                ["01", "Diagnóstico", "Descubra seu ponto de partida"],
                ["02", "Plano", "Saiba exatamente o que fazer"],
                ["03", "Prática", "Resolva, corrija e entenda"],
                ["04", "Evolução", "Acompanhe cada conquista"],
              ].map(([number, label, title]) => (
                <article key={number}>
                  <span>{number}</span>
                  <div>
                    <small>{label}</small>
                    <strong>{title}</strong>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section testimonials">
          <div className="container">
            <div className="section-heading centered reveal">
              <div className="eyebrow dark">
                <span /> Feito para estudantes reais
              </div>
              <h2>
                Pequenas evoluções.
                <br />
                <em>Grandes resultados.</em>
              </h2>
            </div>
            <div className="testimonial-grid">
              {testimonials.map((testimonial) => (
                <article
                  key={testimonial.name}
                  className={`quote-card reveal${testimonial.featured ? " featured" : ""}`}
                >
                  <div className="quote-mark">“</div>
                  <p>{testimonial.quote}</p>
                  <div className="quote-author">
                    <span>{testimonial.initials}</span>
                    <div>
                      <strong>{testimonial.name}</strong>
                      <small>{testimonial.meta}</small>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section faq" id="duvidas">
          <div className="container faq-grid">
            <div className="faq-intro reveal">
              <div className="eyebrow dark">
                <span /> Dúvidas frequentes
              </div>
              <h2>
                Antes de começar,
                <br />
                <em>vale saber.</em>
              </h2>
              <p>Reunimos as respostas principais para você entender como a plataforma funciona.</p>
            </div>
            <div className="accordion reveal">
              {faqs.map((faq, index) => {
                const isOpen = openFaq === index;

                return (
                  <article key={faq.question} className={`faq-item${isOpen ? " open" : ""}`}>
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      onClick={() => setOpenFaq(isOpen ? -1 : index)}
                    >
                      <span>{faq.question}</span>
                      <i aria-hidden="true">{isOpen ? <Minus /> : <Plus />}</i>
                    </button>
                    <div className="faq-answer" style={{ height: isOpen ? "auto" : 0 }}>
                      <p>{faq.answer}</p>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="final-cta" id="planos">
          <div className="final-clouds" aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
          </div>
          <div className="container final-content reveal">
            <Image
              src={asset("logo-estudaki-white.png")}
              alt="EstudAki Vestibulares"
              width={260}
              height={84}
            />
            <div className="eyebrow light">
              <span /> Seu próximo passo começa agora
            </div>
            <h2>
              Transforme vontade
              <br />
              em <em>aprovação.</em>
            </h2>
            <p>
              Crie sua conta e comece com um plano claro para estudar melhor todos os dias.
            </p>
            <div className="final-actions">
              <Link href="/login?signup=true" className="btn btn-lime btn-large">
                Criar minha conta <CtaArrow />
              </Link>
              <a className="btn btn-ghost btn-large" href="#recursos">
                Conhecer recursos
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer>
        <div className="container footer-grid">
          <div>
            <Image
              src={asset("logo-estudaki-white.png")}
              alt="EstudAki Vestibulares"
              width={220}
              height={72}
            />
            <p>Sua aprovação começa aqui.</p>
          </div>
          <div className="footer-links">
            {footerNavItems.map((item) => (
              <a key={item.href} href={item.href}>
                {item.label}
              </a>
            ))}
          </div>
          <div className="footer-social">
            <a href="#" aria-label="Instagram">
              IG
            </a>
            <a href="#" aria-label="TikTok">
              TT
            </a>
            <a href="#" aria-label="YouTube">
              YT
            </a>
          </div>
        </div>
        <div className="container footer-bottom">
          <span>© 2026 EstudAki Vestibulares.</span>
          <span>Feito para quem acredita no próximo passo.</span>
        </div>
      </footer>
    </div>
  );
}
