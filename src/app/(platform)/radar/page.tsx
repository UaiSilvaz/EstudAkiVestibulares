import { BarChart3, Gauge, Radar, Trophy } from "lucide-react";
import { ChecklistPanel, PlatformHubPage } from "@/components/platform-hub-page";
import { db } from "@/lib/db";
import { getPlatformPageContext } from "@/lib/platform-page-context";

export default async function RadarPage() {
  const { persistedUserId, activePreparation } = await getPlatformPageContext();
  const [attempts, publishedQuestions] = await Promise.all([
    persistedUserId
      ? db.questionAttempt.count({ where: { userId: persistedUserId, annulled: false } })
      : Promise.resolve(0),
    db.question.count({ where: { status: "PUBLISHED", answerSituation: { not: "ANNULLED" } } }),
  ]);

  return (
    <PlatformHubPage
      eyebrow="Radar da prova"
      title={`Mapa rapido de ${activePreparation?.displayName ?? "desempenho"}`}
      description="Use esta tela como central para desempenho, simulados e provas antigas."
      stats={[
        { label: "Tentativas", value: String(attempts), tone: "blue" },
        { label: "Banco publicado", value: String(publishedQuestions), tone: "teal" },
        { label: "Objetivo", value: activePreparation?.displayName ?? "ENEM 2027", tone: "orange" },
        { label: "Status", value: activePreparation?.hasAccess ? "Ativo" : "Revisar", tone: "green" },
      ]}
      actions={[
        {
          title: "Desempenho",
          description: "Veja acertos, materias fracas e evolucao recente.",
          href: "/performance",
          icon: BarChart3,
          tone: "blue",
        },
        {
          title: "Simulados",
          description: "Treine tempo de prova e diagnostico por area.",
          href: "/simulados",
          icon: Gauge,
          tone: "orange",
        },
        {
          title: "Provas antigas",
          description: "Resolva cadernos reais e compare seu ritmo.",
          href: "/provas-antigas",
          icon: Radar,
          tone: "teal",
        },
        {
          title: "Ranking",
          description: "Acompanhe XP, liga e constancia de estudo.",
          href: "/ranking",
          icon: Trophy,
          tone: "amber",
        },
      ]}
    >
      <ChecklistPanel
        title="Sinais para observar"
        items={[
          "Materias com muitos erros recentes devem virar prioridade no cronograma.",
          "Simulados completos ajudam a calibrar tempo antes de estudar conteudo novo.",
          "Provas antigas mostram padroes de banca que questoes isoladas escondem.",
          "O ranking serve como motivacao, mas a precisao decide o proximo passo.",
        ]}
      />
    </PlatformHubPage>
  );
}
