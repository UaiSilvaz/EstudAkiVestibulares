import { OfficialFileType, OfficialSourceKind, OfficialSourceStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-api-auth";
import { db } from "@/lib/db";
import { normalizeOfficialSourceInput } from "@/lib/official-sources";

function fileType(value: unknown) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (["prova", "exam", "caderno"].includes(normalized)) return OfficialFileType.EXAM;
  if (["gabarito", "answer_key", "respostas"].includes(normalized)) {
    return OfficialFileType.ANSWER_KEY;
  }
  if (["indice", "index", "pagina"].includes(normalized)) return OfficialFileType.INDEX_PAGE;
  throw new Error(`Tipo de arquivo inválido: ${String(value ?? "")}`);
}

export async function POST(request: Request) {
  const authorization = await requireAdminApi();
  if (!authorization.ok) return authorization.response;
  const { user } = authorization;
  try {
    const body = (await request.json()) as {
      items?: Array<Record<string, unknown>>;
      confirm?: boolean;
    };
    if (!Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json({ error: "Envie uma lista JSON de fontes." }, { status: 400 });
    }
    if (body.items.length > 500) {
      return NextResponse.json({ error: "Limite de 500 fontes por lote." }, { status: 400 });
    }

    const valid: ReturnType<typeof normalizeOfficialSourceInput>[] = [];
    const invalid: Array<{ index: number; error: string }> = [];
    body.items.forEach((item, index) => {
      try {
        const type = fileType(item.file_type ?? item.fileType);
        const sourceKind =
          type === OfficialFileType.INDEX_PAGE
            ? OfficialSourceKind.SEED_PAGE
            : OfficialSourceKind.DIRECT_FILE;
        valid.push(
          normalizeOfficialSourceInput({
            vestibular: String(item.vestibular ?? ""),
            year: item.year === null || item.year === undefined ? null : Number(item.year),
            edition: String(item.edition ?? item.edicao ?? "regular"),
            examDay: String(item.exam_day ?? item.examDay ?? item.dia ?? "") || null,
            fileType: type,
            sourceKind,
            sourceUrl: String(item.source_url ?? item.sourceUrl ?? item.url ?? ""),
            notes: String(item.notes ?? item.observacoes ?? "") || null,
          }),
        );
      } catch (error) {
        invalid.push({
          index,
          error: error instanceof Error ? error.message : "Item inválido.",
        });
      }
    });
    const existing = valid.length
      ? await db.officialSource.findMany({
          where: { sourceUrl: { in: valid.map((item) => item.sourceUrl) } },
          select: { sourceUrl: true },
        })
      : [];
    const existingUrls = new Set(existing.map((item) => item.sourceUrl));
    const creatable = valid.filter((item) => !existingUrls.has(item.sourceUrl));

    if (!body.confirm) {
      return NextResponse.json({
        preview: true,
        received: body.items.length,
        valid: valid.length,
        invalid,
        duplicates: existing.length,
        creatable: creatable.length,
      });
    }
    if (invalid.length) {
      return NextResponse.json(
        { error: "Corrija os itens inválidos antes de confirmar.", invalid },
        { status: 400 },
      );
    }
    const result = await db.officialSource.createMany({
      data: creatable.map((item) => ({
        ...item,
        status: OfficialSourceStatus.PENDING,
      })),
      skipDuplicates: true,
    });
    await db.officialImportLog.create({
      data: {
        action: "json_import",
        status: "SUCCESS",
        message: `${result.count} fonte(s) importada(s) por ${user.email}; todas pendentes.`,
        metadata: JSON.stringify({ received: body.items.length, duplicates: existing.length }),
      },
    });
    return NextResponse.json({ imported: result.count, duplicates: existing.length });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "JSON inválido." },
      { status: 400 },
    );
  }
}
