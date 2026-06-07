import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
  }

  const { id } = await params;
  const existing = await db.videoLike.findUnique({
    where: { userId_videoId: { userId: user.id, videoId: id } },
  });

  if (existing) {
    await db.videoLike.delete({ where: { id: existing.id } });
  } else {
    await db.videoLike.create({ data: { userId: user.id, videoId: id } });
  }

  const likesCount = await db.videoLike.count({ where: { videoId: id } });

  return NextResponse.json({ liked: !existing, likesCount });
}
