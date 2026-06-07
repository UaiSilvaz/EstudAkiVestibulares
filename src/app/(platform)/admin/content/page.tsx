import { ContentManager } from "@/components/admin/content-manager";
import { PageHeader } from "@/components/page-header";
import { requireManager } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function AdminContentPage() {
  await requireManager();

  const [subjects, materials, videos] = await Promise.all([
    db.subject.findMany({ orderBy: { name: "asc" } }),
    db.material.findMany({
      include: { subject: true },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    db.video.findMany({
      include: { subject: true },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
  ]);

  return (
    <div>
      <PageHeader
        eyebrow="Conteudos"
        title="Materiais, videoaulas e Express"
        description="Publique materiais gratuitos ou premium e videos controlados para professores, monitores e administradores."
      />
      <ContentManager
        subjects={subjects.map((item) => ({ id: item.id, name: item.name }))}
        materials={materials}
        videos={videos}
      />
    </div>
  );
}
