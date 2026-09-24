import { ArrowRight, CheckCircle2, Sparkles } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { SilvaIllustration } from "@/components/silva-illustration";
import { getPlatformPageContext } from "@/lib/platform-page-context";

export default async function PraticarPage() {
  const { activePreparation } = await getPlatformPageContext();
  const exam = activePreparation?.examSlug;
  const actions = [
    { title: "Questões", description: "Uma resposta de cada vez. Pratique por disciplina, banca ou assunto e descubra o que você já domina.", href: exam ? "/questions?vestibular=" + encodeURIComponent(exam) : "/questions", icon: "folder" as const, tag: "DO CONCEITO À PRÁTICA", features: ["Filtros por assunto e dificuldade", "Resolução comentada"] },
    { title: "Simulados", description: "Encontre seu ritmo para o dia da prova. Reúna seus conhecimentos e aprenda a administrar o tempo.", href: "/simulados", icon: "clock" as const, tag: "NO RITMO DA SUA PROVA", features: ["Provas completas ou personalizadas", "Análise dos seus resultados"] },
    { title: "Caderno de erros", description: "Toda dúvida pode virar uma descoberta. Retome suas respostas e fortaleça o que precisa de atenção.", href: "/caderno-de-erros", icon: "book" as const, tag: "UMA NOVA CHANCE DE APRENDER", features: ["Suas questões para revisar", "Aprendizado a partir dos erros"] },
    { title: "Flashcards", description: "Pequenas revisões, grandes conexões. Ative a memória e mantenha o conteúdo por perto.", href: "/flashcards", icon: "letter" as const, tag: "CONHECIMENTO QUE FICA", features: ["Revisões rápidas por disciplina", "Repetição espaçada"] },
  ];
  return <div className="silva-dashboard silva-practice">
    <PageHeader eyebrow="APRENDER FAZENDO" title="Conhecimento em ação." description={"Escolha como avançar na sua preparação" + (activePreparation ? " para " + activePreparation.displayName : "") + ". Cada tentativa é uma oportunidade de aprender."} action={<Link href="/performance" className="silva-button-secondary">Ver meu desempenho<ArrowRight size={16} /></Link>} />
    <div className="silva-practice-grid">{actions.map(({ title, description, href, icon, tag, features }, index) => <Link href={href} className="silva-card silva-practice-card" key={title} data-art={icon}>
      <div className="silva-practice-art"><span>0{index + 1}</span><SilvaIllustration name={icon} /><span className="silva-practice-arrow"><ArrowRight size={19} /></span></div>
      <div className="silva-practice-copy"><p className="silva-eyebrow">{tag}</p><h2>{title}</h2><p>{description}</p><ul>{features.map((feature) => <li key={feature}><CheckCircle2 size={15} />{feature}</li>)}</ul><span className="silva-subtle-action">Vamos começar<ArrowRight size={16} /></span></div>
    </Link>)}</div>
    {activePreparation?.vertical.essay && <Link href="/redacao" className="silva-card silva-writing-banner"><SilvaIllustration name="pencil" /><div><p className="silva-eyebrow"><Sparkles size={13} />SUAS IDEIAS TÊM ESPAÇO AQUI</p><h2>Pratique também sua redação</h2><p>Organize seus argumentos e desenvolva sua escrita.</p></div><span className="silva-button-secondary">Começar a escrever<ArrowRight size={16} /></span></Link>}
  </div>;
}
