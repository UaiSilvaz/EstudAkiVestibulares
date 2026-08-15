import { NextResponse } from "next/server";
import { getCurrentUser, canManageContent } from "@/lib/auth";
import { db } from "@/lib/db";
import { readOfficialFile } from "@/lib/official-file-storage";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ fileName: string }> },
) {
  const user = await getCurrentUser();
  if (!user || !canManageContent(user.role)) {
    return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  }
  const { fileName } = await params;
  if (!/^[a-z0-9-]+\.pdf$/i.test(fileName)) {
    return NextResponse.json({ error: "Arquivo inválido." }, { status: 400 });
  }
  const linked = await db.officialFile.findFirst({
    where: { fileName },
    select: { id: true },
  });
  if (!linked) return NextResponse.json({ error: "Arquivo não vinculado." }, { status: 404 });

  try {
    const bytes = await readOfficialFile(fileName);
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${fileName}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "Arquivo não encontrado." }, { status: 404 });
  }
}
