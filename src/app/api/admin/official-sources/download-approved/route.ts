import {
  OfficialFileType,
  OfficialSourceKind,
  OfficialSourceStatus,
} from "@prisma/client";
import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-api-auth";
import { db } from "@/lib/db";
import { downloadOfficialFile, logOfficialImport } from "@/lib/official-sources";

export const maxDuration = 300;

export async function POST() {
  const authorization = await requireAdminApi();
  if (!authorization.ok) return authorization.response;
  const { user } = authorization;
  const approved = await db.officialSource.findMany({
    where: {
      status: OfficialSourceStatus.APPROVED,
      sourceKind: OfficialSourceKind.DIRECT_FILE,
      fileType: { in: [OfficialFileType.EXAM, OfficialFileType.ANSWER_KEY] },
    },
    orderBy: [{ vestibular: "asc" }, { year: "desc" }],
  });
  const eligible = approved.filter((source) =>
    /\.pdf(?:$|[?#])|prova|gabarito|caderno|respostas?/i.test(source.sourceUrl),
  );
  const report = {
    analyzed: approved.length,
    downloaded: 0,
    duplicates: 0,
    ignored: approved.length - eligible.length,
    errors: [] as Array<{ sourceId: string; url: string; error: string }>,
    files: [] as Array<{
      vestibular: string;
      year: number | null;
      fileType: string;
      duplicate: boolean;
    }>,
  };
  for (const source of eligible) {
    try {
      const result = await downloadOfficialFile(source.id);
      if (result.duplicate) report.duplicates += 1;
      else report.downloaded += 1;
      report.files.push({
        vestibular: source.vestibular,
        year: source.year,
        fileType: source.fileType,
        duplicate: result.duplicate,
      });
    } catch (error) {
      report.errors.push({
        sourceId: source.id,
        url: source.sourceUrl,
        error: error instanceof Error ? error.message : "Falha desconhecida.",
      });
    }
  }
  await logOfficialImport({
    action: "download_approved_batch",
    status: report.errors.length ? (report.downloaded ? "PARTIAL" : "ERROR") : "SUCCESS",
    message: `${report.downloaded} PDF(s) baixado(s), ${report.duplicates} duplicado(s), ${report.ignored} ignorado(s), ${report.errors.length} erro(s).`,
    metadata: { requestedBy: user.email, ...report },
  });
  return NextResponse.json(report);
}
