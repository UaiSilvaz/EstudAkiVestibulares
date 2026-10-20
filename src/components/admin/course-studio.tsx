"use client";

import { Clock3, FileText, Pencil, Video } from "@/components/visual/aicon-icons";
import { ArrowDown, ArrowUp, Check, CirclePlay, CopyPlus, ExternalLink, FolderPlus, GraduationCap, Layers3, Library, Link2, Loader2, Plus, Search, Save, Send, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";
import { useFeedback } from "@/components/feedback/feedback-provider";
import { cn } from "@/lib/utils";

type Subject = { id: string; name: string };
type Topic = { id: string; subjectId: string; name: string };
type Lesson = {
  id: string;
  slug: string;
  title: string;
  description: string;
  content: string | null;
  type: string;
  videoUrl: string | null;
  thumbnailUrl: string | null;
  resources: unknown;
  durationSeconds: number;
  status: string;
  isFreePreview: boolean;
  subject: Subject | null;
  topic: { id: string; name: string } | null;
  authors: Array<{ user: { id: string; name: string } }>;
  _count: { modules: number };
};
type ModuleItem = {
  id: string;
  slug: string;
  title: string;
  description: string;
  color: string;
  _count: { courses: number; lessons: number };
};
type Course = {
  id: string;
  slug: string;
  title: string;
  description: string;
  shortDescription: string;
  category: string;
  level: string;
  status: string;
  published: boolean;
  navigationMode: string;
  thumbnail: string | null;
  coverImage: string | null;
  totalDurationSeconds: number;
  teacher: { id: string; name: string } | null;
  subject: Subject | null;
  modules: Array<{
    position: number;
    module: ModuleItem & {
      lessons: Array<{ position: number; lesson: Lesson }>;
    };
  }>;
};

type Modal =
  | { kind: "course"; edit?: Course }
  | { kind: "module"; edit?: ModuleItem }
  | { kind: "lesson"; moduleId: string; edit?: Lesson }
  | { kind: "lessonLibrary"; moduleId: string }
  | { kind: "moduleLibrary" }
  | null;

const lessonTypeLabels: Record<string, string> = {
  VIDEO: "Videoaula",
  QUESTIONS: "Lista de questões",
  REVIEW: "Revisão",
  CHECKPOINT: "Checkpoint",
  SIMULATION: "Simulado",
  MATERIAL: "Material",
  REWARD: "Recompensa",
  FINAL: "Conclusão",
};

function durationLabel(seconds: number) {
  if (!seconds) return "Sem duração";
  const minutes = Math.ceil(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return `${hours}h${rest ? ` ${rest}min` : ""}`;
}

type LessonMaterial = { title: string; type: "PDF" | "SUMMARY" | "SHEET"; href: string };

function lessonMaterials(value: unknown): LessonMaterial[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const record = item as Record<string, unknown>;
    if (typeof record.title !== "string" || typeof record.href !== "string") return [];
    const type = record.type === "SUMMARY" || record.type === "SHEET" ? record.type : "PDF";
    return [{ title: record.title, href: record.href, type }];
  });
}

function statusInfo(status: string, published: boolean) {
  if (status === "PUBLISHED" || published) return { label: "Publicado", className: "bg-emerald-50 text-emerald-700" };
  if (status === "REVIEW") return { label: "Em revisão", className: "bg-amber-50 text-amber-700" };
  return { label: "Rascunho", className: "bg-slate-100 text-slate-600" };
}

function Dialog({ title, description, onClose, children, wide = false }: {
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={title}>
      <div className={cn("max-h-[90vh] w-full overflow-y-auto rounded-[18px] border border-white bg-white p-5 shadow-2xl md:p-7", wide ? "max-w-3xl" : "max-w-xl")}>
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-slate-950">{title}</h2>
            {description && <p className="mt-1 text-sm font-medium leading-6 text-slate-500">{description}</p>}
          </div>
          <button type="button" onClick={onClose} className="rounded-xl bg-slate-100 p-2 text-slate-600 hover:bg-slate-200" aria-label="Fechar">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-600">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-xs font-medium text-slate-400">{hint}</span>}
    </label>
  );
}

