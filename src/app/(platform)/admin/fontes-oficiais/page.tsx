import { OfficialSourcesManager } from "@/components/admin/official-sources-manager";
import { PageHeader } from "@/components/page-header";
import { requireManager } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function OfficialSourcesPage() {
  await requireManager();
  const [sources, files, logs] = await Promise.all([
    db.officialSource.findMany({
      include: { _count: { select: { files: true } } },
      orderBy: [{ status: "asc" }, { vestibular: "asc" }, { year: "desc" }],
    }),
    db.officialFile.findMany({
      include: { _count: { select: { answerKeys: true } } },
      orderBy: { createdAt: "desc" },
    }),
    db.officialImportLog.findMany({ orderBy: { createdAt: "desc" }, take: 100 }),
  ]);

  return (
    <div>
      <PageHeader
        eyebrow="Admin · Fontes oficiais"
        title="Importação oficial com aprovação humana"
        description="Cadastre ou importe URLs aprovadas, descubra links apenas em domínios permitidos, valide PDFs e acompanhe hashes, downloads e logs."
      />
      <OfficialSourcesManager
        initialSources={sources.map((source) => ({
          ...source,
          approvedAt: source.approvedAt?.toISOString() ?? null,
          updatedAt: source.updatedAt.toISOString(),
          fileCount: source._count.files,
        }))}
        initialFiles={files.map((file) => ({
          ...file,
          answerKeyCount: file._count.answerKeys,
        }))}
        initialLogs={logs.map((log) => ({
          ...log,
          createdAt: log.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
