import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-api-auth";
import { loadEnemReviewPreview } from "@/lib/enem-review-preview";
import { parseOldExamLanguage } from "@/lib/old-exam-language";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const authorization = await requireAdminApi();
  if (!authorization.ok) return authorization.response;

  const rawLanguage = new URL(request.url).searchParams.get("idioma");
  const requestedLanguage = parseOldExamLanguage(rawLanguage);
  if (rawLanguage && !requestedLanguage) {
    return NextResponse.json(
      { error: "Idioma inválido. Use ENGLISH ou SPANISH." },
      { status: 400 },
    );
  }

  const { jobId } = await params;
  const preview = await loadEnemReviewPreview(jobId, requestedLanguage);
  if (!preview) {
    return NextResponse.json(
      { error: "Importação não encontrada ou fora do estágio de prévia." },
      { status: 404 },
    );
  }
  return NextResponse.json(preview, {
    headers: { "Cache-Control": "private, no-store" },
  });
}
