import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BookOpen, FileCheck2, LibraryBig, ShieldAlert } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { requireManager } from "@/lib/auth";
import {
  courseActivityCount,
  courseLessonCount,
  jornadaCourses,
  jornadaPaths,
  jornadaSources,
  jornadaWorlds,
} from "@/lib/jornada-curriculum";

export default async function AdminTrilhasPage() {
  await requireManager();

  const totalCourses = jornadaCourses.length;
  const totalLessons = jornadaCourses.reduce((sum, course) => sum + courseLessonCount(course), 0);
  const totalActivities = jornadaCourses.reduce((sum, course) => sum + courseActivityCount(course), 0);
  const pendingSources = jornadaSources.filter((source) => source.licenseStatus !== "verified").length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Banco administravel"
        title="Jornada EstudAki"
        description="Painel inicial para revisar trilhas, cursos, aulas, atividades, fontes e status editorial do novo modulo educacional."
        action={
          <Link href="/trilhas" className="ek-button ek-button-primary">
            Ver como aluno
            <ArrowRight className="h-4 w-4" />
          </Link>
        }
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Cursos", value: totalCourses, icon: LibraryBig, color: "#2563EB" },
          { label: "Aulas piloto", value: totalLessons, icon: BookOpen, color: "#22C55E" },
          { label: "Atividades", value: totalActivities, icon: FileCheck2, color: "#F97316" },
          { label: "Fontes a revisar", value: pendingSources, icon: ShieldAlert, color: "#EAB308" },
        ].map((metric) => {
          const Icon = metric.icon;
          return (
            <div key={metric.label} className="rounded-[24px] border border-white/80 bg-white p-5 shadow-sm">
              <Icon className="h-7 w-7" style={{ color: metric.color }} />
              <p className="mt-4 text-3xl font-black text-[#0F172A]">{metric.value}</p>
              <p className="text-sm font-black uppercase tracking-wider text-slate-500">{metric.label}</p>
            </div>
          );
        })}
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-[24px] border border-white/80 bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-blue-700">Materias</p>
              <h2 className="text-2xl font-black text-[#0F172A]">Mapa editorial</h2>
            </div>
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
              Docs versionados no repo
            </span>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {jornadaWorlds.map((world) => {
              const subjectPaths = jornadaPaths.filter((path) => path.subjectSlug === world.slug);
              return (
                <div key={world.slug} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <div className="flex gap-3">
                    {world.icon ? (
                      <Image src={world.icon} alt={`Icone ${world.name}`} width={56} height={56} className="h-14 w-14 rounded-2xl object-cover" />
                    ) : (
                      <span aria-hidden className="h-14 w-14 shrink-0" />
                    )}
                    <div>
                      <h3 className="font-black text-[#0F172A]">{world.name}</h3>
                      <p className="text-xs font-bold text-slate-500">{world.courses} cursos - {world.modules} modulos - {world.estimatedHours}h</p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {subjectPaths.map((path) => (
                      <Link key={path.slug} href={`/trilhas/${world.slug}`} className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-600 ring-1 ring-slate-100">
                        {path.title}
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-[24px] border border-white/80 bg-white p-5 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-orange-600">Fontes</p>
          <h2 className="text-2xl font-black text-[#0F172A]">Registro de curadoria</h2>
          <div className="mt-4 space-y-3">
            {jornadaSources.map((source) => (
              <a key={source.id} href={source.url} target="_blank" rel="noreferrer" className="block rounded-2xl border border-slate-100 bg-slate-50 p-4 transition hover:bg-blue-50">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-black text-[#0F172A]">{source.organization}</p>
                  <span className="rounded-full bg-white px-2 py-1 text-[10px] font-black uppercase text-slate-500">{source.licenseStatus}</span>
                </div>
                <p className="mt-1 text-sm font-semibold leading-6 text-slate-600">{source.title}</p>
                <p className="mt-2 text-xs font-bold text-blue-700">{source.licenseName}</p>
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-[24px] border border-white/80 bg-white p-5 shadow-sm">
        <p className="text-[10px] font-black uppercase tracking-[0.28em] text-emerald-700">Cursos</p>
        <h2 className="text-2xl font-black text-[#0F172A]">Fila de producao</h2>
        <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-100">
          <div className="min-w-[760px]">
          <div className="grid grid-cols-[1.2fr_0.7fr_0.5fr_0.5fr_0.5fr] bg-slate-50 px-4 py-3 text-xs font-black uppercase tracking-wider text-slate-500">
            <span>Curso</span>
            <span>Materia</span>
            <span>Nivel</span>
            <span>Aulas</span>
            <span>Status</span>
          </div>
          {jornadaCourses.map((course) => (
            <div key={`${course.subjectSlug}-${course.slug}`} className="grid grid-cols-[1.2fr_0.7fr_0.5fr_0.5fr_0.5fr] border-t border-slate-100 px-4 py-3 text-sm font-bold text-slate-700">
              <Link href={`/trilhas/${course.subjectSlug}/${course.pathSlug}/${course.slug}`} className="font-black text-blue-700">{course.title}</Link>
              <span>{course.subjectSlug}</span>
              <span>{course.level}</span>
              <span>{courseLessonCount(course)}</span>
              <span>{course.status}</span>
            </div>
          ))}
          </div>
        </div>
      </section>
    </div>
  );
}
