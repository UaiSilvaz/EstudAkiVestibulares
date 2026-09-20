import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getCourseCatalog, getLearningUserId } from "@/lib/courses/learning";

export async function GET() {
  const user = await getCurrentUser();
  const userId = await getLearningUserId(user);
  const courses = await getCourseCatalog(userId);
  return NextResponse.json({ courses });
}
