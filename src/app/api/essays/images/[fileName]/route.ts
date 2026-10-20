import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { essayImage } from "@/lib/essay-image-storage";

export async function GET(_request: Request, { params }: { params: Promise<{ fileName: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  const { fileName } = await params;
  if (!/^[a-f0-9-]{36}\.webp$/.test(fileName)) return new NextResponse(null, { status: 400 });
  const submission = await db.essaySubmission.findFirst({
    where: { userId: user.id, imageUrl: `/api/essays/images/${fileName}` }, select: { id: true },
  });
  if (!submission) return new NextResponse(null, { status: 404 });
  try {
    const bytes = await essayImage(fileName);
    return new NextResponse(new Uint8Array(bytes!), { headers: {
      "Content-Type": "image/webp", "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff",
    } });
  } catch { return new NextResponse(null, { status: 404 }); }
}
