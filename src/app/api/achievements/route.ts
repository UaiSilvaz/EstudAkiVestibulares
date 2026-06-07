import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { syncUserAchievements } from "@/lib/backend-metrics";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
  }

  const achievements = await syncUserAchievements(user);
  return NextResponse.json({ achievements });
}
