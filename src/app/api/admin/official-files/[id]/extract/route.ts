import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-api-auth";
import { extractOfficialAnswerKey } from "@/lib/official-file-processing";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authorization = await requireAdminApi();
  if (!authorization.ok) return authorization.response;
  const { user } = authorization;
  try {
    const { id } = await params;
    return NextResponse.json(await extractOfficialAnswerKey(id, user.email));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Extração não concluída." },
      { status: 400 },
    );
  }
}
