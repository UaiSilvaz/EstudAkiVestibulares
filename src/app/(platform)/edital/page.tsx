import { CalendarCheck2, ClipboardList, Layers3, SearchCheck } from "lucide-react";
import { ChecklistPanel, PlatformHubPage } from "@/components/platform-hub-page";
import { preparationMatrix } from "@/lib/platform-data";
import { getPlatformPageContext } from "@/lib/platform-page-context";

export default async function EditalPage() {
  const { activePreparation } = await getPlatformPageContext();
  const target = activePreparation?.displayName ?? "seu edital";

  return (
    <PlatformHubPage
      eyebrow="Edital inteligente"
      title={`Cobertura de ${target}`}
      description="Atalho para transformar edital em plano, questoes e revisoes."
      stats={preparationMatrix.slice(0, 4).map((subject, index) => ({
        label: subject.subject,
        value: `${subject.coverage}%`,
        tone: (["blue", "orange", "green", "violet"] as const)[index],
      }))}
      actions={[
        {
          title: "Plano por edital",
          description: "Distribua os topicos pendentes no cronograma.",
          href: "/cronograma",
          icon: CalendarCheck2,
          tone: "orange",
        },
        {
          title: "Questao por topico",
          description: "Treine o conteudo mapeado com correcao imediata.",
          href: "/questions?vestibular=enem",
          icon: ClipboardList,
          tone: "blue",
        },
        {
          title: "Trilhas",
          description: "Aprofunde os assuntos mais cobrados em aulas guiadas.",
          href: "/trilhas",
          icon: Layers3,
          tone: "violet",
        },
        {
          title: "Provas antigas",
          description: "Confira como o edital aparece na pratica.",
          href: "/provas-antigas",
          icon: SearchCheck,
          tone: "teal",
        },
      ]}
    >
      <ChecklistPanel
        title="Matriz inicial"
        items={[
          "Comece pelos assuntos com cobertura menor que 60%.",
          "Depois de estudar um topico, resolva questoes antes de seguir.",
          "Use provas antigas para validar interpretacao de comando e tempo.",
          "Revise os erros antes de adicionar conteudo novo ao ciclo.",
        ]}
      />
    </PlatformHubPage>
  );
}
