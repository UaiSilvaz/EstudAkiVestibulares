import { CalendarDays } from "@/components/visual/aicon-icons";
import { ClipboardList, Flame, Layers3 } from "lucide-react";
import { ChecklistPanel, PlatformHubPage } from "@/components/platform-hub-page";
import { getPlatformPageContext } from "@/lib/platform-page-context";

export default async function EstudarPage() {
  const { activePreparation } = await getPlatformPageContext();
  const target = activePreparation?.displayName ?? "sua preparação";
  const exam = activePreparation?.examSlug ?? "enem";

  return (
    <PlatformHubPage
      eyebrow="Estudo agora"
      title={`O que estudar em ${target}`}
      description="Escolha uma entrada rápida para começar com questões, revisões ou uma trilha guiada sem cair em página inexistente."
      stats={[
        { label: "Objetivo", value: target, tone: "blue" },
        { label: "Ritmo diário", value: `${activePreparation?.minutesPerDay ?? 90} min`, tone: "green" },
        { label: "Dias por semana", value: String(activePreparation?.studyDays.length ?? 5), tone: "orange" },
        { label: "Acesso", value: activePreparation?.hasAccess ? "Liberado" : "Limitado", tone: "violet" },
      ]}
      actions={[
        {
          title: "Questão guiada",
          description: "Comece por uma lista recomendada e registre seus acertos.",
          href: `/questions?vestibular=${exam}`,
          icon: ClipboardList,
          tone: "blue",
        },
        {
          title: "Plano de hoje",
          description: "Veja as tarefas do cronograma para manter a constância.",
          href: "/cronograma",
          icon: CalendarDays,
          tone: "orange",
        },
        {
          title: "Flashcards",
          description: "Revise memória ativa com repetição espacada.",
          href: "/flashcards",
          icon: Flame,
          tone: "green",
        },
        {
          title: "Meus cursos",
          description: "Abra trilhas e aulas organizadas por progresso.",
          href: "/cursos",
          icon: Layers3,
          tone: "violet",
        },
      ]}
    >
      <ChecklistPanel
        title="Roteiro recomendado"
        items={[
          "Resolva uma bateria curta para aquecer e medir precisão.",
          "Corrija os erros no mesmo dia para alimentar revisões.",
          "Finalize com flashcards ou uma aula curta dos seus cursos.",
          "Volte ao cronograma para marcar a tarefa concluída.",
        ]}
      />
    </PlatformHubPage>
  );
}
