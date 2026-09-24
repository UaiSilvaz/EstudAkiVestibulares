import { ArrowRight, GraduationCap, Layers3, Play, Target } from "lucide-react";
import Link from "next/link";
import { getPlatformPageContext } from "@/lib/platform-page-context";
import { getCourseCatalog } from "@/lib/courses/learning";
import { getVerticalTheme } from "@/config/vertical-themes";
import { PageHeader } from "@/components/page-header";
import { SubjectCatalog } from "@/components/subject-catalog";
import { db } from "@/lib/db";

export default async function EstudarPage() {
  const { activePreparation, user } = await getPlatformPageContext();
  const courses = await getCourseCatalog(user.id, activePreparation?.id).catch(() => []);
  const owned = courses.filter((course) => course.isFree || course.statusLabel === "COMPRADO");
  const resume = owned.find((course) => course.progressPercent > 0 && course.progressPercent < 100);
  const subjectSlugs = getVerticalTheme(activePreparation?.vertical.slug).subjects.map((subject) => subject.slug);
  const questionFilter = { status: "PUBLISHED" as const, answerSituation: { not: "ANNULLED" as const }, ...(activePreparation?.examSlug ? { vestibular: { slug: activePreparation.examSlug } } : {}) };
  const [subjects, attempts] = await Promise.all([
    db.subject.findMany({ where: { slug: { in: subjectSlugs } }, select: { id: true, name: true, slug: true, description: true, _count: { select: { questions: { where: questionFilter }, lessons: { where: { status: "PUBLISHED" } } } } }, orderBy: { name: "asc" } }).catch(() => []),
    db.questionAttempt.findMany({ where: { userId: user.id, annulled: false, question: questionFilter }, select: { correct: true, question: { select: { subjectId: true } } }, orderBy: { createdAt: "desc" }, take: 240 }).catch(() => []),
  ]);
  const catalogSubjects = subjects.map((subject) => {
    const answered = attempts.filter((attempt) => attempt.question.subjectId === subject.id);
    return { id: subject.id, name: subject.name, slug: subject.slug, description: subject.description, questionCount: subject._count.questions, lessonCount: subject._count.lessons, accuracy: answered.length ? Math.round(answered.filter((attempt) => attempt.correct).length / answered.length * 100) : null };
  });
  return <div className="silva-study space-y-7">
    <PageHeader eyebrow="CONHECIMENTO PARA O SEU PRÓXIMO PASSO" title="Estudar" description={"Suas aulas, trilhas e disciplinas em um só lugar" + (activePreparation ? " · " + activePreparation.displayName : ".")} action={<Link href="/cursos" className="silva-button-secondary">Explorar cursos<ArrowRight size={16} /></Link>} />
    {resume && <section className="silva-card silva-resume !min-h-0"><p className="silva-eyebrow flex items-center gap-2"><Play size={15} />CONTINUE ESTUDANDO</p><div className="flex flex-wrap justify-between items-end gap-6"><div><h2>{resume.title}</h2><p className="silva-muted mt-2 text-sm">{resume.lessonCount} aulas · {Math.round(resume.progressPercent)}% concluído</p></div><Link href={"/cursos/" + resume.slug} className="silva-button">Continuar<ArrowRight size={16} /></Link></div></section>}
    <SubjectCatalog subjects={catalogSubjects} examSlug={activePreparation?.examSlug} />
    <section><div className="silva-section-heading"><h2>Minhas trilhas</h2><Link href="/trilhas" className="silva-link">Ver todas<ArrowRight size={15} /></Link></div><div className="grid gap-5 md:grid-cols-2"><Link href="/trilhas" className="silva-card silva-resource"><span className="silva-icon"><Layers3 /></span><div><strong>Aprenda em sequência</strong><p>Conteúdo organizado para construir uma base sólida.</p></div><ArrowRight size={17} className="ml-auto" /></Link><Link href="/cronograma" className="silva-card silva-resource"><span className="silva-icon"><Target /></span><div><strong>Siga seu plano</strong><p>Encontre o próximo bloco da sua preparação.</p></div><ArrowRight size={17} className="ml-auto" /></Link></div></section>
    <section><div className="silva-section-heading"><h2>Meus cursos</h2><span className="silva-muted text-xs">{owned.length} disponíveis</span></div>{owned.length ? <div className="silva-course-grid">{owned.map((course) => <Link key={course.id} href={"/cursos/" + course.slug} className="silva-card silva-course"><div className="silva-course-cover"><span>{course.category}</span><GraduationCap /></div><div className="silva-course-body"><h3>{course.title}</h3><p className="mt-2">{course.lessonCount} aulas · {course.teacherName}</p><div className="flex justify-between text-xs mt-5 mb-2"><span className="silva-muted">Seu progresso</span><strong>{Math.round(course.progressPercent)}%</strong></div><div className="silva-progress"><span style={{ width: Math.min(100, Math.max(0, course.progressPercent)) + "%" }} /></div><span className="silva-link mt-5">{course.progressPercent > 0 ? "Continuar" : "Começar"}<ArrowRight size={14} /></span></div></Link>)}</div> : <div className="silva-card flex items-center gap-5"><span className="silva-icon"><GraduationCap /></span><div><h3 className="font-bold">Seu próximo aprendizado está por aqui.</h3><p className="silva-muted mt-2 text-sm">Explore os cursos disponíveis para encontrar sua próxima aula.</p><Link className="silva-link mt-4" href="/cursos">Conhecer os cursos<ArrowRight size={15} /></Link></div></div>}</section>
    {courses.some((course) => !owned.includes(course)) && <section className="silva-card flex flex-wrap items-center justify-between gap-5"><div><p className="silva-eyebrow">PARA IR ALÉM</p><h2 className="mt-2 font-display text-xl font-extrabold">Descubra novos cursos</h2><p className="silva-muted mt-2 text-sm">Conheça outras possibilidades para aprofundar sua preparação.</p></div><Link className="silva-button" href="/cursos">Ver catálogo<ArrowRight size={15} /></Link></section>}
  </div>;
}
