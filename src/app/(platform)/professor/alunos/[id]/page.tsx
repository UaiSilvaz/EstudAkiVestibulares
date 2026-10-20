import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { requirePersistedUser } from "@/lib/auth";
import { canUseTeacherTools } from "@/lib/roles";
import { getTeacherStudents } from "@/lib/teacher-students";
import { EvolutionChart } from "@/components/visual/evolution-chart";
import { PageHeader } from "@/components/page-header";
import { normalizeOnboardingProfile, onboardingProfiles } from "@/lib/onboarding-profiles";

export default async function StudentReport({ params }: { params: Promise<{ id: string }> }) {
  const viewer = await requirePersistedUser();
  if (!canUseTeacherTools(viewer.role)) redirect("/dashboard");
  const { id } = await params;
  const [student] = await getTeacherStudents(viewer, id);
  if (!student) notFound();
  const profile = student.profile;
  const subjectLabels = profile ? onboardingProfiles[normalizeOnboardingProfile(profile.profile)].subjects : [];
  const fields = [
    ["Objetivo", profile?.course || "Ainda não informado"], ["Provas", Array.isArray(profile?.exams) ? profile.exams.join(", ") : "Ainda não informadas"],
    ["Meta", profile?.targetScore || "Em aberto"], ["Rotina", profile ? profile.minutesPerDay + " min/dia · " + (profile.studyDays as number[]).length + " dias/semana" : "Em aberto"],
    ["Dificuldades relatadas", Array.isArray(profile?.difficultSubjects) ? profile.difficultSubjects.map(value => subjectLabels.find(subject => subject.value === value)?.label ?? String(value)).join(", ") || "Sem dificuldade indicada" : "Em aberto"],
    ["Preferências", Array.isArray(profile?.learningPreferences) ? profile.learningPreferences.map(value => ({ questions: "Questões", video: "Aulas", reading: "Leitura", review: "Revisão" })[String(value) as "questions"]).join(", ") : "Em aberto"],
    ["Nível informado pelo aluno", profile ? ({ BEGINNER: "Iniciante", INTERMEDIATE: "Intermediário", ADVANCED: "Avançado" })[profile.level] : "Em aberto"],
    ["Data da prova", profile?.examDate?.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" }) ?? "Em aberto"],
  ];
  return <div className="space-y-6"><Link href="/professor/alunos" className="text-sm text-slate-500">← Todos os alunos</Link><PageHeader eyebrow="Perfil e histórico do aluno" title={student.name} description={student.email} />
    <article className="rounded-3xl border border-slate-100 bg-white p-6"><h2 className="text-lg font-semibold">Plano declarado pelo aluno</h2><dl className="mt-5 grid gap-5 sm:grid-cols-2">{fields.map(([label, value]) => <div key={label}><dt className="text-xs text-slate-400">{label}</dt><dd className="mt-1 text-sm font-medium">{value}</dd></div>)}</dl></article>
    <div className="grid gap-3 sm:grid-cols-4">{[["Respostas", student.totalAnswers], ["Precisão", Math.round(student.insights.accuracyRate) + "%"], ["Aulas concluídas", student.lessonsCompleted], ["XP acumulado", student.xp]].map(([label, value]) => <div key={label} className="rounded-2xl bg-white p-5"><p className="text-xs text-slate-400">{label}</p><p className="mt-2 text-2xl font-bold">{value}</p></div>)}</div>
    <article className="rounded-3xl border border-slate-100 bg-white p-6"><h2 className="mb-5 text-lg font-semibold">Precisão nos últimos sete dias</h2><EvolutionChart data={student.insights.dailyBuckets.map(day => day.attempts ? day.accuracy : null)} labels={student.insights.dailyBuckets.map(day => day.label)} /></article>
    <article className="rounded-3xl bg-white p-6"><h2 className="text-lg font-semibold">Desempenho por matéria</h2>{student.insights.subjectPerformance.map(subject => <div key={subject.id} className="mt-4"><div className="flex justify-between text-sm"><span>{subject.name}</span><span>{subject.correct}/{subject.total} acertos</span></div><div className="mt-2 h-2 rounded-full bg-slate-100"><div className="h-full rounded-full bg-orange-500" style={{ width: subject.accuracy + "%" }} /></div></div>)}{!student.totalAnswers && <p className="mt-4 text-sm text-slate-500">Sem respostas registradas. Ainda não há medição de desempenho.</p>}</article>
  </div>;
}
