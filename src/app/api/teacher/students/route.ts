import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { canUseTeacherTools } from "@/lib/roles";
import { getTeacherStudents } from "@/lib/teacher-students";

export async function GET(request: Request) {
  const viewer = await getCurrentUser();
  if (!viewer) return NextResponse.json({ error: "Entre na sua conta." }, { status: 401 });
  if (!canUseTeacherTools(viewer.role)) return NextResponse.json({ error: "Acesso exclusivo para professores." }, { status: 403 });
  const studentId = new URL(request.url).searchParams.get("studentId") ?? undefined;
  const students = await getTeacherStudents(viewer, studentId);
  if (studentId && !students.length) return NextResponse.json({ error: "Aluno não encontrado." }, { status: 404 });
  return NextResponse.json({ students }, { headers: { "Cache-Control": "private, no-store" } });
}
