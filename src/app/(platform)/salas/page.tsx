import { UsersRound, Video } from "@/components/visual/aicon-icons";
import { MessageSquareText, Timer } from "lucide-react";
import { FastLink } from "@/components/fast-link";
import { PlatformHubPage } from "@/components/platform-hub-page";
import { db } from "@/lib/db";
import { getPlatformPageContext } from "@/lib/platform-page-context";

export default async function SalasPage() {
  const { activePreparation } = await getPlatformPageContext();
  const rooms = activePreparation
    ? await db.studyRoom.findMany({
        where: {
          preparationId: activePreparation.id,
          isPrivate: false,
          status: "PUBLISHED",
        },
        include: { _count: { select: { members: true, messages: true } } },
        orderBy: { updatedAt: "desc" },
        take: 6,
      })
    : [];

  return (
    <PlatformHubPage
      eyebrow="Salas de estudo"
      title="Estude junto sem perder o foco"
      description="Central de grupos, comunidade e sessões compartilhadas ligadas a sua preparação."
      actions={[
        {
          title: "Comunidade",
          description: "Converse com outros estudantes e tire dúvidas.",
          href: "/community",
          icon: MessageSquareText,
          tone: "teal",
        },
        {
          title: "Cronograma",
          description: "Combine uma sessão com a tarefa do dia.",
          href: "/cronograma",
          icon: Timer,
          tone: "orange",
        },
        {
          title: "Questões em grupo",
          description: "Use o banco de questões para treinos coletivos.",
          href: "/questions?vestibular=enem",
          icon: UsersRound,
          tone: "blue",
        },
        {
          title: "Vídeos",
          description: "Acesse aulas e revisões em vídeo.",
          href: "/videos",
          icon: Video,
          tone: "violet",
        },
      ]}
    >
      <section className="rounded-[18px] border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="font-display text-xl font-semibold text-slate-950">Salas públicas</h2>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {rooms.map((room) => (
            <FastLink
              key={room.id}
              href="/community"
              className="rounded-2xl border border-slate-100 bg-slate-50 p-4 transition hover:border-cyan-200 hover:bg-cyan-50"
            >
              <p className="font-semibold text-slate-950">{room.name}</p>
              <p className="mt-1 text-sm font-semibold leading-6 text-slate-600">
                {room.description || "Sala de foco para estudar em comunidade."}
              </p>
              <p className="mt-3 text-xs font-semibold uppercase tracking-[0.12em] text-cyan-700">
                {room._count.members} membros - {room._count.messages} mensagens
              </p>
            </FastLink>
          ))}
          {rooms.length === 0 && (
            <div className="rounded-2xl bg-slate-50 p-4 text-sm font-semibold leading-6 text-slate-600">
              Nenhuma sala pública ativa para esta preparação ainda. A comunidade já está pronta para você combinar a primeira sessão.
            </div>
          )}
        </div>
      </section>
    </PlatformHubPage>
  );
}
