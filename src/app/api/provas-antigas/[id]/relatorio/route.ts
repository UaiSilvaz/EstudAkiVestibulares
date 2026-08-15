import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { canManageContent, getCurrentUser } from "@/lib/auth";
import { getOldExam } from "@/lib/old-exams";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || !canManageContent(user.role)) return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  const exam = await getOldExam((await params).id);
  if (!exam?.importacaoRelatorio) return NextResponse.json({ error: "Relatório não disponível." }, { status: 404 });
  const fileName = path.basename(exam.importacaoRelatorio);
  if (!/^[a-z0-9-]+-relatorio\.md$/i.test(fileName)) return NextResponse.json({ error: "Caminho inválido." }, { status: 400 });
  const file = path.join(process.cwd(), "scripts", "import", "output", fileName);
  try { return new NextResponse(await fs.readFile(file), { headers: { "Content-Type": "text/markdown; charset=utf-8", "Content-Disposition": `inline; filename="${exam.slug}-relatorio.md"` } }); }
  catch { return NextResponse.json({ error: "Relatório não encontrado." }, { status: 404 }); }
}
