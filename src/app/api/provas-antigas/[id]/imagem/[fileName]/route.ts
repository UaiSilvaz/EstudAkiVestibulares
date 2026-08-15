import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getOldExam } from "@/lib/old-exams";

export const runtime = "nodejs";

function localRoot(...segments: string[]) {
  return path.resolve(/*turbopackIgnore: true*/ process.cwd(), ...segments);
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; fileName: string }> },
) {
  if (!(await getCurrentUser())) {
    return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
  }

  const { id, fileName } = await params;
  if (!/^[a-z0-9-]+\.png$/i.test(fileName) || !(await getOldExam(id))) {
    return NextResponse.json({ error: "Imagem invalida." }, { status: 404 });
  }

  const imageRoot = process.env.OLD_EXAM_IMAGE_ROOT
    ? path.resolve(process.env.OLD_EXAM_IMAGE_ROOT)
    : localRoot("scripts", "import", "output", "images");
  const file = path.resolve(imageRoot, id, fileName);
  if (!file.startsWith(`${imageRoot}${path.sep}`)) {
    return NextResponse.json({ error: "Imagem invalida." }, { status: 404 });
  }

  try {
    return new NextResponse(await fs.readFile(file), {
      headers: { "Content-Type": "image/png", "Cache-Control": "private, max-age=3600" },
    });
  } catch {
    return NextResponse.json({ error: "Imagem nao encontrada." }, { status: 404 });
  }
}
