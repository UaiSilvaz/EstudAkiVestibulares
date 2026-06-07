import { ExpressFeed } from "@/components/express-feed";
import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function VideosPage() {
  const user = await requireUser();
  const videos = await db.video.findMany({
    where: { status: "PUBLISHED" },
    include: {
      subject: true,
      topic: true,
      likeRecords: {
        where: { userId: user.id },
        select: { id: true },
      },
      saveRecords: {
        where: { userId: user.id },
        select: { id: true },
      },
      comments: {
        include: {
          user: {
            select: { name: true },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 8,
      },
      _count: {
        select: {
          likeRecords: true,
          saveRecords: true,
          comments: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <PageHeader
        eyebrow="Express"
        title="Videos curtos para aprender rapido"
        description="Um feed vertical no estilo shorts e reels, com curtidas, comentarios e salvos funcionando por usuario."
      />
      <ExpressFeed
        initialVideos={videos.map((video) => ({
          id: video.id,
          title: video.title,
          description: video.description,
          durationSeconds: video.durationSeconds,
          videoUrl: video.videoUrl,
          subjectName: video.subject?.name ?? "Geral",
          topicName: video.topic?.name ?? "Estudo",
          liked: video.likeRecords.length > 0,
          saved: video.saveRecords.length > 0,
          likesCount: video._count.likeRecords,
          savesCount: video._count.saveRecords,
          comments: video.comments.map((comment) => ({
            id: comment.id,
            body: comment.body,
            userName: comment.user.name,
            createdAt: comment.createdAt.toISOString(),
          })),
        }))}
      />
    </div>
  );
}
