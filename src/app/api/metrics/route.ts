import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { buildDashboardPayload } from "@/lib/backend-metrics";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
  }

  const dashboard = await buildDashboardPayload(user);

  return NextResponse.json({
    user: dashboard.user,
    metrics: dashboard.metrics,
    insights: dashboard.insights,
  });
}
