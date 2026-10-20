import { Presentation, BookOpen, UsersRound } from "@/components/visual/aicon-icons";
import Link from "next/link";

import { requireTeacher } from "@/lib/auth";
import { db } from "@/lib/db";
import { teacherCourseWhere } from "@/lib/teacher-content-access";
import { PageHeader } from "@/components/page-header";
export default async function TeacherPage() {
  const user = await requireTeacher();
  const [courses, pending] = await Promise.all([
    db.course.count({ where: teacherCourseWhere(user) }),
    db.course.count({ where: { AND: [teacherCourseWhere(user), { status: "REVIEW" }] } }),
  ]);
  return <div className="space-y-5"><PageHeader eyebrow="Professores" title="Painel do professor" description="Crie aulas e organize seus cursos oficiais Norte Preparatórios. A equipe administrativa aprova a publicação e configura as ofertas." />
    <section className="rounded-3xl bg-violet-50 p-6"><Presentation className="h-10 w-10 text-violet-700" /><p className="mt-4 font-bold">{courses} cursos · {pending} aguardando revisão</p><p className="mt-2 text-sm">Você pode criar e editar seus conteúdos, enviar para revisão e acompanhar os alunos dos seus cursos. Conteúdos compartilhados com outros professores mantêm suas permissões próprias.</p></section>
    <section className="grid gap-4 md:grid-cols-2"><Link href="/professor/cursos" className="rounded-3xl bg-white p-6 shadow-sm"><BookOpen className="h-7 w-7 text-violet-700" /><h2 className="mt-3 font-bold">Cursos, módulos e aulas</h2><p className="mt-2 text-sm">Vídeos, materiais de apoio e organização do conteúdo.</p></Link><Link href="/professor/alunos" className="rounded-3xl bg-white p-6 shadow-sm"><UsersRound className="h-7 w-7 text-violet-700" /><h2 className="mt-3 font-bold">Acompanhar alunos</h2><p className="mt-2 text-sm">Progresso e desempenho dos alunos vinculados aos seus cursos.</p></Link></section>
  </div>;
}
