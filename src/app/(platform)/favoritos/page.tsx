import { BookOpen, Heart, PlayCircle } from "lucide-react";
import { FastLink } from "@/components/fast-link";
import { getCurrentUser } from "@/lib/auth";
import { getFavoriteLessons, getLearningUserId } from "@/lib/courses/learning";
import { formatCourseDuration } from "@/components/courses/format";

export default async function FavoritosPage() {
  const user = await getCurrentUser();
  const userId = await getLearningUserId(user);
  const favorites = userId ? await getFavoriteLessons(userId) : [];

  return (
    <div className="space-y-6">
      <section className="rounded-[30px] border border-pink-100 bg-gradient-to-br from-white via-pink-50 to-blue-50 p-6 shadow-sm">
        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-pink-600">Favoritos</p>
        <h1 className="mt-2 font-display text-3xl font-black text-slate-950">Aulas e materiais salvos</h1>
        <p className="mt-2 text-sm font-semibold text-slate-600">Retome rapidamente as videoaulas, questoes e materiais que voce marcou.</p>
      </section>

      {favorites.length === 0 ? (
        <section className="rounded-[28px] border border-slate-100 bg-white p-8 text-center shadow-sm">
          <Heart className="mx-auto h-10 w-10 text-pink-500" />
          <h2 className="mt-4 font-display text-2xl font-black text-slate-950">Nada salvo ainda</h2>
          <p className="mt-2 text-sm font-semibold text-slate-500">Abra uma aula e toque em salvar para montar sua lista.</p>
          <FastLink href="/cursos" className="mt-5 inline-flex h-11 items-center gap-2 rounded-full bg-blue-600 px-4 text-sm font-black text-white">
            <BookOpen className="h-4 w-4" />
            Ver cursos
          </FastLink>
        </section>
      ) : (
        <section className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {favorites.map((item) => (
            <FastLink key={item.id} href={item.href} className="rounded-[26px] border border-slate-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-pink-50 text-pink-600">
                  <Heart className="h-5 w-5 fill-current" />
                </div>
                <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-black uppercase text-blue-700">{formatCourseDuration(item.durationSeconds)}</span>
              </div>
              <p className="mt-4 text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">{item.courseTitle}</p>
              <h2 className="mt-1 font-display text-xl font-black text-slate-950">{item.title}</h2>
              <p className="mt-2 line-clamp-2 text-sm font-semibold text-slate-600">{item.description}</p>
              <div className="mt-4 flex items-center gap-2 text-sm font-black text-blue-700">
                <PlayCircle className="h-4 w-4" />
                Continuar
              </div>
            </FastLink>
          ))}
        </section>
      )}
    </div>
  );
}
