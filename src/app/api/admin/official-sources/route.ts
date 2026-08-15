import {
  OfficialFileType,
  OfficialSourceKind,
  OfficialSourceStatus,
} from "@prisma/client";
import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-api-auth";
import { canManageContent, getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  logOfficialImport,
  normalizeOfficialSourceInput,
  type OfficialSourceInput,
} from "@/lib/official-sources";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || !canManageContent(user.role)) {
    return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  }
  const [sources, files, logs] = await Promise.all([
    db.officialSource.findMany({
      include: { _count: { select: { files: true } } },
      orderBy: [{ status: "asc" }, { vestibular: "asc" }, { year: "desc" }],
    }),
    db.officialFile.findMany({
      include: { _count: { select: { answerKeys: true } } },
      orderBy: { createdAt: "desc" },
    }),
    db.officialImportLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);
  return NextResponse.json({ sources, files, logs });
}

export async function POST(request: Request) {
  const authorization = await requireAdminApi();
  if (!authorization.ok) return authorization.response;
  const { user } = authorization;
  try {
    const raw = (await request.json()) as OfficialSourceInput;
    const normalized = normalizeOfficialSourceInput({
      ...raw,
      fileType: raw.fileType ?? OfficialFileType.EXAM,
      sourceKind: raw.sourceKind ?? OfficialSourceKind.DIRECT_FILE,
    });
    const source = await db.officialSource.create({
      data: { ...normalized, status: OfficialSourceStatus.PENDING },
    });
    await logOfficialImport({
      sourceId: source.id,
      action: "create",
      status: "SUCCESS",
      message: `Fonte cadastrada por ${user.email}; aguardando aprovação.`,
    });
    return NextResponse.json({ source }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Fonte inválida." },
      { status: 400 },
    );
  }
}
