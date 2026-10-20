import { BookMarked, FileText, Scale } from "@/components/visual/aicon-icons";
import { SearchCheck } from "lucide-react";
import { ChecklistPanel, PlatformHubPage } from "@/components/platform-hub-page";
import { getPlatformPageContext } from "@/lib/platform-page-context";

export default async function LeisPage() {
  const { activePreparation } = await getPlatformPageContext();
  const target = activePreparation?.displayName ?? "sua prova";

  return (
    <PlatformHubPage
      eyebrow="Leis e normas"
      title={`Estudo juridico para ${target}`}
      description="Central para estudo seco da lei, questões e revisões em provas jurídicas, concursos e carreiras policiais."
      stats={[
        { label: "Foco", value: "Lei seca", tone: "slate" },
        { label: "Treino", value: "Questões", tone: "blue" },
        { label: "Revisão", value: "Flashcards", tone: "green" },
        { label: "Aplicação", value: "Simulados", tone: "orange" },
      ]}
      actions={[
        {
          title: "Questões jurídicas",
          description: "Resolva itens e marque artigos que precisam de revisão.",
          href: "/questions?vestibular=oab",
          icon: Scale,
          tone: "blue",
        },
        {
          title: "Flashcards de lei",
          description: "Memorize prazos, competências e conceitos recorrentes.",
          href: "/flashcards",
          icon: BookMarked,
          tone: "green",
        },
        {
          title: "Edital",
          description: "Veja quais matérias jurídicas entram no seu objetivo.",
          href: "/edital",
          icon: FileText,
          tone: "slate",
        },
        {
          title: "Simulados",
          description: "Treine aplicação da norma com tempo controlado.",
          href: "/simulados",
          icon: SearchCheck,
          tone: "orange",
        },
      ]}
    >
      <ChecklistPanel
        title="Ciclo de lei seca"
        items={[
          "Leia o artigo com foco no verbo principal e nas exceções.",
          "Resolva questões logo depois para entender a cobranca.",
          "Transforme erros recorrentes em flashcards objetivos.",
          "Retorne ao edital para manter o estudo dentro da prova.",
        ]}
      />
    </PlatformHubPage>
  );
}
