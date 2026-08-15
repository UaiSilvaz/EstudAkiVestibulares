import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-api-auth";
import { downloadOfficialFile } from "@/lib/official-sources";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authorization = await requireAdminApi();
  if (!authorization.ok) return authorization.response;
  try {
    const { id } = await params;
    return NextResponse.json(await downloadOfficialFile(id));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Download não concluído." },
      { status: 400 },
    );
  }
}
