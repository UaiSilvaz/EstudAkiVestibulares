import { CalendarDays, ClipboardList, Compass, Target } from "lucide-react";
import { ChecklistPanel, PlatformHubPage } from "@/components/platform-hub-page";
import { getPlatformPageContext } from "@/lib/platform-page-context";

export default async function PreparacaoPage() {
  const { activePreparation } = await getPlatformPageContext();
  const target = activePreparation?.displayName ?? "ENEM 2027";

  return (
    <PlatformHubPage
      eyebrow="Preparacao ativa"
      title={target}
      description="Aqui ficam os atalhos principais da sua preparacao atual e a troca para outras rotas de estudo."
      stats={[
        { label: "Vertical", value: activePreparation?.vertical.name ?? "Vestibulares", tone: "blue" },
        { label: "Nivel", value: activePreparation?.level ?? "BEGINNER", tone: "violet" },
        { label: "Carga", value: `${activePreparation?.minutesPerDay ?? 90} min/dia`, tone: "orange" },
        { label: "Acesso", value: activePreparation?.hasAccess ? "Liberado" : "Pendente", tone: "green" },
      ]}
      actions={[
        {
          title: "Meu plano",
          description: "Abra o cronograma da preparacao ativa.",
          href: "/cronograma",
          icon: CalendarDays,
          tone: "orange",
        },
        {
          title: "Estudar agora",
          description: "Escolha questoes, revisoes ou trilhas para comecar.",
          href: "/estudar",
          icon: Target,
          tone: "green",
        },
        {
          title: "Banco de questoes",
          description: "Treine por prova, materia e dificuldade.",
          href: `/questions?vestibular=${activePreparation?.examSlug ?? "enem"}`,
          icon: ClipboardList,
          tone: "blue",
        },
        {
          title: "Explorar preparacoes",
          description: "Troque ou adicione outro objetivo de estudo.",
          href: "/explorar",
          icon: Compass,
          tone: "violet",
        },
      ]}
    >
      <ChecklistPanel
        title="Proximos movimentos"
        items={[
          "Confira se a preparacao ativa corresponde a sua prova atual.",
          "Use o plano para manter carga diaria consistente.",
          "Alterne para questoes quando precisar medir resultado.",
          "Abra a Jornada quando quiser uma sequencia guiada de aulas.",
        ]}
      />
    </PlatformHubPage>
  );
}
