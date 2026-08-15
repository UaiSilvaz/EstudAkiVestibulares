import { ContentManager } from "@/components/admin/content-manager";
import { PageHeader } from "@/components/page-header";
import { requireManager } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function AdminContentPage() {
  await requireManager();

  const [subjects, materials] = await Promise.all([
    db.subject.findMany({ orderBy: { name: "asc" } }),
    db.material.findMany({
      include: { subject: true },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
  ]);

  return (
    <div>
      <PageHeader
        eyebrow="Conteúdos"
        title="Materiais e biblioteca"
        description="Publique materiais com capa, checkout Hotmart e PDF protegido no EstudAki."
      />
      <ContentManager
        subjects={subjects.map((item) => ({ id: item.id, name: item.name }))}
        materials={materials}
      />
    </div>
  );
}
