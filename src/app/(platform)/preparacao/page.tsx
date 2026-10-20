import { CalendarDays, Target } from "@/components/visual/aicon-icons";
import { ClipboardList, Compass } from "lucide-react";
import { ChecklistPanel, PlatformHubPage } from "@/components/platform-hub-page";
import { getPlatformPageContext } from "@/lib/platform-page-context";

export default async function PreparacaoPage() {
  const { activePreparation } = await getPlatformPageContext();
  const target = activePreparation?.displayName ?? "ENEM 2027";

  return (
    <PlatformHubPage
      eyebrow="Preparação ativa"
      title={target}
      description="Aqui ficam os atalhos principais da sua preparação atual e a troca para outras rotas de estudo."
      stats={[
        { label: "Vertical", value: activePreparation?.vertical.name ?? "Vestibulares", tone: "blue" },
        { label: "Nível", value: activePreparation?.level ?? "BEGINNER", tone: "violet" },
        { label: "Carga", value: `${activePreparation?.minutesPerDay ?? 90} min/dia`, tone: "orange" },
        { label: "Acesso", value: activePreparation?.hasAccess ? "Completo liberado" : "Básico gratuito", tone: "green" },
      ]}
      actions={[
        {
          title: "Meu plano",
          description: "Abra o cronograma da preparação ativa.",
          href: "/cronograma",
          icon: CalendarDays,
          tone: "orange",
        },
        {
          title: "Estudar agora",
          description: "Escolha questões, revisões ou trilhas para começar.",
          href: "/estudar",
          icon: Target,
          tone: "green",
        },
        {
          title: "Banco de questões",
          description: "Treine por prova, matéria e dificuldade.",
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
        title="Próximos movimentos"
        items={[
          "Confira se a preparação ativa corresponde a sua prova atual.",
          "Use o plano para manter carga diária consistente.",
          "Alterne para questões quando precisar medir resultado.",
          "Abra seus cursos quando quiser uma sequência guiada de aulas.",
        ]}
      />
    </PlatformHubPage>
  );
}
