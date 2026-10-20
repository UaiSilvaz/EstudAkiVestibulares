import { Users, Target } from "@/components/visual/aicon-icons";
import { redirect } from "next/navigation";
import Link from "next/link";
import { TrendingUp, ArrowUpRight } from "lucide-react";
import { requirePersistedUser } from "@/lib/auth";
import { canUseTeacherTools } from "@/lib/roles";
import { getTeacherStudents } from "@/lib/teacher-students";
import { PageHeader } from "@/components/page-header";

export default async function TeacherStudentsPage() {
  const viewer = await requirePersistedUser();
  if (!canUseTeacherTools(viewer.role)) redirect("/dashboard");
  const students = await getTeacherStudents(viewer);
  return <div className="space-y-6">
    <PageHeader eyebrow="Acompanhamento pedagógico" title="Seus alunos, de perto" description="Objetivos, rotina e evolução a partir das respostas e atividades registradas na plataforma." />
    <div className="grid gap-3 sm:grid-cols-3">{[{ label: "Alunos com acesso", value: students.length, icon: Users }, { label: "Perfis preenchidos", value: students.filter(student => student.profile?.completedAt).length, icon: Target }, { label: "Ativos hoje em questões", value: students.filter(student => student.activeToday).length, icon: TrendingUp }].map(item => <article key={item.label} className="rounded-2xl border border-slate-100 bg-white p-5"><item.icon className="h-5 w-5 text-orange-600" /><p className="mt-3 text-2xl font-bold">{item.value}</p><p className="mt-1 text-xs text-slate-500">{item.label}</p></article>)}</div>
    <div className="space-y-3">{students.map(student => <Link key={student.id} href={"/professor/alunos/" + student.id} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-white p-5 hover:border-orange-200">
      <div><h2 className="font-semibold">{student.name}</h2><p className="mt-1 text-sm text-slate-500">{student.profile?.course || student.targetExam}</p><p className="mt-1 text-xs text-slate-400">{student.profile?.completedAt ? "Perfil completo" : "Perfil ainda em preenchimento"}</p></div>
      <div className="flex items-center gap-5 text-sm"><span>{student.totalAnswers} respostas</span><span>{Math.round(student.insights.accuracyRate)}% de acertos</span><span className="font-semibold text-orange-600">{student.xp} XP</span><ArrowUpRight className="h-4 w-4 text-slate-400" /></div>
    </Link>)}</div>
    {!students.length && <p className="rounded-2xl bg-white p-8 text-center text-sm text-slate-500">Os alunos aparecerão quando tiverem acesso aos seus cursos. Nenhum desempenho de exemplo é exibido.</p>}
  </div>;
}