function EmptyState({ icon, title, text, action }: { icon: ReactNode; title: string; text: string; action?: ReactNode }) {
  return (
    <div className="flex min-h-56 flex-col items-center justify-center rounded-[18px] border-2 border-dashed border-slate-200 bg-slate-50/60 p-8 text-center">
      <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-blue-600 shadow-sm">{icon}</span>
      <h3 className="font-semibold text-slate-900">{title}</h3>
      <p className="mt-1 max-w-sm text-sm font-medium leading-6 text-slate-500">{text}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function CourseStudio({ courses, modules, lessons, subjects, topics, canPublish }: {
  courses: Course[];
  modules: ModuleItem[];
  lessons: Lesson[];
  subjects: Subject[];
  topics: Topic[];
  canPublish: boolean;
}) {
  const router = useRouter();
  const { notify, confirm } = useFeedback();
  const [selectedCourseId, setSelectedCourseId] = useState(courses[0]?.id ?? "");
  const [modal, setModal] = useState<Modal>(null);
  const [busy, setBusy] = useState(false);
  const [librarySearch, setLibrarySearch] = useState("");

  const effectiveSelectedCourseId = courses.some((course) => course.id === selectedCourseId)
    ? selectedCourseId
    : courses[0]?.id ?? "";
  const selectedCourse = courses.find((course) => course.id === effectiveSelectedCourseId) ?? null;
  const linkedModuleIds = new Set(selectedCourse?.modules.map((item) => item.module.id) ?? []);
  const totalCourseLessons = selectedCourse?.modules.reduce((sum, item) => sum + item.module.lessons.length, 0) ?? 0;
  const draftLessons = selectedCourse?.modules.reduce(
    (sum, item) => sum + item.module.lessons.filter(({ lesson }) => lesson.status !== "PUBLISHED").length,
    0,
  ) ?? 0;

  async function command(payload: Record<string, unknown>, successMessage: string) {
    setBusy(true);
    try {
      const response = await fetch("/api/admin/course-studio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json().catch(() => null)) as { error?: string; course?: { id: string } } | null;
      if (!response.ok) throw new Error(data?.error ?? "Não foi possível salvar.");
      if (data?.course?.id) setSelectedCourseId(data.course.id);
      notify({ tone: "success", title: successMessage });
      setModal(null);
      router.refresh();
      return true;
    } catch (cause) {
      notify({
        tone: "error",
        title: "Alteração não salva",
        message: cause instanceof Error ? cause.message : "Tente novamente.",
      });
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function unlinkModule(moduleId: string, title: string) {
    if (!selectedCourse) return;
    const accepted = await confirm({
      title: "Remover módulo do curso?",
      message: `“${title}” sairá deste curso. O módulo e suas aulas continuarão disponíveis na biblioteca.`,
      confirmLabel: "Remover vínculo",
      tone: "danger",
    });
    if (accepted) await command({ action: "unlinkModule", courseId: selectedCourse.id, moduleId }, "Módulo removido do curso");
  }

  async function unlinkLesson(moduleId: string, lessonId: string, title: string) {
    const accepted = await confirm({
      title: "Remover aula do módulo?",
      message: `“${title}” sairá deste módulo, mas continuará salva na biblioteca para reutilização.`,
      confirmLabel: "Remover vínculo",
      tone: "danger",
    });
    if (accepted) await command({ action: "unlinkLesson", moduleId, lessonId }, "Aula removida do módulo");
  }

  return (
    <>
      <section className="mb-5 grid gap-3 md:grid-cols-4">
        {[
          ["1", "Crie o curso", "Defina nome e matéria"],
          ["2", "Organize módulos", "Separe por unidades"],
          ["3", "Adicione aulas", "Crie ou reutilize"],
          ["4", "Revise e publique", "Disponibilize aos alunos"],
        ].map(([number, title, text], index) => (
          <div key={number} className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-semibold", index === 0 ? "bg-blue-600 text-white" : "bg-blue-50 text-blue-700")}>{number}</span>
            <div><p className="text-sm font-semibold text-slate-900">{title}</p><p className="text-xs font-medium text-slate-500">{text}</p></div>
          </div>
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="rounded-[18px] border border-slate-100 bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div><p className="text-xs font-semibold uppercase tracking-wider text-blue-600">Meus cursos</p><p className="text-sm font-semibold text-slate-500">{courses.length} cadastrado(s)</p></div>
            <button type="button" onClick={() => setModal({ kind: "course" })} className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm hover:bg-blue-700" aria-label="Criar curso"><Plus className="h-5 w-5" /></button>
          </div>
          <div className="space-y-2 xl:max-h-[720px] xl:overflow-y-auto xl:pr-1 thin-scrollbar">
            {courses.map((course) => {
              const info = statusInfo(course.status, course.published);
              const count = course.modules.reduce((sum, item) => sum + item.module.lessons.length, 0);
              return (
                <button key={course.id} type="button" onClick={() => setSelectedCourseId(course.id)} className={cn("w-full rounded-2xl border p-4 text-left transition", effectiveSelectedCourseId === course.id ? "border-blue-300 bg-blue-50 shadow-sm" : "border-slate-100 bg-white hover:border-blue-200 hover:bg-slate-50")}>
                  <span className={cn("inline-flex rounded-full px-2 py-1 text-[9px] font-semibold uppercase", info.className)}>{info.label}</span>
                  <p className="mt-2 line-clamp-2 font-semibold text-slate-950">{course.title}</p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">{course.modules.length} módulo(s) · {count} aula(s)</p>
                </button>
              );
            })}
            {courses.length === 0 && <p className="rounded-2xl bg-slate-50 p-4 text-sm font-semibold leading-6 text-slate-500">Você ainda não criou um curso.</p>}
          </div>
          <button type="button" onClick={() => setModal({ kind: "course" })} className="ek-button ek-button-primary mt-4 w-full"><Plus className="h-4 w-4" />Novo curso</button>
        </aside>

        <main className="min-w-0">
          {!selectedCourse ? (
            <EmptyState icon={<GraduationCap className="h-6 w-6" />} title="Comece pelo seu primeiro curso" text="Crie o curso e depois organize módulos e aulas dentro dele." action={<button type="button" onClick={() => setModal({ kind: "course" })} className="ek-button ek-button-primary"><Plus className="h-4 w-4" />Criar curso</button>} />
          ) : (
            <>
              <div className="rounded-[18px] border border-blue-100  p-5 shadow-sm md:p-6 professional-neutral">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={cn("rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase", statusInfo(selectedCourse.status, selectedCourse.published).className)}>{statusInfo(selectedCourse.status, selectedCourse.published).label}</span>
                      <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold uppercase text-slate-600 shadow-sm">{selectedCourse.subject?.name ?? "Sem matéria"}</span>
                      <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold uppercase text-slate-600 shadow-sm">{selectedCourse.level}</span>
                    </div>
                    <h2 className="mt-3 text-2xl font-semibold text-slate-950 md:text-3xl">{selectedCourse.title}</h2>
                    <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-slate-600">{selectedCourse.description || "Adicione uma descrição para orientar seus alunos."}</p>
                    <div className="mt-4 flex flex-wrap gap-4 text-xs font-bold text-slate-500">
                      <span className="flex items-center gap-1.5"><Layers3 className="h-4 w-4 text-blue-600" />{selectedCourse.modules.length} módulos</span>
                      <span className="flex items-center gap-1.5"><CirclePlay className="h-4 w-4 text-blue-600" />{totalCourseLessons} aulas</span>
                      <span className="flex items-center gap-1.5"><Clock3 className="h-4 w-4 text-blue-600" />{durationLabel(selectedCourse.totalDurationSeconds)}</span>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    {(selectedCourse.status === "PUBLISHED" || selectedCourse.published) && <a href={`/cursos/${selectedCourse.slug}`} className="ek-button ek-button-ghost"><ExternalLink className="h-4 w-4" />Ver no catálogo</a>}
                    <button type="button" onClick={() => setModal({ kind: "course", edit: selectedCourse })} className="ek-button ek-button-ghost"><Pencil className="h-4 w-4" />Editar</button>
                    <button type="button" disabled={busy || selectedCourse.status === "PUBLISHED"} onClick={() => void command({ action: "setCourseStatus", courseId: selectedCourse.id, status: "PUBLISHED" }, canPublish ? "Curso publicado" : "Curso enviado para revisão")} className="ek-button ek-button-primary disabled:opacity-50">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : canPublish ? <Check className="h-4 w-4" /> : <Send className="h-4 w-4" />}{canPublish ? "Publicar" : "Enviar para revisão"}</button>
                  </div>
                </div>
                {draftLessons > 0 && <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-bold text-amber-800">{draftLessons} aula(s) ainda estão como rascunho. Revise o conteúdo antes de publicar o curso.</div>}
              </div>

              <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                <div><h2 className="text-xl font-semibold text-slate-950">Estrutura do curso</h2><p className="text-sm font-medium text-slate-500">A ordem abaixo é a mesma apresentada ao aluno.</p></div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => setModal({ kind: "moduleLibrary" })} className="ek-button ek-button-ghost"><Library className="h-4 w-4" />Usar módulo existente</button>
                  <button type="button" onClick={() => setModal({ kind: "module" })} className="ek-button ek-button-primary"><FolderPlus className="h-4 w-4" />Novo módulo</button>
                </div>
              </div>

              <div className="mt-4 space-y-4">
                {selectedCourse.modules.map(({ module }, moduleIndex) => (
                  <article key={module.id} className="overflow-hidden rounded-[18px] border border-slate-100 bg-white shadow-sm">
                    <header className="flex flex-col gap-3 border-b border-slate-100 p-4 md:flex-row md:items-center md:justify-between md:p-5">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-sm font-semibold text-white" style={{ backgroundColor: module.color }}>{String(moduleIndex + 1).padStart(2, "0")}</span>
                        <div className="min-w-0"><h3 className="truncate text-lg font-semibold text-slate-950">{module.title}</h3><p className="text-xs font-semibold text-slate-500">{module.lessons.length} aula(s){module._count.courses > 1 ? ` · usado em ${module._count.courses} cursos` : ""}</p></div>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <button type="button" onClick={() => setModal({ kind: "module", edit: module })} className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:border-blue-200 hover:text-blue-700" aria-label="Editar módulo"><Pencil className="h-4 w-4" /></button>
                        <button type="button" disabled={moduleIndex === 0 || busy} onClick={() => void command({ action: "moveModule", courseId: selectedCourse.id, moduleId: module.id, direction: "up" }, "Ordem atualizada")} className="rounded-xl border border-slate-200 p-2 text-slate-500 disabled:opacity-30" aria-label="Mover módulo para cima"><ArrowUp className="h-4 w-4" /></button>
                        <button type="button" disabled={moduleIndex === selectedCourse.modules.length - 1 || busy} onClick={() => void command({ action: "moveModule", courseId: selectedCourse.id, moduleId: module.id, direction: "down" }, "Ordem atualizada")} className="rounded-xl border border-slate-200 p-2 text-slate-500 disabled:opacity-30" aria-label="Mover módulo para baixo"><ArrowDown className="h-4 w-4" /></button>
                        <button type="button" onClick={() => setModal({ kind: "lessonLibrary", moduleId: module.id })} className="ek-button ek-button-ghost"><Link2 className="h-4 w-4" />Aula existente</button>
                        <button type="button" onClick={() => setModal({ kind: "lesson", moduleId: module.id })} className="ek-button ek-button-primary"><Plus className="h-4 w-4" />Nova aula</button>
                        <button type="button" onClick={() => void unlinkModule(module.id, module.title)} className="rounded-xl p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600" aria-label="Remover módulo do curso"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </header>
                    <div className="p-3 md:p-4">
                      {module.lessons.length === 0 ? (
                        <div className="rounded-2xl border-2 border-dashed border-slate-200 p-5 text-center"><p className="text-sm font-bold text-slate-600">Este módulo ainda está vazio.</p><div className="mt-3 flex flex-wrap justify-center gap-2"><button type="button" onClick={() => setModal({ kind: "lesson", moduleId: module.id })} className="ek-button ek-button-primary"><Plus className="h-4 w-4" />Criar primeira aula</button><button type="button" onClick={() => setModal({ kind: "lessonLibrary", moduleId: module.id })} className="ek-button ek-button-ghost"><Library className="h-4 w-4" />Escolher da biblioteca</button></div></div>
                      ) : (
                        <div className="space-y-2">
                          {module.lessons.map(({ lesson }, lessonIndex) => (
                            <div key={lesson.id} className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-3 md:flex-row md:items-center">
                              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-xs font-semibold text-blue-700 shadow-sm">{lessonIndex + 1}</span>
                              <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-slate-900">{lesson.title}</p><p className="mt-0.5 flex flex-wrap gap-x-2 text-[11px] font-semibold text-slate-500"><span>{lessonTypeLabels[lesson.type] ?? lesson.type}</span><span>· {durationLabel(lesson.durationSeconds)}</span>{lesson._count.modules > 1 && <span className="text-blue-600">· reutilizada em {lesson._count.modules} módulos</span>}</p></div>
                              <div className="flex items-center gap-1"><button type="button" onClick={() => setModal({ kind: "lesson", moduleId: module.id, edit: lesson })} className="rounded-lg p-2 text-slate-400 hover:bg-white hover:text-blue-700" aria-label="Editar aula"><Pencil className="h-4 w-4" /></button><button type="button" disabled={lessonIndex === 0 || busy} onClick={() => void command({ action: "moveLesson", moduleId: module.id, lessonId: lesson.id, direction: "up" }, "Ordem atualizada")} className="rounded-lg p-2 text-slate-400 hover:bg-white disabled:opacity-25" aria-label="Mover aula para cima"><ArrowUp className="h-4 w-4" /></button><button type="button" disabled={lessonIndex === module.lessons.length - 1 || busy} onClick={() => void command({ action: "moveLesson", moduleId: module.id, lessonId: lesson.id, direction: "down" }, "Ordem atualizada")} className="rounded-lg p-2 text-slate-400 hover:bg-white disabled:opacity-25" aria-label="Mover aula para baixo"><ArrowDown className="h-4 w-4" /></button><button type="button" onClick={() => void unlinkLesson(module.id, lesson.id, lesson.title)} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600" aria-label="Remover aula do módulo"><Trash2 className="h-4 w-4" /></button></div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </article>
                ))}
                {selectedCourse.modules.length === 0 && <EmptyState icon={<Layers3 className="h-6 w-6" />} title="Crie a primeira unidade do curso" text="Módulos organizam as aulas. Você também pode aproveitar um módulo já pronto." action={<div className="flex flex-wrap justify-center gap-2"><button type="button" onClick={() => setModal({ kind: "module" })} className="ek-button ek-button-primary"><FolderPlus className="h-4 w-4" />Criar módulo</button><button type="button" onClick={() => setModal({ kind: "moduleLibrary" })} className="ek-button ek-button-ghost"><Library className="h-4 w-4" />Usar existente</button></div>} />}
              </div>
            </>
          )}
        </main>
      </section>

      <section className="mt-6 rounded-[18px] border border-slate-100 bg-white p-5 shadow-sm md:p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><div><p className="text-xs font-semibold uppercase tracking-wider text-violet-600">Biblioteca reutilizável</p><h2 className="text-xl font-semibold text-slate-950">Todas as aulas</h2><p className="text-sm font-medium text-slate-500">Uma aula pode participar de vários módulos sem criar cópias.</p></div><div className="rounded-2xl bg-violet-50 px-4 py-3 text-sm font-semibold text-violet-700">{lessons.length} aula(s) disponíveis</div></div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {lessons.slice(0, 6).map((lesson) => <div key={lesson.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4"><div className="flex items-start justify-between gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-violet-600 shadow-sm">{lesson.type === "VIDEO" ? <Video className="h-4 w-4" /> : <FileText className="h-4 w-4" />}</span><span className="rounded-full bg-white px-2 py-1 text-[9px] font-semibold uppercase text-slate-500">{lesson._count.modules} vínculo(s)</span></div><p className="mt-3 line-clamp-1 font-semibold text-slate-900">{lesson.title}</p><p className="mt-1 text-xs font-semibold text-slate-500">{lesson.subject?.name ?? "Geral"} · {durationLabel(lesson.durationSeconds)}</p></div>)}
        </div>
      </section>

      {modal?.kind === "course" && <CourseFormDialog course={modal.edit} subjects={subjects} busy={busy} onClose={() => setModal(null)} onSubmit={(payload) => command({ action: modal.edit ? "updateCourse" : "createCourse", courseId: modal.edit?.id, ...payload }, modal.edit ? "Curso atualizado" : canPublish ? "Curso criado e publicado" : "Curso criado")} />}
      {modal?.kind === "module" && selectedCourse && <ModuleFormDialog module={modal.edit} busy={busy} onClose={() => setModal(null)} onSubmit={(payload) => command({ action: modal.edit ? "updateModule" : "createModule", courseId: selectedCourse.id, moduleId: modal.edit?.id, ...payload }, modal.edit ? "Módulo atualizado" : "Módulo criado e adicionado")} />}
      {modal?.kind === "lesson" && <LessonFormDialog lesson={modal.edit} subjects={subjects} topics={topics} canPublish={canPublish} busy={busy} onClose={() => setModal(null)} onSubmit={(payload) => command({ action: modal.edit ? "updateLesson" : "createLesson", moduleId: modal.moduleId, lessonId: modal.edit?.id, ...payload }, modal.edit ? "Aula atualizada" : "Aula criada e adicionada")} />}
      {modal?.kind === "lessonLibrary" && <LibraryDialog title="Adicionar aula da biblioteca" description="Escolha uma aula existente. O conteúdo será reutilizado e não duplicado." search={librarySearch} onSearch={setLibrarySearch} onClose={() => setModal(null)} items={lessons.filter((lesson) => !selectedCourse?.modules.find((item) => item.module.id === modal.moduleId)?.module.lessons.some((item) => item.lesson.id === lesson.id)).filter((lesson) => `${lesson.title} ${lesson.subject?.name ?? ""}`.toLowerCase().includes(librarySearch.toLowerCase()))} renderItem={(lesson) => <LibraryRow key={lesson.id} icon={<CirclePlay className="h-5 w-5" />} title={lesson.title} meta={`${lesson.subject?.name ?? "Geral"} · ${durationLabel(lesson.durationSeconds)} · usada em ${lesson._count.modules} módulo(s)`} busy={busy} onAdd={() => void command({ action: "linkLesson", moduleId: modal.moduleId, lessonId: lesson.id }, "Aula adicionada ao módulo")} />} />}
      {modal?.kind === "moduleLibrary" && selectedCourse && <LibraryDialog title="Adicionar módulo existente" description="O módulo e todas as aulas dele serão vinculados ao curso." search={librarySearch} onSearch={setLibrarySearch} onClose={() => setModal(null)} items={modules.filter((item) => !linkedModuleIds.has(item.id)).filter((item) => item.title.toLowerCase().includes(librarySearch.toLowerCase()))} renderItem={(item) => <LibraryRow key={item.id} icon={<Layers3 className="h-5 w-5" />} title={item.title} meta={`${item._count.lessons} aula(s) · usado em ${item._count.courses} curso(s)`} busy={busy} onAdd={() => void command({ action: "linkModule", courseId: selectedCourse.id, moduleId: item.id }, "Módulo reutilizado no curso")} />} />}
    </>
  );
}

function CourseFormDialog({ course, subjects, busy, onClose, onSubmit }: { course?: Course; subjects: Subject[]; busy: boolean; onClose: () => void; onSubmit: (payload: Record<string, unknown>) => Promise<boolean> }) {
  const [form, setForm] = useState({
    title: course?.title ?? "",
    description: course?.description ?? "",
    subjectId: course?.subject?.id ?? "",
    category: course?.category ?? "ENEM",
    level: course?.level ?? "Base",
    navigationMode: course?.navigationMode ?? "SEQUENTIAL",
    coverImage: course?.coverImage ?? course?.thumbnail ?? "",
  });
  const [formError, setFormError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!form.coverImage) {
      setFormError("Adicione uma capa de 1280 × 720 px antes de salvar o curso.");
      return;
    }
    if (await onSubmit(form)) onClose();
  }

  return (
    <Dialog title={course ? "Editar curso" : "Criar novo curso"} description="Preencha os dados principais e use uma capa nítida no formato 16:9." onClose={onClose}>
      <form onSubmit={submit} className="grid gap-4">
        <Field label="Nome do curso"><input autoFocus required className="ek-input w-full" placeholder="Ex.: Matemática para o ENEM" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></Field>
        <Field label="Descrição"><textarea required rows={4} className="ek-input w-full" placeholder="O que o aluno aprenderá?" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></Field>
        <MediaUpload
          label="Capa obrigatória do curso"
          hint="Tamanho exato: 1280 × 720 px (16:9). Formatos JPG, PNG ou WEBP, até 8 MB."
          kind="course-cover"
          accept="image/jpeg,image/png,image/webp"
          value={form.coverImage}
          onUploaded={(url) => { setFormError(""); setForm({ ...form, coverImage: url }); }}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Matéria"><select className="ek-input w-full" value={form.subjectId} onChange={(event) => setForm({ ...form, subjectId: event.target.value })}><option value="">Geral</option>{subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</select></Field>
          <Field label="Nível"><select className="ek-input w-full" value={form.level} onChange={(event) => setForm({ ...form, level: event.target.value })}><option>Base</option><option>Intermediário</option><option>Avançado</option><option>Todos os níveis</option></select></Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Categoria"><input className="ek-input w-full" value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} /></Field>
          <Field label="Navegação"><select className="ek-input w-full" value={form.navigationMode} onChange={(event) => setForm({ ...form, navigationMode: event.target.value })}><option value="SEQUENTIAL">Sequencial</option><option value="FREE_NAVIGATION">Livre</option></select></Field>
        </div>
        {formError && <p className="rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-700">{formError}</p>}
        <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end"><button type="button" onClick={onClose} className="ek-button ek-button-ghost">Cancelar</button><button disabled={busy} className="ek-button ek-button-primary min-w-44">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{course ? "Salvar curso" : "Criar curso"}</button></div>
      </form>
    </Dialog>
  );
}

function ModuleFormDialog({ module: moduleItem, busy, onClose, onSubmit }: { module?: ModuleItem; busy: boolean; onClose: () => void; onSubmit: (payload: Record<string, unknown>) => Promise<boolean> }) {
  const [form, setForm] = useState({ title: moduleItem?.title ?? "", description: moduleItem?.description ?? "", color: moduleItem?.color ?? "#2563EB" });
  function submit(event: FormEvent) { event.preventDefault(); void onSubmit(form); }
  return <Dialog title={moduleItem ? "Editar módulo" : "Criar módulo"} description={moduleItem && moduleItem._count.courses > 1 ? `Este módulo é reutilizado em ${moduleItem._count.courses} cursos. A alteração aparecerá em todos eles.` : "Use um nome que ajude o aluno a entender a etapa do curso."} onClose={onClose}><form onSubmit={submit} className="grid gap-4"><Field label="Nome do módulo"><input autoFocus required className="ek-input w-full" placeholder="Ex.: Fundamentos e conceitos" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></Field><Field label="Descrição"><textarea rows={3} className="ek-input w-full" placeholder="Resumo opcional desta unidade" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></Field><Field label="Cor de identificação"><div className="flex items-center gap-3"><input type="color" className="h-11 w-16 cursor-pointer rounded-xl border border-slate-200 bg-white p-1" value={form.color} onChange={(event) => setForm({ ...form, color: event.target.value })} /><span className="text-sm font-semibold text-slate-500">Ajuda a reconhecer o módulo na organização.</span></div></Field><div className="flex justify-end gap-2 pt-2"><button type="button" onClick={onClose} className="ek-button ek-button-ghost">Cancelar</button><button disabled={busy} className="ek-button ek-button-primary">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : moduleItem ? <Check className="h-4 w-4" /> : <FolderPlus className="h-4 w-4" />}{moduleItem ? "Salvar alterações" : "Criar módulo"}</button></div></form></Dialog>;
}

function LessonFormDialog({ lesson, subjects, topics, canPublish, busy, onClose, onSubmit }: { lesson?: Lesson; subjects: Subject[]; topics: Topic[]; canPublish: boolean; busy: boolean; onClose: () => void; onSubmit: (payload: Record<string, unknown>) => Promise<boolean> }) {
  const [form, setForm] = useState({
    title: lesson?.title ?? "",
    description: lesson?.description ?? "",
    type: lesson?.type ?? "VIDEO",
    videoUrl: lesson?.videoUrl ?? "",
    thumbnailUrl: lesson?.thumbnailUrl ?? "",
    resources: lessonMaterials(lesson?.resources),
    content: lesson?.content ?? "",
    durationMinutes: lesson ? Math.ceil(lesson.durationSeconds / 60) : 10,
    subjectId: lesson?.subject?.id ?? "",
    topicId: lesson?.topic?.id ?? "",
    isFreePreview: lesson?.isFreePreview ?? false,
    status: lesson?.status ?? (canPublish ? "PUBLISHED" : "DRAFT"),
  });
  const [formError, setFormError] = useState("");
  const filteredTopics = topics.filter((topic) => !form.subjectId || topic.subjectId === form.subjectId);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (form.type === "VIDEO" && !form.thumbnailUrl) {
      setFormError("Adicione uma capa de 1280 × 720 px para a videoaula.");
      return;
    }
    if (await onSubmit(form)) onClose();
  }

  return (
    <Dialog wide title={lesson ? "Editar aula" : "Criar aula"} description={lesson && lesson._count.modules > 1 ? `Esta aula é reutilizada em ${lesson._count.modules} módulos. A alteração aparecerá em todos eles.` : "A aula será salva na biblioteca e vinculada a este módulo."} onClose={onClose}>
      <form onSubmit={submit} className="grid gap-4">
        <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
          <Field label="Título da aula"><input autoFocus required className="ek-input w-full" placeholder="Ex.: Introdução às funções" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></Field>
          <Field label="Formato"><select className="ek-input w-full" value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })}>{Object.entries(lessonTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>
        </div>
        <Field label="Descrição"><textarea rows={3} className="ek-input w-full" placeholder="Explique o objetivo desta aula" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></Field>

        {form.type === "VIDEO" && (
          <div className="grid gap-4 rounded-[18px] border border-blue-100 bg-blue-50/50 p-4">
            <MediaUpload
              label="Capa obrigatória da videoaula"
              hint="Tamanho exato: 1280 × 720 px (16:9). Ela aparece antes da reprodução."
              kind="lesson-cover"
              accept="image/jpeg,image/png,image/webp"
              value={form.thumbnailUrl}
              onUploaded={(url) => { setFormError(""); setForm({ ...form, thumbnailUrl: url }); }}
            />
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Link do vídeo" hint="YouTube, Vimeo, Loom, Google Drive ou outra URL compatível."><input type="text" inputMode="url" className="ek-input w-full" placeholder="https://youtube.com/watch?v=..." value={form.videoUrl} onChange={(event) => setForm({ ...form, videoUrl: event.target.value })} /></Field>
              <MediaUpload
                label="Ou envie do computador"
                hint="MP4, WebM, OGG, MOV ou M4V, até 500 MB. O upload substitui o link acima."
                kind="lesson-video"
                accept="video/mp4,video/webm,video/ogg,video/quicktime,video/x-m4v,.m4v"
                value={form.videoUrl.startsWith("/api/course-media/") ? form.videoUrl : ""}
                onUploaded={(url) => setForm({ ...form, videoUrl: url })}
              />
            </div>
          </div>
        )}

        <Field label="Conteúdo complementar" hint="Resumo, instruções ou texto que acompanha a aula."><textarea rows={5} className="ek-input w-full" value={form.content} onChange={(event) => setForm({ ...form, content: event.target.value })} /></Field>

        <div className="rounded-[18px] border border-slate-200 p-4">
          <MediaUpload
            label="Materiais em PDF"
            hint="Envie apostilas, resumos ou listas de exercícios. Limite de 35 MB por PDF."
            kind="lesson-pdf"
            accept="application/pdf,.pdf"
            onUploaded={(url, name) => setForm({ ...form, resources: [...form.resources, { title: name.replace(/\.pdf$/i, ""), type: "PDF" as const, href: url }] })}
          />
          {form.resources.length > 0 && (
            <div className="mt-3 space-y-2">
              {form.resources.map((resource, index) => (
                <div key={`${resource.href}-${index}`} className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3">
                  <FileText className="h-5 w-5 shrink-0 text-red-600" />
                  <input aria-label="Nome do material" className="min-w-0 flex-1 bg-transparent text-sm font-bold text-slate-800 outline-none" value={resource.title} onChange={(event) => setForm({ ...form, resources: form.resources.map((item, itemIndex) => itemIndex === index ? { ...item, title: event.target.value } : item) })} />
                  <button type="button" onClick={() => setForm({ ...form, resources: form.resources.filter((_, itemIndex) => itemIndex !== index) })} className="rounded-xl p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600" aria-label={`Remover ${resource.title}`}><Trash2 className="h-4 w-4" /></button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-4">
          <Field label="Matéria"><select className="ek-input w-full" value={form.subjectId} onChange={(event) => setForm({ ...form, subjectId: event.target.value, topicId: "" })}><option value="">Geral</option>{subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</select></Field>
          <Field label="Assunto"><select className="ek-input w-full" value={form.topicId} onChange={(event) => setForm({ ...form, topicId: event.target.value })}><option value="">Sem assunto específico</option>{filteredTopics.map((topic) => <option key={topic.id} value={topic.id}>{topic.name}</option>)}</select></Field>
          <Field label="Duração (min)"><input type="number" min={0} max={1440} className="ek-input w-full" value={form.durationMinutes} onChange={(event) => setForm({ ...form, durationMinutes: Number(event.target.value) })} /></Field>
          <Field label="Situação"><select className="ek-input w-full" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}><option value="DRAFT">Rascunho</option><option value="REVIEW">Em revisão</option>{canPublish && <option value="PUBLISHED">Publicada</option>}</select></Field>
        </div>
        <label className="flex items-center gap-3 rounded-2xl bg-blue-50 p-4 text-sm font-bold text-blue-900"><input type="checkbox" checked={form.isFreePreview} onChange={(event) => setForm({ ...form, isFreePreview: event.target.checked })} />Liberar esta aula como prévia gratuita</label>
        {formError && <p className="rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-700">{formError}</p>}
        <div className="sticky -bottom-5 z-10 -mx-5 flex flex-col-reverse gap-2 border-t border-slate-100 bg-white/95 px-5 py-4 shadow-sm backdrop-blur sm:flex-row sm:justify-end md:-bottom-7 md:-mx-7 md:px-7"><button type="button" onClick={onClose} className="ek-button ek-button-ghost">Cancelar</button><button disabled={busy} className="ek-button ek-button-primary min-w-48">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Salvar aula</button></div>
      </form>
    </Dialog>
  );
}

function MediaUpload({ label, hint, kind, accept, value, onUploaded }: {
  label: string;
  hint: string;
  kind: "course-cover" | "lesson-cover" | "lesson-video" | "lesson-pdf";
  accept: string;
  value?: string;
  onUploaded: (url: string, name: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function upload(file: File) {
    setUploading(true);
    setError("");
    const body = new FormData();
    body.set("kind", kind);
    body.set("file", file);
    try {
      const prepared = await fetch("/api/admin/course-media/direct", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, name: file.name, size: file.size, contentType: file.type || (kind === "lesson-pdf" ? "application/pdf" : "") }) });
      const direct = await prepared.json() as { signedUrl?: string; receipt?: string; localUpload?: boolean; error?: string; contentType?: string };
      if (prepared.ok && direct.signedUrl && direct.receipt) {
        const sent = await fetch(direct.signedUrl, { method: "PUT", headers: { "Content-Type": direct.contentType || file.type, "x-upsert": "false" }, body: file });
        if (!sent.ok) throw new Error("O armazenamento recusou o arquivo. Confira o tamanho permitido pelo seu plano e tente novamente.");
        const completed = await fetch("/api/admin/course-media/direct", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "complete", receipt: direct.receipt }) });
        const result = await completed.json() as { url?: string; name?: string; error?: string };
        if (!completed.ok || !result.url) throw new Error(result.error || "Não foi possível concluir o envio.");
        onUploaded(result.url, result.name || file.name);
        return;
      }
      if (!direct.localUpload) throw new Error(direct.error || "Não foi possível preparar o envio.");
      const response = await fetch("/api/admin/course-media", { method: "POST", body });
      const payload = (await response.json()) as { url?: string; name?: string; error?: string };
      if (!response.ok || !payload.url) throw new Error(payload.error || "Não foi possível enviar o arquivo.");
      onUploaded(payload.url, payload.name || file.name);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Não foi possível enviar o arquivo.");
    } finally {
      setUploading(false);
    }
  }

  const cover = kind.endsWith("cover");
  return (
    <div>
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-600">{label}</span>
      {cover && value && <div className="mb-3 aspect-video overflow-hidden rounded-2xl border border-slate-200 bg-cover bg-center shadow-sm" style={{ backgroundImage: `url(${value})` }} role="img" aria-label="Prévia da capa" />}
      <label className="flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-blue-200 bg-white px-4 text-sm font-semibold text-blue-700 transition hover:border-blue-400 hover:bg-blue-50">
        {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : kind === "lesson-video" ? <Video className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
        {uploading ? "Enviando..." : value ? "Trocar arquivo" : "Selecionar arquivo"}
        <input type="file" className="sr-only" accept={accept} disabled={uploading} onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(file); event.currentTarget.value = ""; }} />
      </label>
      <span className="mt-1.5 block text-xs font-medium text-slate-400">{hint}</span>
      {value && !cover && <p className="mt-2 truncate rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">Arquivo enviado e pronto para uso.</p>}
      {error && <p className="mt-2 rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-700">{error}</p>}
    </div>
  );
}

function LibraryDialog<T>({ title, description, search, onSearch, onClose, items, renderItem }: { title: string; description: string; search: string; onSearch: (value: string) => void; onClose: () => void; items: T[]; renderItem: (item: T) => ReactNode }) {
  return <Dialog wide title={title} description={description} onClose={() => { onSearch(""); onClose(); }}><div className="relative mb-4"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input autoFocus className="ek-input w-full !pl-10" placeholder="Buscar por nome ou matéria..." value={search} onChange={(event) => onSearch(event.target.value)} /></div><div className="max-h-[55vh] space-y-2 overflow-y-auto pr-1 thin-scrollbar">{items.map(renderItem)}{items.length === 0 && <EmptyState icon={<Search className="h-6 w-6" />} title="Nenhum conteúdo encontrado" text="Tente outro termo ou crie um conteúdo novo." />}</div></Dialog>;
}

function LibraryRow({ icon, title, meta, busy, onAdd }: { icon: ReactNode; title: string; meta: string; busy: boolean; onAdd: () => void }) {
  return <div className="flex flex-col gap-3 rounded-2xl border border-slate-100 p-4 sm:flex-row sm:items-center"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">{icon}</span><div className="min-w-0 flex-1"><p className="font-semibold text-slate-900">{title}</p><p className="mt-1 text-xs font-semibold text-slate-500">{meta}</p></div><button type="button" disabled={busy} onClick={onAdd} className="ek-button ek-button-primary shrink-0"><CopyPlus className="h-4 w-4" />Adicionar</button></div>;
}
