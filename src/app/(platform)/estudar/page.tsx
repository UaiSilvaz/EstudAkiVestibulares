import { CalendarDays, ClipboardList, Flame, Layers3 } from "lucide-react";
import { ChecklistPanel, PlatformHubPage } from "@/components/platform-hub-page";
import { getPlatformPageContext } from "@/lib/platform-page-context";

export default async function EstudarPage() {
  const { activePreparation } = await getPlatformPageContext();
  const target = activePreparation?.displayName ?? "sua preparacao";
  const exam = activePreparation?.examSlug ?? "enem";

  return (
    <PlatformHubPage
      eyebrow="Estudo agora"
      title={`O que estudar em ${target}`}
      description="Escolha uma entrada rapida para comecar com questoes, revisoes ou uma trilha guiada sem cair em pagina inexistente."
      stats={[
        { label: "Objetivo", value: target, tone: "blue" },
        { label: "Ritmo diario", value: `${activePreparation?.minutesPerDay ?? 90} min`, tone: "green" },
        { label: "Dias por semana", value: String(activePreparation?.studyDays.length ?? 5), tone: "orange" },
        { label: "Acesso", value: activePreparation?.hasAccess ? "Liberado" : "Limitado", tone: "violet" },
      ]}
      actions={[
        {
          title: "Questao guiada",
          description: "Comece por uma lista recomendada e registre seus acertos.",
          href: `/questions?vestibular=${exam}`,
          icon: ClipboardList,
          tone: "blue",
        },
        {
          title: "Plano de hoje",
          description: "Veja as tarefas do cronograma para manter a constancia.",
          href: "/cronograma",
          icon: CalendarDays,
          tone: "orange",
        },
        {
          title: "Flashcards",
          description: "Revise memoria ativa com repeticao espacada.",
          href: "/flashcards",
          icon: Flame,
          tone: "green",
        },
        {
          title: "Jornada",
          description: "Abra trilhas e aulas organizadas por progresso.",
          href: "/trilhas",
          icon: Layers3,
          tone: "violet",
        },
      ]}
    >
      <ChecklistPanel
        title="Roteiro recomendado"
        items={[
          "Resolva uma bateria curta para aquecer e medir precisao.",
          "Corrija os erros no mesmo dia para alimentar revisoes.",
          "Finalize com flashcards ou uma aula curta da Jornada.",
          "Volte ao cronograma para marcar a tarefa concluida.",
        ]}
      />
    </PlatformHubPage>
  );
}
