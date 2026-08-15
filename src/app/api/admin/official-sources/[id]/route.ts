import { OfficialSourceStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-api-auth";
import { db } from "@/lib/db";
import {
  logOfficialImport,
  normalizeOfficialSourceInput,
  type OfficialSourceInput,
} from "@/lib/official-sources";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authorization = await requireAdminApi();
  if (!authorization.ok) return authorization.response;
  const { user } = authorization;
  const { id } = await params;
  const current = await db.officialSource.findUnique({ where: { id } });
  if (!current) return NextResponse.json({ error: "Fonte não encontrada." }, { status: 404 });

  try {
    const body = (await request.json()) as Partial<OfficialSourceInput> & {
      action?: "approve" | "archive" | "reopen" | "edit";
    };
    if (body.action === "approve") {
      const source = await db.officialSource.update({
        where: { id },
        data: {
          status: OfficialSourceStatus.APPROVED,
          approvedAt: new Date(),
          archivedAt: null,
        },
      });
      await logOfficialImport({
        sourceId: id,
        action: "approve",
        status: "SUCCESS",
        message: `Fonte aprovada manualmente por ${user.email}.`,
      });
      return NextResponse.json({ source });
    }
    if (body.action === "archive") {
      const source = await db.officialSource.update({
        where: { id },
        data: { status: OfficialSourceStatus.ARCHIVED, archivedAt: new Date() },
      });
      await logOfficialImport({
        sourceId: id,
        action: "archive",
        status: "SUCCESS",
        message: `Fonte arquivada por ${user.email}.`,
      });
      return NextResponse.json({ source });
    }
    if (body.action === "reopen") {
      const source = await db.officialSource.update({
        where: { id },
        data: { status: OfficialSourceStatus.PENDING, archivedAt: null },
      });
      return NextResponse.json({ source });
    }

    const normalized = normalizeOfficialSourceInput({
      vestibular: body.vestibular ?? current.vestibular,
      year: body.year === undefined ? current.year : body.year,
      edition: body.edition ?? current.edition,
      examDay: body.examDay === undefined ? current.examDay : body.examDay,
      fileType: body.fileType ?? current.fileType,
      sourceKind: body.sourceKind ?? current.sourceKind,
      sourceUrl: body.sourceUrl ?? current.sourceUrl,
      notes: body.notes === undefined ? current.notes : body.notes,
    });
    const source = await db.officialSource.update({
      where: { id },
      data: { ...normalized, status: OfficialSourceStatus.PENDING, approvedAt: null },
    });
    await logOfficialImport({
      sourceId: id,
      action: "edit",
      status: "SUCCESS",
      message: `Metadados alterados por ${user.email}; nova aprovação necessária.`,
    });
    return NextResponse.json({ source });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Não foi possível atualizar." },
      { status: 400 },
    );
  }
}
